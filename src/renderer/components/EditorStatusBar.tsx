export interface EditorStatusBarProps {
  mode: string
  line: number
  col: number
  vimPending?: string
}

/** Bottom status strip under the source editor. */
export function EditorStatusBar({
  mode,
  line,
  col,
  vimPending
}: EditorStatusBarProps): React.ReactElement {
  return (
    <footer className="editor-statusbar" aria-label="Editor status">
      <span className="editor-status-mode">{mode}</span>
      {vimPending ? (
        <span className="editor-status-pending" title="Pending keys">
          {vimPending}
        </span>
      ) : null}
      <span className="editor-status-spacer" />
      <span className="editor-status-pos">
        Ln {line}, Col {col}
      </span>
    </footer>
  )
}
