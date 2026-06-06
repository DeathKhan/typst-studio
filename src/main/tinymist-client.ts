import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'
import {
  createMessageConnection,
  StreamMessageReader,
  StreamMessageWriter
} from 'vscode-jsonrpc/node.js'
import {
  InitializeRequest,
  InitializedNotification,
  DidOpenTextDocumentNotification,
  DidChangeTextDocumentNotification,
  DidSaveTextDocumentNotification,
  PublishDiagnosticsNotification,
  ShowDocumentRequest,
  DiagnosticSeverity,
  type Diagnostic,
  type PublishDiagnosticsParams,
  type TextDocumentItem
} from 'vscode-languageserver-protocol'
import type {
  DiagnosticItem,
  JumpInfo,
  OutlineEntry,
  PreviewResult,
  TinymistStartPreviewResponse
} from '../shared/types'
import { PREVIEW_TASK_ID, previewUrlFromResponse } from './preview-url'
import { resolveTinymistBinary } from './tinymist-path'

export class TinymistClient {
  private proc: ChildProcessWithoutNullStreams | null = null
  private connection: ReturnType<typeof createMessageConnection> | null = null
  private ready: Promise<void> | null = null
  private previewTaskId: string | null = null
  private previewStartInFlight: Promise<PreviewResult> | null = null
  private previewCache: PreviewResult | null = null
  private previewCacheKey: string | null = null
  private onDiagnostics:
    | ((uri: string, items: DiagnosticItem[]) => void)
    | null = null
  private onScrollSource: ((jump: JumpInfo) => void) | null = null
  private onOutline: ((entries: OutlineEntry[]) => void) | null = null

  setHandlers(handlers: {
    onDiagnostics?: (uri: string, items: DiagnosticItem[]) => void
    onScrollSource?: (jump: JumpInfo) => void
    onOutline?: (entries: OutlineEntry[]) => void
  }): void {
    this.onDiagnostics = handlers.onDiagnostics ?? null
    this.onScrollSource = handlers.onScrollSource ?? null
    this.onOutline = handlers.onOutline ?? null
  }

  async start(): Promise<void> {
    if (this.ready) {
      return this.ready
    }

    this.ready = this.boot()
    return this.ready
  }

  private async boot(): Promise<void> {
    const binary = resolveTinymistBinary()
    this.proc = spawn(binary, ['lsp'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    })

    this.proc.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim()
      if (text) console.error('[tinymist]', text)
    })

    this.proc.on('exit', (code) => {
      console.error('[tinymist] LSP exited', code)
      this.connection = null
      this.proc = null
      this.ready = null
    })

    const reader = new StreamMessageReader(this.proc.stdout)
    const writer = new StreamMessageWriter(this.proc.stdin)
    this.connection = createMessageConnection(reader, writer)

    this.connection.onNotification(
      PublishDiagnosticsNotification.type,
      (params: PublishDiagnosticsParams) => {
        const items = (params.diagnostics ?? []).map(diagnosticToItem)
        this.onDiagnostics?.(params.uri, items)
      }
    )

    this.connection.onNotification('tinymist/preview/scrollSource', (jump: JumpInfo) => {
      this.onScrollSource?.(normalizeJumpInfo(jump))
    })

    this.connection.onRequest(ShowDocumentRequest.type, (params) => {
      let filepath: string
      try {
        filepath = fileURLToPath(params.uri)
      } catch {
        filepath = params.uri
      }
      const start = params.selection?.start
      const end = params.selection?.end ?? start
      if (start) {
        this.onScrollSource?.({
          filepath,
          start: [start.line, start.character],
          end: end ? [end.line, end.character] : null
        })
      }
      return { success: true }
    })

    this.connection.onNotification('tinymist/documentOutline', (data: unknown) => {
      const entries = parseOutlineNotification(data)
      if (entries.length > 0) {
        this.onOutline?.(entries)
      }
    })

    this.connection.onError((err) => {
      console.error('[tinymist] LSP connection error', err)
    })

    this.connection.listen()

    await this.connection.sendRequest(InitializeRequest.type, {
      processId: process.pid,
      clientInfo: { name: 'typst-studio', version: '0.1.0' },
      rootUri: null,
      initializationOptions: {
        customizedShowDocument: true
      },
      capabilities: {
        window: {
          showDocument: { support: true }
        },
        textDocument: {
          synchronization: { dynamicRegistration: false }
        }
      }
    })

    await this.connection.sendNotification(InitializedNotification.type, {})

    await this.connection.sendNotification('workspace/didChangeConfiguration', {
      settings: { customizedShowDocument: true }
    })
  }

  async stop(): Promise<void> {
    await this.killPreviewTask().catch(() => {})
    await sleep(400)
    if (this.connection) {
      this.connection.dispose()
      this.connection = null
    }
    if (this.proc) {
      this.proc.kill()
      this.proc = null
    }
    this.ready = null
  }

  private conn() {
    if (!this.connection) {
      throw new Error('Tinymist LSP not connected')
    }
    return this.connection
  }

  async openDocument(filePath: string, content: string): Promise<void> {
    await this.start()
    const uri = pathToUri(filePath)
    const doc: TextDocumentItem = {
      uri,
      languageId: 'typst',
      version: 1,
      text: content
    }
    await this.conn().sendNotification(DidOpenTextDocumentNotification.type, {
      textDocument: doc
    })
  }

  async changeDocument(filePath: string, content: string, version: number): Promise<void> {
    await this.start()
    const uri = pathToUri(filePath)
    await this.conn().sendNotification(DidChangeTextDocumentNotification.type, {
      textDocument: { uri, version },
      contentChanges: [{ text: content }]
    })
  }

  async saveDocument(filePath: string): Promise<void> {
    await this.start()
    await this.conn().sendNotification(DidSaveTextDocumentNotification.type, {
      textDocument: { uri: pathToUri(filePath) }
    })
  }

  private async ensurePreviewClientConfig(): Promise<void> {
    await this.conn().sendNotification('workspace/didChangeConfiguration', {
      settings: { customizedShowDocument: true }
    })
  }

  async startPreview(
    filePath: string,
    partial: boolean,
    invert: string,
    force = false
  ): Promise<PreviewResult> {
    const cacheKey = `${path.resolve(filePath)}|${partial}|${invert}`
    if (
      !force &&
      this.previewCache &&
      this.previewCacheKey === cacheKey &&
      this.previewTaskId
    ) {
      return this.previewCache
    }
    if (this.previewStartInFlight) {
      return this.previewStartInFlight
    }
    this.previewStartInFlight = this.runStartPreview(filePath, partial, invert, cacheKey, force)
    try {
      return await this.previewStartInFlight
    } finally {
      this.previewStartInFlight = null
    }
  }

  private async runStartPreview(
    filePath: string,
    partial: boolean,
    invert: string,
    cacheKey: string,
    force: boolean
  ): Promise<PreviewResult> {
    await this.start()
    await this.ensurePreviewClientConfig()
    const needsKill =
      force || Boolean(this.previewTaskId && this.previewCacheKey !== cacheKey)
    if (needsKill) {
      await this.killPreviewTask().catch(() => {})
      await sleep(500)
    }
    // Match Tinymist VS Code client args: dynamic data-plane host + absolute entry path.
    const args = [
      '--task-id',
      PREVIEW_TASK_ID,
      '--data-plane-host',
      '127.0.0.1:0',
      '--no-open',
      '--partial-rendering',
      partial ? 'true' : 'false'
    ]
    if (invert && invert !== 'never') {
      args.push('--invert-colors', invert)
    }
    args.push(path.resolve(filePath))
    const raw = await Promise.race([
      this.conn().sendRequest<TinymistStartPreviewResponse>('workspace/executeCommand', {
        command: 'tinymist.doStartPreview',
        arguments: [args]
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Preview start timed out')), 30_000)
      )
    ])
    const result = previewUrlFromResponse(raw, PREVIEW_TASK_ID)
    this.previewTaskId = result.taskId
    this.previewCache = result
    this.previewCacheKey = cacheKey
    return result
  }

  async scrollPreview(
    filePath: string,
    line: number,
    col: number,
    event: 'panelScrollTo' | 'changeCursorPosition' = 'panelScrollTo'
  ): Promise<void> {
    if (!this.previewTaskId) {
      throw new Error('tinymist preview task not running')
    }
    await this.start()
    try {
      const req = {
        event,
        filepath: path.resolve(filePath),
        line,
        character: col
      }

      await this.conn().sendRequest('workspace/executeCommand', {
        command: 'tinymist.scrollPreview',
        arguments: [this.previewTaskId, req]
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.toLowerCase().includes('channel closed')) {
        this.previewTaskId = null
        this.previewCache = null
        this.previewCacheKey = null
        throw new Error('tinymist preview channel closed')
      }
      throw error
    }
  }

  /** Stop the preview task so Tinymist can tear down actors before the webview disconnects. */
  async killPreviewTask(taskId: string = PREVIEW_TASK_ID): Promise<void> {
    try {
      await this.start()
      await this.conn().sendRequest('workspace/executeCommand', {
        command: 'tinymist.doKillPreview',
        arguments: [taskId]
      })
    } catch {
      /* LSP may already be stopping */
    }
    this.previewTaskId = null
    this.previewCache = null
    this.previewCacheKey = null
  }

  async killPreview(): Promise<void> {
    await this.killPreviewTask(this.previewTaskId ?? PREVIEW_TASK_ID)
  }

  isRunning(): boolean {
    return this.connection !== null
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function pathToUri(filePath: string): string {
  const normalized = path.resolve(filePath).replace(/\\/g, '/')
  if (process.platform === 'win32') {
    return `file:///${normalized}`
  }
  return `file://${normalized}`
}

function diagnosticToItem(d: Diagnostic): DiagnosticItem {
  const start = d.range.start
  const end = d.range.end
  return {
    message: d.message,
    severity: severityToString(d.severity),
    line: start.line + 1,
    col: start.character + 1,
    endLine: end.line + 1,
    endCol: end.character + 1
  }
}

function severityToString(
  s: DiagnosticSeverity | number | undefined
): DiagnosticItem['severity'] {
  switch (s) {
    case DiagnosticSeverity.Error:
      return 'error'
    case DiagnosticSeverity.Warning:
      return 'warning'
    case DiagnosticSeverity.Information:
      return 'info'
    case DiagnosticSeverity.Hint:
      return 'hint'
    default:
      return 'error'
  }
}

/** Tinymist may send paths as file URIs or workspace virtual paths. */
function normalizeJumpInfo(jump: JumpInfo): JumpInfo {
  let filepath = jump.filepath
  if (filepath.startsWith('file://')) {
    try {
      filepath = fileURLToPath(filepath)
    } catch {
      /* keep raw */
    }
  }
  return { ...jump, filepath }
}

function parseOutlineNotification(data: unknown): OutlineEntry[] {
  if (!data || typeof data !== 'object') return []
  const entries: OutlineEntry[] = []
  const walk = (node: unknown, depth: number): void => {
    if (!node || typeof node !== 'object') return
    const n = node as Record<string, unknown>
    const title =
      typeof n.title === 'string'
        ? n.title
        : typeof n.name === 'string'
          ? n.name
          : typeof n.label === 'string'
            ? n.label
            : null
    const range = n.range as { start?: { line?: number; character?: number } } | undefined
    const line =
      typeof n.line === 'number'
        ? n.line + 1
        : typeof range?.start?.line === 'number'
          ? range.start.line + 1
          : null
    const col =
      typeof range?.start?.character === 'number' ? range.start.character + 1 : undefined
    if (title && line) {
      entries.push({ title, level: depth, line, ...(col != null ? { col } : {}) })
    }
    const children = n.children ?? n.items
    if (Array.isArray(children)) {
      for (const c of children) {
        walk(c, depth + 1)
      }
    }
  }
  if (Array.isArray(data)) {
    for (const item of data) walk(item, 1)
  } else {
    walk(data, 1)
  }
  return entries
}
