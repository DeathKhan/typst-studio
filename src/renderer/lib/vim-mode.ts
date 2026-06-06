import { getCM, type vimState } from '@replit/codemirror-vim'
import type { EditorView } from '@codemirror/view'

export type EditorModeLabel =
  | 'Standard'
  | 'NORMAL'
  | 'INSERT'
  | 'REPLACE'
  | 'VISUAL'
  | 'VISUAL LINE'
  | 'VISUAL BLOCK'
  | 'COMMAND'

export function editorModeLabel(vimEnabled: boolean, view: EditorView | null): EditorModeLabel {
  if (!vimEnabled) return 'Standard'
  const cm = view ? getCM(view) : null
  if (!cm?.state.vim) return 'NORMAL'
  return vimStateToLabel(cm.state.vim, Boolean(cm.state.dialog))
}

export function vimStateToLabel(vim: vimState, commandOpen: boolean): EditorModeLabel {
  if (commandOpen || vim.exMode) return 'COMMAND'
  if (vim.insertMode) {
    if (vim.mode === 'replace') return 'REPLACE'
    return 'INSERT'
  }
  if (vim.visualMode) {
    if (vim.visualBlock || vim.mode?.includes('block')) return 'VISUAL BLOCK'
    if (vim.visualLine || vim.mode?.includes('line')) return 'VISUAL LINE'
    return 'VISUAL'
  }
  return 'NORMAL'
}
