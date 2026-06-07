import { useCallback, useEffect, useRef, useState } from 'react'
import type { Settings } from '../../shared/types'
import { buildPreviewWebviewCss, previewSurfaceJs } from '../lib/preview-surface'
import { PREVIEW_PAGE_INFO_JS, type PreviewPageInfo } from '../lib/preview-page-info'
import { PdfPreview } from './PdfPreview'
import { PreviewPageBadge } from './PreviewPageBadge'

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
  const [pageInfo, setPageInfo] = useState<PreviewPageInfo | null>(null)

  const pollPreviewPages = useCallback(async () => {
    const node = webviewRef.current
    if (!node || !webviewDomReadyRef.current) return
    try {
      const info = (await node.executeJavaScript(PREVIEW_PAGE_INFO_JS)) as PreviewPageInfo | null
      if (info && Number.isFinite(info.page) && Number.isFinite(info.total)) {
        setPageInfo(info)
      }
    } catch {
      /* webview not ready */
    }
  }, [])

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

    const css = buildPreviewWebviewCss(settings)

    try {
      if (insertedCssKeyRef.current) {
        await node.removeInsertedCSS(insertedCssKeyRef.current)
        insertedCssKeyRef.current = ''
      }
      insertedCssKeyRef.current = await node.insertCSS(css)
      await node.executeJavaScript(previewSurfaceJs(settings))
    } catch {
      /* insertCSS / executeJavaScript require dom-ready */
    }
  }, [settings])

  const onWebviewDomReady = useCallback(() => {
    webviewDomReadyRef.current = true
    void applyPreviewSurface()
  }, [applyPreviewSurface])

  const onWebviewLoad = useCallback(() => {
    void applyPreviewSurface()
    void pollPreviewPages()
    markPreviewReady()
  }, [applyPreviewSurface, pollPreviewPages, markPreviewReady])

  const webviewRefCallback = useCallback(
    (node: Electron.WebviewTag | null) => {
      const prev = webviewRef.current
      if (prev && prev !== node) {
        prev.removeEventListener('dom-ready', onWebviewDomReady)
        prev.removeEventListener('did-finish-load', onWebviewLoad)
        prev.removeEventListener('did-fail-load', onWebviewFail)
      }

      webviewRef.current = node
      if (!node) return

      node.addEventListener('dom-ready', onWebviewDomReady)
      node.addEventListener('did-finish-load', onWebviewLoad)
      node.addEventListener('did-fail-load', onWebviewFail)

      try {
        const wc = node.getWebContents()
        if (wc && !wc.isLoading()) {
          onWebviewLoad()
        }
      } catch {
        /* getWebContents may throw before attachment */
      }
    },
    [onWebviewDomReady, onWebviewLoad, onWebviewFail]
  )

  useEffect(() => {
    setFrameError(null)
    readyFiredRef.current = false
    webviewDomReadyRef.current = false
    insertedCssKeyRef.current = ''
    setPageInfo(null)
    if (readyTimerRef.current) {
      clearTimeout(readyTimerRef.current)
      readyTimerRef.current = null
    }
  }, [previewUrl])

  useEffect(() => {
    if (!settings.show_preview_page_count || settings.preview_mode !== 'tinymist' || !previewUrl) {
      return
    }
    const id = window.setInterval(() => {
      void pollPreviewPages()
    }, 300)
    return () => window.clearInterval(id)
  }, [settings.show_preview_page_count, settings.preview_mode, previewUrl, pollPreviewPages])

  useEffect(() => {
    if (!settings.show_preview_page_count) setPageInfo(null)
  }, [settings.show_preview_page_count])

  useEffect(() => {
    if (!previewUrl) return
    void applyPreviewSurface()
  }, [previewUrl, applyPreviewSurface])

  useEffect(() => {
    return () => {
      if (readyTimerRef.current) clearTimeout(readyTimerRef.current)
      const node = webviewRef.current
      if (node) {
        node.removeEventListener('dom-ready', onWebviewDomReady)
        node.removeEventListener('did-finish-load', onWebviewLoad)
        node.removeEventListener('did-fail-load', onWebviewFail)
      }
    }
  }, [onWebviewDomReady, onWebviewLoad, onWebviewFail])

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
            <div className="preview-viewport">
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
              {settings.show_preview_page_count && pageInfo && (
                <PreviewPageBadge page={pageInfo.page} total={pageInfo.total} />
              )}
            </div>
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
          <div className="preview-viewport">
            <PdfPreview
              pdfPath={pdfPath}
              zoom={settings.preview_zoom}
              onPageInfo={setPageInfo}
            />
            {settings.show_preview_page_count && pageInfo && (
              <PreviewPageBadge page={pageInfo.page} total={pageInfo.total} />
            )}
          </div>
        ) : (
          <div className="preview-placeholder">Compile PDF to preview</div>
        )}
      </div>
    </div>
  )
}
