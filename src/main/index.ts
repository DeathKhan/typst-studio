import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { existsSync } from 'fs'
import { TinymistClient } from './tinymist-client'
import { loadSettings, saveSettings } from './settings-store'
import { compileTypstToPdf } from './pdf-compile'
import { getProjectRoot, setProjectRoot, projectRootForFile } from './project-root'
import { listDirectory } from './fs-tree'
import { saveClipboardImage } from './image-paste'
import { effectiveTinymistInvert } from '../shared/preview-theme'
import type { Settings } from '../shared/types'

let mainWindow: BrowserWindow | null = null
const tinymist = new TinymistClient()

let currentFile: string | null = null
let docVersion = 1
let changeTimer: ReturnType<typeof setTimeout> | null = null

function welcomePath(): string {
  const dev = join(app.getAppPath(), 'examples', 'welcome.typ')
  if (existsSync(dev)) return dev
  const res = join(process.resourcesPath, 'examples', 'welcome.typ')
  if (existsSync(res)) return res
  return join(app.getPath('userData'), 'welcome.typ')
}

async function ensureWelcome(): Promise<string> {
  const p = welcomePath()
  if (!existsSync(p)) {
    await mkdir(dirname(p), { recursive: true })
    const bundled = join(app.getAppPath(), 'examples', 'welcome.typ')
    if (existsSync(bundled)) {
      await writeFile(p, await readFile(bundled, 'utf-8'))
    } else {
      await writeFile(p, '= Hello\n\nEdit Typst here.\n')
    }
  }
  return p
}

function send(channel: string, ...args: unknown[]): void {
  mainWindow?.webContents.send(channel, ...args)
}

async function loadFileAt(filePath: string): Promise<{ path: string; content: string }> {
  const text = await readFile(filePath, 'utf-8')
  currentFile = filePath
  docVersion = 1
  await tinymist.openDocument(filePath, text)
  send('document-opened', { path: filePath, content: text })
  return { path: filePath, content: text }
}

async function applyProjectRoot(root: string): Promise<string> {
  setProjectRoot(root)
  const settings = loadSettings()
  saveSettings({ ...settings, last_project_root: root })
  send('project-root-changed', root)
  if (currentFile) {
    const text = await readFile(currentFile, 'utf-8')
    await tinymist.restartWithDocument(currentFile, text)
  }
  return root
}

function appIconPath(): string | undefined {
  const candidates = [
    join(app.getAppPath(), 'build/icon.png'),
    join(process.resourcesPath, 'icon.png')
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return undefined
}

function createWindow(): void {
  const icon = appIconPath()
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Typst Studio',
    ...(icon ? { icon } : {}),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.webContents.on('console-message', (_e, _level, message) => {
    if (message.includes('Error') || message.includes('Renderer error')) {
      console.error('[renderer]', message)
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  // Use in-app menubar only; hide Electron's default File/Edit/View… application menu.
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null)
  }

  tinymist.setHandlers({
    onDiagnostics: (uri, items) => send('diagnostics', { uri, items }),
    onScrollSource: (jump) => send('scroll-source', jump),
    onOutline: (entries) => send('outline', entries)
  })

  const settings = loadSettings()
  if (settings.last_project_root && existsSync(settings.last_project_root)) {
    setProjectRoot(settings.last_project_root)
  }

  try {
    await tinymist.start()
  } catch (e) {
    console.error('tinymist start failed', e)
  }

  createWindow()

  const path = await ensureWelcome()
  currentFile = path
  const content = await readFile(path, 'utf-8')
  await tinymist.openDocument(path, content)
  if (getProjectRoot()) {
    send('project-root-changed', getProjectRoot())
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  await tinymist.stop()
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('get-settings', () => loadSettings())
ipcMain.handle('set-settings', (_e, settings: Settings) => {
  saveSettings(settings)
  return true
})

ipcMain.handle('get-initial-document', async () => {
  const path = currentFile ?? (await ensureWelcome())
  currentFile = path
  const content = await readFile(path, 'utf-8')
  return { path, content }
})

ipcMain.handle('document-changed', async (_e, content: string) => {
  if (!currentFile) return
  const settings = loadSettings()
  docVersion += 1
  const version = docVersion
  const file = currentFile

  if (changeTimer) clearTimeout(changeTimer)
  changeTimer = setTimeout(async () => {
    await tinymist.changeDocument(file, content, version)
    if (settings.preview_mode === 'tinymist') {
      // preview updates via LSP compile watcher
    } else if (settings.auto_compile) {
      const root = projectRootForFile(file)
      const result = await compileTypstToPdf(file, root)
      send('pdf-updated', result)
    }
  }, settings.debounce_ms)
})

ipcMain.handle('save-document', async (_e, content: string) => {
  if (!currentFile) return { ok: false, error: 'No file' }
  await writeFile(currentFile, content, 'utf-8')
  await tinymist.saveDocument(currentFile)
  await tinymist.changeDocument(currentFile, content, ++docVersion)
  return { ok: true, path: currentFile }
})

ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    filters: [{ name: 'Typst', extensions: ['typ'] }],
    properties: ['openFile']
  })
  if (result.canceled || !result.filePaths[0]) return null
  return loadFileAt(result.filePaths[0])
})

ipcMain.handle('save-file-as', async (_e, content: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    filters: [{ name: 'Typst', extensions: ['typ'] }]
  })
  if (result.canceled || !result.filePath) return null
  await writeFile(result.filePath, content, 'utf-8')
  return loadFileAt(result.filePath)
})

let startPreviewInFlight: Promise<{ ok: boolean; url?: string; taskId?: string; pdfPath?: string; error?: string }> | null =
  null

ipcMain.handle('start-preview', async (_e, force = false) => {
  if (startPreviewInFlight) {
    return startPreviewInFlight
  }
  const run = async (): Promise<{
    ok: boolean
    url?: string
    taskId?: string
    pdfPath?: string
    error?: string
  }> => {
    if (!currentFile) return { ok: false, error: 'No document' }
    const settings = loadSettings()
    if (settings.preview_mode === 'pdf') {
      const root = projectRootForFile(currentFile)
      return compileTypstToPdf(currentFile, root)
    }
    try {
      const res = await tinymist.startPreview(
        currentFile,
        settings.tinymist_partial_rendering,
        effectiveTinymistInvert(settings),
        Boolean(force)
      )
      return { ok: true, url: res.url, taskId: res.taskId }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  }
  startPreviewInFlight = run()
  try {
    return await startPreviewInFlight
  } finally {
    startPreviewInFlight = null
  }
})

ipcMain.handle('stop-preview', async () => {
  try {
    await tinymist.killPreviewTask()
    await new Promise((r) => setTimeout(r, 300))
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
})

ipcMain.handle(
  'scroll-preview',
  async (
    _e,
    line: number,
    col: number,
    event: 'panelScrollTo' | 'changeCursorPosition' = 'panelScrollTo'
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!currentFile) {
      return { ok: false, error: 'No document open' }
    }
    const line0 = Math.max(0, line - 1)
    const col0 = Math.max(0, col - 1)

    const attemptScroll = async (): Promise<void> => {
      await tinymist.scrollPreview(currentFile!, line0, col0, event)
    }

    try {
      await attemptScroll()
      return { ok: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const needsRestart =
        msg.toLowerCase().includes('channel closed') ||
        msg.toLowerCase().includes('preview task not running')

      if (!needsRestart) {
        console.warn(`scroll-preview failed (line ${line}, col ${col}):`, msg)
        return { ok: false, error: msg }
      }

      try {
        const settings = loadSettings()
        await tinymist.startPreview(
          currentFile,
          settings.tinymist_partial_rendering,
          effectiveTinymistInvert(settings),
          true
        )
        await attemptScroll()
        return { ok: true }
      } catch (retryErr) {
        const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr)
        console.warn(
          `scroll-preview retry after preview restart failed (line ${line}, col ${col}):`,
          retryMsg
        )
        return { ok: false, error: retryMsg }
      }
    }
  }
)

ipcMain.handle('compile-pdf', async () => {
  if (!currentFile) return { ok: false, error: 'No document' }
  const root = projectRootForFile(currentFile)
  return compileTypstToPdf(currentFile, root)
})

ipcMain.handle('open-external', (_e, url: string) => {
  shell.openExternal(url)
})

ipcMain.handle('read-pdf', async (_e, pdfPath: string) => {
  const buf = await readFile(pdfPath)
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
})

ipcMain.handle('export-pdf', async (_e, content: string) => {
  if (!currentFile) return { ok: false }
  const result = await dialog.showSaveDialog(mainWindow!, {
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
    defaultPath: currentFile.replace(/\.typ$/, '.pdf')
  })
  if (result.canceled || !result.filePath) return { ok: false }
  const tmp = join(dirname(currentFile), '.typst-studio-export.typ')
  await writeFile(tmp, content)
  const compile = await compileTypstToPdf(tmp, projectRootForFile(currentFile))
  if (!compile.ok || !compile.pdfPath) {
    return { ok: false, error: compile.error }
  }
  const pdf = await readFile(compile.pdfPath)
  await writeFile(result.filePath, pdf)
  return { ok: true, path: result.filePath }
})

ipcMain.handle(
  'complete',
  async (_e, line: number, col: number, content: string) => {
    if (!currentFile) return []
    docVersion += 1
    try {
      return await tinymist.complete(
        currentFile,
        content,
        docVersion,
        line - 1,
        col - 1
      )
    } catch (e) {
      console.warn('completion failed', e)
      return []
    }
  }
)

ipcMain.handle('save-clipboard-image', async (_e, png: ArrayBuffer) => {
  if (!currentFile) return { ok: false, error: 'No document open' }
  if (!png || png.byteLength === 0) return { ok: false, error: 'Empty image' }
  try {
    return await saveClipboardImage(currentFile, Buffer.from(png))
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
})

ipcMain.handle('get-project-root', () => getProjectRoot())

ipcMain.handle('list-directory', async (_e, dirPath: string) => {
  if (!dirPath || !existsSync(dirPath)) return []
  try {
    return await listDirectory(dirPath)
  } catch {
    return []
  }
})

ipcMain.handle('open-project-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  })
  if (result.canceled || !result.filePaths[0]) return null
  const root = await applyProjectRoot(result.filePaths[0])
  const mainTyp = join(root, 'main.typ')
  if (existsSync(mainTyp)) {
    const opened = await loadFileAt(mainTyp)
    return { root, opened }
  }
  return { root, opened: null }
})

ipcMain.handle('open-project-file', async (_e, filePath: string) => {
  if (!filePath || !existsSync(filePath)) return null
  return loadFileAt(filePath)
})
