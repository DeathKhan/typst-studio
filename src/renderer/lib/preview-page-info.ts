/** Read visible page / total from the Tinymist preview DOM (doc + canvas modes). */
export const PREVIEW_PAGE_INFO_JS = `(function () {
  const doc = document.querySelector('.typst-doc');
  if (!doc) return null;

  const renderMode = doc.getAttribute('data-render-mode');
  const pageEls =
    renderMode === 'canvas'
      ? Array.from(doc.querySelectorAll('.typst-page'))
      : Array.from(doc.children).filter((c) => c.tagName === 'g');

  const visible = pageEls.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 || r.height > 0;
  });

  const total = visible.length;
  if (total === 0) return { page: 1, total: 1 };
  if (total === 1) return { page: 1, total: 1 };

  const scrollEl =
    document.getElementById('typst-container-main') ||
    document.scrollingElement ||
    document.documentElement;
  const scrollRect = scrollEl.getBoundingClientRect();
  const midY = scrollRect.top + scrollRect.height / 2;

  let page = 1;
  let bestDist = Infinity;
  for (let i = 0; i < visible.length; i++) {
    const rect = visible[i].getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    const dist = Math.abs(centerY - midY);
    if (dist < bestDist) {
      bestDist = dist;
      page = i + 1;
    }
  }

  return { page, total };
})()`

export interface PreviewPageInfo {
  page: number
  total: number
}
