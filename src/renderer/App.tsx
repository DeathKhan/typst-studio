import { useCallback, useEffect, useRef, useState } from 'react'
import type { EditorView } from '@codemirror/view'
import { EditorPane } from './components/EditorPane'
import { PreviewPane } from './components/PreviewPane'
import { OutlinePanel } from './components/OutlinePanel'
import { ProjectPanel } from './components/ProjectPanel'
import { ProblemsPanel } from './components/ProblemsPanel'
import { SettingsDialog } from './components/SettingsDialog'
import { MenuBar } from './components/MenuBar'
import { ResizeHandle, clamp } from './components/ResizeHandle'
import { DEFAULT_SETTINGS, type Settings, type DiagnosticItem, type OutlineEntry } from './lib/settings'
import { normalizeUiScale } from '../shared/types'
import { themeStyleVars } from './lib/themes'
import { parseOutline, resolveOutlineJumpCol } from './lib/outline-fallback'
import { shouldAcceptJump } from './lib/jump-path'

export default function App(): React.ReactElement {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [content, setContent] = useState('')
  const [filePath, setFilePath] = useState<string | null>(null)
  const [status, setStatus] = useState('Ready')
  const [cursorLine, setCursorLine] = useState(1)
  const [cursorCol, setCursorCol] = useState(1)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pdfPath, setPdfPath] = useState<string | null>(null)
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([])
  const [outline, setOutline] = useState<OutlineEntry[]>([])
  const [outlineLine, setOutlineLine] = useState<number | null>(null)
  const [projectRoot, setProjectRoot] = useState<string | null>(null)
  const [jumpTo, setJumpTo] = useState<{ line: number; col: number; key: number } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [previewReady, setPreviewReady] = useState(false)
  const editorRef = useRef<EditorView | null>(null)
  const settingsReadyRef = useRef(false)
  const skipSettingsPreviewRefresh = useRef(true)
  const [docReady, setDocReady] = useState(false)
  const scrollPreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const filePathRef = useRef<string | null>(null)
  const workspaceRef = useRef<HTMLDivElement | null>(null)
  const sidebarShellRef = useRef<HTMLDivElement | null>(null)
  const mainSplitRef = useRef<HTMLElement | null>(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  filePathRef.current = filePath

  const persistSettings = useCallback((next: Settings) => {
    const normalized = { ...next, ui_scale: normalizeUiScale(next.ui_scale) }
    setSettings(normalized)
    settingsRef.current = normalized
    if (settingsReadyRef.current) {
      void window.typstStudio.setSettings(normalized)
    }
  }, [])

  const previewRefreshRef = useRef<Promise<void> | null>(null)

  const refreshPreview = useCallback(async (force = false) => {
    if (previewRefreshRef.current) {
      await previewRefreshRef.current
      return
    }
    const run = (async () => {
      const res = await window.typstStudio.startPreview(force)
      if (res.ok && res.url) {
        setPreviewUrl(res.url)
        setStatus('Preview ready')
      } else if (res.ok && res.pdfPath) {
        setPdfPath(res.pdfPath)
        setStatus('PDF ready')
      } else if (res.ok) {
        setStatus('Preview: Tinymist did not return a URL')
      } else if (res.error) {
        setStatus(`Preview: ${res.error}`)
      }
    })()
    previewRefreshRef.current = run
    try {
      await run
    } finally {
      previewRefreshRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const s = await window.typstStudio.getSettings()
      if (cancelled) return
      setSettings(s)
      const doc = await window.typstStudio.getInitialDocument()
      if (cancelled) return
      setContent(doc.content)
      setFilePath(doc.path)
      setOutline(parseOutline(doc.content))
      setProjectRoot(await window.typstStudio.getProjectRoot())
      await refreshPreview()
      if (cancelled) return
      settingsReadyRef.current = true
      setDocReady(true)
    })()

    const unsubs = [
      window.typstStudio.onDocumentOpened((d) => {
        const sameFile = filePathRef.current === d.path
        setContent(d.content)
        setFilePath(d.path)
        setOutline(parseOutline(d.content))
        if (!sameFile) void refreshPreview()
      }),
      window.typstStudio.onDiagnostics((_d) => {
        setDiagnostics(_d.items)
      }),
      window.typstStudio.onOutline((entries) => {
        if (entries.length > 0) setOutline(entries)
      }),
      window.typstStudio.onScrollSource((jump) => {
        if (!jump.start) return
        const cur = filePathRef.current
        if (!shouldAcceptJump(jump.filepath, cur)) return
        setJumpTo({
          line: jump.start[0] + 1,
          col: jump.start[1] + 1,
          key: Date.now()
        })
        setStatus(`Jump to line ${jump.start[0] + 1}`)
      }),
      window.typstStudio.onPdfUpdated((r) => {
        if (r.ok && r.pdfPath) setPdfPath(r.pdfPath)
      }),
      window.typstStudio.onProjectRootChanged((root) => {
        setProjectRoot(root)
      })
    ]
    return () => {
      cancelled = true
      unsubs.forEach((u) => u())
    }
  }, [refreshPreview])

  useEffect(() => {
    setOutline(parseOutline(content))
    void window.typstStudio.documentChanged(content)
  }, [content])

  useEffect(() => {
    if (!settingsReadyRef.current) return
    void (async () => {
      await window.typstStudio.setSettings(settings)
      if (settings.preview_mode === 'tinymist') {
        if (skipSettingsPreviewRefresh.current) {
          skipSettingsPreviewRefresh.current = false
        } else {
          // Theme/invert/rendering changes must restart preview with latest persisted settings.
          await refreshPreview(true)
        }
      } else {
        await window.typstStudio.stopPreview()
        setPreviewUrl(null)
        const r = await window.typstStudio.compilePdf()
        if (r.ok && r.pdfPath) setPdfPath(r.pdfPath)
      }
    })()
  }, [
    settings.preview_mode,
    settings.tinymist_partial_rendering,
    settings.tinymist_invert_colors,
    settings.preview_match_theme,
    settings.preview_invert_images,
    settings.theme
  ])

  const previewNavigationEnabled = settings.preview_mode === 'tinymist'

  useEffect(() => {
    setPreviewReady(false)
  }, [previewUrl])

  const handlePreviewReady = useCallback(() => {
    setPreviewReady(true)
  }, [])

  const scrollPreviewToCursor = useCallback(async (line: number, col: number) => {
    const res = await window.typstStudio.scrollPreview(line, col, 'panelScrollTo')
    if (!res.ok && res.error) {
      setStatus(`Preview scroll failed: ${res.error}`)
    }
  }, [])

  const jumpToLine = useCallback(
    (line: number, col?: number) => {
      const resolved = resolveOutlineJumpCol(content, line, col)
      setJumpTo({ line, col: resolved, key: Date.now() })
      if (previewNavigationEnabled) {
        void scrollPreviewToCursor(line, resolved)
      }
    },
    [content, previewNavigationEnabled, scrollPreviewToCursor]
  )

  useEffect(() => {
    if (!previewReady || !previewUrl || !previewNavigationEnabled) return
    void scrollPreviewToCursor(cursorLine, cursorCol)
  }, [previewReady, previewUrl, previewNavigationEnabled, scrollPreviewToCursor])

  const handleCursorPreviewScroll = useCallback(
    (line: number, col: number) => {
      if (!previewNavigationEnabled) return
      if (scrollPreviewTimerRef.current) clearTimeout(scrollPreviewTimerRef.current)
      scrollPreviewTimerRef.current = setTimeout(() => {
        void scrollPreviewToCursor(line, col)
      }, 500)
    },
    [previewNavigationEnabled, scrollPreviewToCursor]
  )

  const handleSave = async (): Promise<void> => {
    const r = await window.typstStudio.saveDocument(content)
    setStatus(r.ok ? `Saved ${r.path}` : r.error ?? 'Save failed')
  }

  const handleSaveAs = async (): Promise<void> => {
    const r = await window.typstStudio.saveFileAs(content)
    if (!r?.path) return
    setFilePath(r.path)
    setStatus(`Saved ${r.path}`)
    await refreshPreview()
  }

  const handleOpen = async (): Promise<void> => {
    const r = await window.typstStudio.openFile()
    if (r) {
      setContent(r.content)
      setFilePath(r.path)
      setOutline(parseOutline(r.content))
      await refreshPreview()
    }
  }

  const handleOpenFolder = async (): Promise<void> => {
    const r = await window.typstStudio.openProjectFolder()
    if (!r) return
    setProjectRoot(r.root)
    if (r.opened) {
      setContent(r.opened.content)
      setFilePath(r.opened.path)
      setOutline(parseOutline(r.opened.content))
      await refreshPreview()
    } else {
      setStatus(`Project: ${r.root}`)
    }
  }

  const handleOpenProjectFile = async (path: string): Promise<void> => {
    if (!path.endsWith('.typ')) {
      await window.typstStudio.openExternal(`file://${path}`)
      return
    }
    const r = await window.typstStudio.openProjectFile(path)
    if (r) {
      setContent(r.content)
      setFilePath(r.path)
      setOutline(parseOutline(r.content))
      await refreshPreview()
    }
  }

  const handleCursor = (line: number, col: number): void => {
    setCursorLine(line)
    setCursorCol(col)
  }

  const layoutTop = settings.split === 'editor_top'
  const layoutClass = layoutTop ? 'layout-top' : 'layout-side'
  const bothSidebarPanels = settings.show_explorer && settings.show_outline

  const resizeEditor = useCallback(
    (delta: number) => {
      const el = mainSplitRef.current
      if (!el) return
      const total = layoutTop ? el.clientHeight : el.clientWidth
      if (total <= 0) return
      setSettings((s) => ({
        ...s,
        layout_editor_ratio: clamp(s.layout_editor_ratio + delta / total, 0.2, 0.8)
      }))
    },
    [layoutTop]
  )

  const commitLayout = useCallback(() => {
    if (settingsReadyRef.current) {
      void window.typstStudio.setSettings(settingsRef.current)
    }
  }, [])

  return (
    <div
      className={`app ${layoutClass}`}
      style={{
        ...themeStyleVars(settings.theme),
        zoom: normalizeUiScale(settings.ui_scale)
      }}
    >
      <header className="app-chrome">
        <MenuBar
          settings={settings}
          documentTitle={filePath?.split('/').pop() ?? 'Untitled.typ'}
          onPatch={(partial) => persistSettings({ ...settings, ...partial })}
          onOpen={() => void handleOpen()}
          onOpenFolder={() => void handleOpenFolder()}
          onSave={() => void handleSave()}
          onSaveAs={() => void handleSaveAs()}
          onRefreshPreview={() => void refreshPreview(true)}
          onExportPdf={() => void window.typstStudio.exportPdf(content)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </header>

      <div className="workspace" ref={workspaceRef}>
        {(settings.show_explorer || settings.show_outline) && (
          <>
            <div
              className="sidebar-shell"
              ref={sidebarShellRef}
              style={{
                flex: `0 0 ${settings.layout_outline_width}px`,
                width: settings.layout_outline_width
              }}
            >
              {settings.show_explorer && (
                <div
                  className="sidebar-segment sidebar-project"
                  style={
                    bothSidebarPanels
                      ? { flex: `0 0 ${settings.layout_sidebar_project_ratio * 100}%` }
                      : { flex: 1 }
                  }
                >
                  <ProjectPanel
                    projectRoot={projectRoot}
                    activeFile={filePath}
                    onOpenFolder={() => void handleOpenFolder()}
                    onOpenFile={(path) => void handleOpenProjectFile(path)}
                  />
                </div>
              )}
              {bothSidebarPanels && (
                <ResizeHandle
                  axis="y"
                  onDrag={(delta) => {
                    const el = sidebarShellRef.current
                    if (!el) return
                    const total = el.clientHeight
                    if (total <= 0) return
                    setSettings((s) => ({
                      ...s,
                      layout_sidebar_project_ratio: clamp(
                        s.layout_sidebar_project_ratio + delta / total,
                        0.15,
                        0.85
                      )
                    }))
                  }}
                  onDragEnd={commitLayout}
                />
              )}
              {settings.show_outline && (
                <div className="sidebar-segment sidebar-outline">
                  <OutlinePanel
                    entries={outline}
                    selectedLine={outlineLine}
                    onSelect={(line, col) => {
                      setOutlineLine(line)
                      jumpToLine(line, col)
                    }}
                  />
                </div>
              )}
            </div>
            <ResizeHandle
              axis="x"
              onDrag={(delta) => {
                const maxW = workspaceRef.current
                  ? Math.max(160, Math.floor(workspaceRef.current.clientWidth * 0.55))
                  : 560
                setSettings((s) => ({
                  ...s,
                  layout_outline_width: clamp(s.layout_outline_width + delta, 120, maxW)
                }))
              }}
              onDragEnd={commitLayout}
            />
          </>
        )}

        <main className="main-split" ref={mainSplitRef}>
          {!settings.show_source && !settings.show_preview ? (
            <div className="workspace-empty">
              Enable <strong>Source</strong> or <strong>Preview</strong> in View menu
            </div>
          ) : (
            <>
              {settings.show_source && (
                <div
                  className="split-segment"
                  style={
                    settings.show_preview
                      ? { flex: `0 0 ${settings.layout_editor_ratio * 100}%` }
                      : { flex: 1 }
                  }
                >
                  {docReady ? (
                    <EditorPane
                      content={content}
                      settings={settings}
                      diagnostics={diagnostics}
                      jumpTo={jumpTo}
                      onChange={setContent}
                      onCursor={handleCursor}
                      onCursorPreviewScroll={
                        previewNavigationEnabled ? handleCursorPreviewScroll : undefined
                      }
                      onSave={() => void handleSave()}
                      viewRef={editorRef}
                    />
                  ) : (
                    <div className="editor-pane">
                      <div className="pane-header">Source</div>
                      <div className="editor-host editor-loading">Loading document…</div>
                    </div>
                  )}
                </div>
              )}
              {settings.show_source && settings.show_preview && (
                <ResizeHandle
                  axis={layoutTop ? 'y' : 'x'}
                  onDrag={resizeEditor}
                  onDragEnd={commitLayout}
                />
              )}
              {settings.show_preview && (
                <div
                  className={`split-segment${settings.show_source ? ' split-segment-grow' : ''}`}
                  style={settings.show_source ? undefined : { flex: 1 }}
                >
                  <PreviewPane
                    settings={settings}
                    previewUrl={previewUrl}
                    pdfPath={pdfPath}
                    onOpenBrowser={() =>
                      previewUrl && void window.typstStudio.openExternal(previewUrl)
                    }
                    onPreviewReady={handlePreviewReady}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {settings.show_problems && (
        <>
          <ResizeHandle
            axis="y"
            onDrag={(delta) => {
              setSettings((s) => ({
                ...s,
                layout_problems_height: clamp(s.layout_problems_height - delta, 72, 360)
              }))
            }}
            onDragEnd={commitLayout}
          />
          <div
            className="problems-panel"
            style={{ height: settings.layout_problems_height, flexShrink: 0 }}
          >
            <ProblemsPanel
              items={diagnostics}
              onSelect={(line, col) => jumpToLine(line, col)}
            />
          </div>
        </>
      )}

      <footer className="statusbar">
        Ln {cursorLine}, Col {cursorCol} — {status}
      </footer>

      <SettingsDialog
        settings={settings}
        open={settingsOpen}
        onChange={persistSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
