import { useCallback, useEffect, useRef, useState } from 'react'
import type { Settings } from '../../shared/types'
import { isThemeDark } from '../../shared/theme-ids'
import { editorBackgroundColor } from '../lib/themes'
import { PdfPreview } from './PdfPreview'

export interface PreviewPaneProps {
  settings: Settings
  previewUrl: string | null
  pdfPath: string | null
  onOpenBrowser: () => void
  onPreviewReady?: () => void
}

export function PreviewPane({
  settings,
  previewUrl,
  pdfPath,
  onOpenBrowser,
  onPreviewReady
}: PreviewPaneProps): React.ReactElement {
  const webviewRef = useRef<Electron.WebviewTag | null>(null)
  const webviewDomReadyRef = useRef(false)
  const insertedCssKeyRef = useRef('')
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readyFiredRef = useRef(false)
  const onPreviewReadyRef = useRef(onPreviewReady)
  onPreviewReadyRef.current = onPreviewReady
  const [frameError, setFrameError] = useState<string | null>(null)

  const markPreviewReady = useCallback(() => {
    if (readyFiredRef.current) return
    readyFiredRef.current = true
    if (readyTimerRef.current) clearTimeout(readyTimerRef.current)
    readyTimerRef.current = window.setTimeout(() => {
      onPreviewReadyRef.current?.()
    }, 250)
  }, [])

  const onWebviewFail = useCallback(() => {
    setFrameError('Preview failed to load')
  }, [])

  const applyPreviewSurface = useCallback(async () => {
    const node = webviewRef.current
    if (!node || !webviewDomReadyRef.current) return

    const bg = editorBackgroundColor(settings.theme)
    const scheme = isThemeDark(settings.theme) ? 'dark' : 'light'
    const css = `html, body { background-color: ${bg} !important; color-scheme: ${scheme}; }`

    try {
      if (insertedCssKeyRef.current) {
        await node.removeInsertedCSS(insertedCssKeyRef.current)
        insertedCssKeyRef.current = ''
      }
      insertedCssKeyRef.current = await node.insertCSS(css)
    } catch {
      /* insertCSS requires dom-ready */
    }
  }, [settings.theme])

  const onWebviewDomReady = useCallback(() => {
    webviewDomReadyRef.current = true
    void applyPreviewSurface()
  }, [applyPreviewSurface])

  const webviewRefCallback = useCallback(
    (node: Electron.WebviewTag | null) => {
      const prev = webviewRef.current
      if (prev && prev !== node) {
        prev.removeEventListener('dom-ready', onWebviewDomReady)
        prev.removeEventListener('did-finish-load', markPreviewReady)
        prev.removeEventListener('did-fail-load', onWebviewFail)
      }

      webviewRef.current = node
      if (!node) return

      node.addEventListener('dom-ready', onWebviewDomReady)
      node.addEventListener('did-finish-load', markPreviewReady)
      node.addEventListener('did-fail-load', onWebviewFail)

      try {
        const wc = node.getWebContents()
        if (wc && !wc.isLoading()) {
          markPreviewReady()
        }
      } catch {
        /* getWebContents may throw before attachment */
      }
    },
    [onWebviewDomReady, markPreviewReady, onWebviewFail]
  )

  useEffect(() => {
    setFrameError(null)
    readyFiredRef.current = false
    webviewDomReadyRef.current = false
    insertedCssKeyRef.current = ''
    if (readyTimerRef.current) {
      clearTimeout(readyTimerRef.current)
      readyTimerRef.current = null
    }
  }, [previewUrl])

  useEffect(() => {
    if (!previewUrl) return
    void applyPreviewSurface()
  }, [previewUrl, settings.theme, applyPreviewSurface])

  useEffect(() => {
    return () => {
      if (readyTimerRef.current) clearTimeout(readyTimerRef.current)
      const node = webviewRef.current
      if (node) {
        node.removeEventListener('dom-ready', onWebviewDomReady)
        node.removeEventListener('did-finish-load', markPreviewReady)
        node.removeEventListener('did-fail-load', onWebviewFail)
      }
    }
  }, [onWebviewDomReady, markPreviewReady, onWebviewFail])

  return (
    <div className="preview-pane">
      <div className="pane-header preview-header">
        <span>Preview</span>
        <span className="preview-mode-tag">
          {settings.preview_mode === 'tinymist' ? 'Tinymist HTML' : 'PDF'}
        </span>
        {previewUrl && (
          <button type="button" className="btn-sm" onClick={onOpenBrowser}>
            Open in browser
          </button>
        )}
      </div>
      <div className="preview-body">
        {settings.preview_mode === 'tinymist' ? (
          previewUrl ? (
            <>
              {frameError && (
                <div className="preview-placeholder preview-error">{frameError}</div>
              )}
              <webview
                key={previewUrl}
                ref={webviewRefCallback}
                src={previewUrl}
                className="preview-frame"
                webpreferences="javascript=yes, contextIsolation=yes, webSecurity=no"
                allowpopups="true"
                style={{ display: frameError ? 'none' : undefined }}
              />
            </>
          ) : (
            <div className="preview-placeholder">
              Starting Tinymist preview…
              <br />
              <span className="preview-hint">
                Check the status bar for errors, or click Refresh preview.
              </span>
            </div>
          )
        ) : pdfPath ? (
          <PdfPreview pdfPath={pdfPath} zoom={settings.preview_zoom} />
        ) : (
          <div className="preview-placeholder">Compile PDF to preview</div>
        )}
      </div>
    </div>
  )
}
