import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import type { PreviewPageInfo } from '../lib/preview-page-info'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export interface PdfPreviewProps {
  pdfPath: string | null
  zoom: number
  onPageInfo?: (info: PreviewPageInfo) => void
}

export function PdfPreview({ pdfPath, zoom, onPageInfo }: PdfPreviewProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pageCount, setPageCount] = useState(1)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pdfPath || !canvasRef.current) return
    let cancelled = false
    setError(null)

    ;(async () => {
      try {
        const data = await window.typstStudio.readPdf(pdfPath)
        const doc = await pdfjs.getDocument({ data }).promise
        if (cancelled) return
        setPageCount(doc.numPages)
        const p = Math.min(page, doc.numPages)
        const pdfPage = await doc.getPage(p)
        const viewport = pdfPage.getViewport({ scale: zoom })
        const canvas = canvasRef.current!
        const ctx = canvas.getContext('2d')!
        canvas.height = viewport.height
        canvas.width = viewport.width
        await pdfPage.render({ canvasContext: ctx, viewport, canvas }).promise
      } catch (e) {
        if (!cancelled) setError(String(e))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [pdfPath, page, zoom])

  useEffect(() => {
    onPageInfo?.({ page, total: pageCount })
  }, [page, pageCount, onPageInfo])

  return (
    <div className="pdf-preview">
      {error && <p className="error">{error}</p>}
      <canvas ref={canvasRef} />
      {pageCount > 1 && (
        <div className="pdf-nav">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ◀
          </button>
          <span>
            {page} / {pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            ▶
          </button>
        </div>
      )}
    </div>
  )
}
