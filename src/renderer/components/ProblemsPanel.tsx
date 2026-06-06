import type { DiagnosticItem } from '../../shared/types'

export interface ProblemsPanelProps {
  items: DiagnosticItem[]
  onSelect: (line: number, col: number) => void
}

export function ProblemsPanel({ items, onSelect }: ProblemsPanelProps): React.ReactElement {
  return (
    <div className="problems-panel">
      <div className="pane-header">Problems ({items.length})</div>
      <div className="problems-list">
        {items.length === 0 ? (
          <p className="muted">No problems</p>
        ) : (
          items.map((d, i) => (
            <button
              key={`${i}-${d.line}-${d.message}`}
              type="button"
              className={`problem-row ${d.severity}`}
              onClick={() => onSelect(d.line, d.col)}
            >
              <span className="problem-loc">
                Ln {d.line}, Col {d.col}
              </span>
              <span className="problem-msg">{d.message}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
