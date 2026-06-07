export interface PreviewPageBadgeProps {
  page: number
  total: number
}

export function PreviewPageBadge({ page, total }: PreviewPageBadgeProps): React.ReactElement | null {
  if (total <= 1) return null

  return (
    <div className="preview-page-badge" aria-live="polite" aria-label={`Page ${page} of ${total}`}>
      {page} / {total}
    </div>
  )
}
