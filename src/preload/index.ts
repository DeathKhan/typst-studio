import { contextBridge, ipcRenderer } from 'electron'
import type { DiagnosticItem, FsEntry, JumpInfo, OutlineEntry, Settings, StudioCompletionItem } from '../shared/types'

export interface TypstStudioApi {
  getSettings: () => Promise<Settings>
  setSettings: (s: Settings) => Promise<boolean>
  getInitialDocument: () => Promise<{ path: string; content: string }>
  documentChanged: (content: string) => Promise<void>
  saveDocument: (content: string) => Promise<{ ok: boolean; path?: string; error?: string }>
  openFile: () => Promise<{ path: string; content: string } | null>
  saveFileAs: (content: string) => Promise<{ path: string } | null>
  startPreview: (force?: boolean) => Promise<{
    ok: boolean
    url?: string
    pdfPath?: string
    error?: string
  }>
  stopPreview: () => Promise<{ ok: boolean; error?: string }>
  scrollPreview: (
    line: number,
    col: number,
    event?: 'panelScrollTo' | 'changeCursorPosition'
  ) => Promise<{ ok: boolean; error?: string }>
  compilePdf: () => Promise<{ ok: boolean; pdfPath?: string; error?: string }>
  readPdf: (pdfPath: string) => Promise<ArrayBuffer>
  exportPdf: (content: string) => Promise<{ ok: boolean; path?: string; error?: string }>
  complete: (line: number, col: number, content: string) => Promise<StudioCompletionItem[]>
  saveClipboardImage: (
    png: ArrayBuffer
  ) => Promise<{ ok: boolean; path?: string; error?: string }>
  getProjectRoot: () => Promise<string | null>
  listDirectory: (dirPath: string) => Promise<FsEntry[]>
  openProjectFolder: () => Promise<{
    root: string
    opened: { path: string; content: string } | null
  } | null>
  openProjectFile: (filePath: string) => Promise<{ path: string; content: string } | null>
  openExternal: (url: string) => Promise<void>
  onDocumentOpened: (cb: (data: { path: string; content: string }) => void) => () => void
  onDiagnostics: (cb: (data: { uri: string; items: DiagnosticItem[] }) => void) => () => void
  onScrollSource: (cb: (jump: JumpInfo) => void) => () => void
  onOutline: (cb: (entries: OutlineEntry[]) => void) => () => void
  onProjectRootChanged: (cb: (root: string | null) => void) => () => void
  onPdfUpdated: (
    cb: (data: { ok: boolean; pdfPath?: string; error?: string }) => void
  ) => () => void
}

const api: TypstStudioApi = {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (s) => ipcRenderer.invoke('set-settings', s),
  getInitialDocument: () => ipcRenderer.invoke('get-initial-document'),
  documentChanged: (content) => ipcRenderer.invoke('document-changed', content),
  saveDocument: (content) => ipcRenderer.invoke('save-document', content),
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFileAs: (content) => ipcRenderer.invoke('save-file-as', content),
  startPreview: (force) => ipcRenderer.invoke('start-preview', force),
  stopPreview: () => ipcRenderer.invoke('stop-preview'),
  scrollPreview: (line, col, event) => ipcRenderer.invoke('scroll-preview', line, col, event),
  compilePdf: () => ipcRenderer.invoke('compile-pdf'),
  readPdf: (pdfPath) => ipcRenderer.invoke('read-pdf', pdfPath),
  exportPdf: (content) => ipcRenderer.invoke('export-pdf', content),
  complete: (line, col, content) => ipcRenderer.invoke('complete', line, col, content),
  saveClipboardImage: (png) => ipcRenderer.invoke('save-clipboard-image', png),
  getProjectRoot: () => ipcRenderer.invoke('get-project-root'),
  listDirectory: (dirPath) => ipcRenderer.invoke('list-directory', dirPath),
  openProjectFolder: () => ipcRenderer.invoke('open-project-folder'),
  openProjectFile: (filePath) => ipcRenderer.invoke('open-project-file', filePath),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  onDocumentOpened: (cb) => {
    const handler = (_: unknown, data: { path: string; content: string }) => cb(data)
    ipcRenderer.on('document-opened', handler)
    return () => ipcRenderer.removeListener('document-opened', handler)
  },
  onDiagnostics: (cb) => {
    const handler = (_: unknown, data: { uri: string; items: DiagnosticItem[] }) => cb(data)
    ipcRenderer.on('diagnostics', handler)
    return () => ipcRenderer.removeListener('diagnostics', handler)
  },
  onScrollSource: (cb) => {
    const handler = (_: unknown, jump: JumpInfo) => cb(jump)
    ipcRenderer.on('scroll-source', handler)
    return () => ipcRenderer.removeListener('scroll-source', handler)
  },
  onOutline: (cb) => {
    const handler = (_: unknown, entries: OutlineEntry[]) => cb(entries)
    ipcRenderer.on('outline', handler)
    return () => ipcRenderer.removeListener('outline', handler)
  },
  onProjectRootChanged: (cb) => {
    const handler = (_: unknown, root: string | null) => cb(root)
    ipcRenderer.on('project-root-changed', handler)
    return () => ipcRenderer.removeListener('project-root-changed', handler)
  },
  onPdfUpdated: (cb) => {
    const handler = (_: unknown, data: { ok: boolean; pdfPath?: string; error?: string }) =>
      cb(data)
    ipcRenderer.on('pdf-updated', handler)
    return () => ipcRenderer.removeListener('pdf-updated', handler)
  }
}

contextBridge.exposeInMainWorld('typstStudio', api)

declare global {
  interface Window {
    typstStudio: TypstStudioApi
  }
}
