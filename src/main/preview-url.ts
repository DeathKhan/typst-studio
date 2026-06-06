import type { PreviewResult, TinymistStartPreviewResponse } from '../shared/types'

export const PREVIEW_TASK_ID = 'typst-studio'

export function previewUrlFromResponse(
  res: TinymistStartPreviewResponse | null | undefined,
  taskId: string = PREVIEW_TASK_ID
): PreviewResult {
  if (!res) {
    throw new Error('Tinymist returned no preview response')
  }

  const addr = res.staticServerAddr?.trim()
  if (addr) {
    const url = addr.startsWith('http://') || addr.startsWith('https://') ? addr : `http://${addr}/`
    return { url: url.endsWith('/') ? url : `${url}/`, taskId }
  }

  const port = res.staticServerPort ?? res.dataPlanePort
  if (typeof port === 'number' && port > 0) {
    return { url: `http://127.0.0.1:${port}/`, taskId }
  }

  throw new Error('Preview started but Tinymist did not return a server address')
}
