import type { OutlineEntry } from '../../shared/types'

export interface OutlinePanelProps {
  entries: OutlineEntry[]
  selectedLine: number | null
  onSelect: (line: number, col?: number) => void
}

export function OutlinePanel({
  entries,
  selectedLine,
  onSelect
}: OutlinePanelProps): React.ReactElement {
  return (
    <div className="outline-panel">
      <div className="pane-header">Outline</div>
      <div className="outline-list">
        {entries.length === 0 ? (
          <p className="muted">No headings yet. Use = Title or == Section.</p>
        ) : (
          entries.map((e) => (
            <button
              key={`${e.line}-${e.title}`}
              type="button"
              className={`outline-row level-${e.level}${selectedLine === e.line ? ' selected' : ''}`}
              style={{ paddingLeft: 8 + (e.level - 1) * 14 }}
              onClick={() => onSelect(e.line, e.col)}
            >
              {e.level > 1 ? '▸ ' : ''}
              {e.title}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
