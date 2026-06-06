import type { EditorView } from '@codemirror/view'
import { getCM } from '@replit/codemirror-vim'
import { editorModeLabel } from './vim-mode'

const CURSOR_CLASS = 'editor-status-pos'

/** Strip vim dialog inline layout so our status-bar CSS can theme it. */
function normalizeVimDialog(dialog: HTMLElement): void {
  dialog.classList.add('editor-vim-dialog')

  const inner = dialog.firstElementChild
  if (inner instanceof HTMLElement) {
    inner.classList.add('editor-vim-dialog-inner')
    inner.style.display = 'flex'
    inner.style.alignItems = 'center'
    inner.style.flex = '1 1 auto'
    inner.style.minWidth = '0'
    inner.style.gap = '0'
  }

  for (const span of dialog.querySelectorAll('span')) {
    if (span instanceof HTMLElement) {
      span.classList.add('editor-vim-dialog-label')
      if (span.querySelector('input')) {
        span.classList.add('editor-vim-dialog-field')
      } else {
        span.classList.add('editor-vim-dialog-helper')
      }
      span.style.fontFamily = 'inherit'
      span.style.display = 'inline-flex'
      span.style.alignItems = 'center'
      span.style.flex = '0 0 auto'
      span.style.whiteSpace = 'pre'
    }
  }

  const input = dialog.querySelector('input')
  if (input instanceof HTMLInputElement) {
    input.classList.add('editor-vim-dialog-input')
    input.style.flex = '1 1 auto'
    input.style.minWidth = '0'
    input.style.border = 'none'
    input.style.outline = 'none'
    input.style.background = 'transparent'
    input.style.boxShadow = 'none'
    input.style.font = 'inherit'
    input.style.color = 'inherit'
    input.style.padding = '1px 0'
    input.style.margin = '0'
  }
}

/** Hoist vim's status/command DOM into our footer and keep cursor position on the right. */
export function attachVimStatusBar(
  view: EditorView,
  host: HTMLElement,
  getCursor: () => { line: number; col: number }
): () => void {
  let cancelled = false
  let cm: ReturnType<typeof getCM> = null
  const bar = document.createElement('footer')
  bar.className = 'editor-statusbar editor-vim-statusbar editor-vim-fallback'
  host.replaceChildren(bar)

  const modeEl = document.createElement('span')
  modeEl.className = 'editor-status-mode'
  bar.append(modeEl)

  const pendingEl = document.createElement('span')
  pendingEl.className = 'editor-status-pending'
  bar.append(pendingEl)

  const cmdHost = document.createElement('span')
  cmdHost.className = 'editor-vim-command'
  bar.append(cmdHost)

  const spacer = document.createElement('span')
  spacer.className = 'editor-status-spacer'
  bar.append(spacer)

  const posEl = document.createElement('span')
  posEl.className = CURSOR_CLASS
  bar.append(posEl)

  const sync = (): void => {
    if (cancelled) return
    cm = getCM(view)

    modeEl.textContent = editorModeLabel(true, view)

    const dialog = cm?.state.dialog as HTMLElement | undefined
    const pending = cm?.state.vim?.status ?? ''
    const showPending = !dialog && pending.length > 0
    pendingEl.textContent = showPending ? pending : ''
    pendingEl.style.display = showPending ? '' : 'none'

    const currentDialog = cmdHost.firstElementChild as HTMLElement | null
    if (!dialog) {
      if (currentDialog) cmdHost.replaceChildren()
    } else if (currentDialog !== dialog) {
      cmdHost.replaceChildren(dialog)
      normalizeVimDialog(dialog)
    }

    const { line, col } = getCursor()
    posEl.textContent = `Ln ${line}, Col ${col}`
  }

  const onVimEvent = (): void => {
    sync()
  }

  const attachListeners = (): void => {
    if (cancelled) return
    cm = getCM(view)
    if (!cm) {
      requestAnimationFrame(attachListeners)
      return
    }
    cm.on('vim-mode-change', onVimEvent)
    cm.on('dialog', onVimEvent)
    cm.on('vim-command-done', onVimEvent)
    cm.on('inputEvent', onVimEvent)
    sync()
  }
  attachListeners()

  return () => {
    cancelled = true
    if (cm) {
      cm.off('vim-mode-change', onVimEvent)
      cm.off('dialog', onVimEvent)
      cm.off('vim-command-done', onVimEvent)
      cm.off('inputEvent', onVimEvent)
    }
    host.replaceChildren()
  }
}
