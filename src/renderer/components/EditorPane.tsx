import { useEffect, useRef, useState } from 'react'
import { EditorState, Compartment } from '@codemirror/state'
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  drawSelection,
  panels
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { search, searchKeymap } from '@codemirror/search'
import { linter, lintGutter, type Diagnostic as CmDiagnostic } from '@codemirror/lint'
import type { DiagnosticItem, Settings } from '../../shared/types'
import { ensureTypstWasm, typstEditorExtensions } from '../lib/typst-language'
import { indexToLineCol } from '../lib/line-index'
import { vimWithIntegratedStatus } from '../lib/editor-extensions'
import { attachVimStatusBar } from '../lib/vim-status'
import { tinymistAutocompletion } from '../lib/tinymist-completion'
import { imagePasteExtension } from '../lib/image-paste'
import { EditorStatusBar } from './EditorStatusBar'

export interface EditorPaneProps {
  content: string
  settings: Settings
  diagnostics: DiagnosticItem[]
  jumpTo: { line: number; col: number; key: number } | null
  onChange: (content: string) => void
  onCursor: (line: number, col: number) => void
  /** Move Tinymist preview to the editor cursor (clicks and navigation, not typing). */
  onCursorPreviewScroll?: (line: number, col: number) => void
  onSave: () => void
  viewRef: React.MutableRefObject<EditorView | null>
}

export function EditorPane({
  content,
  settings,
  diagnostics,
  jumpTo,
  onChange,
  onCursor,
  onCursorPreviewScroll,
  onSave,
  viewRef
}: EditorPaneProps): React.ReactElement {
  const hostRef = useRef<HTMLDivElement>(null)
  const vimStatusHostRef = useRef<HTMLDivElement>(null)
  const vimCompartment = useRef(new Compartment())
  const vimEnabledRef = useRef(settings.vim_mode)
  const wrapCompartment = useRef(new Compartment())
  const lineNumberCompartment = useRef(new Compartment())
  const langCompartment = useRef(new Compartment())
  const cursorRef = useRef({ line: 1, col: 1 })
  const onCursorPreviewScrollRef = useRef(onCursorPreviewScroll)
  onCursorPreviewScrollRef.current = onCursorPreviewScroll

  const [wasmReady, setWasmReady] = useState(false)
  const [wasmError, setWasmError] = useState<string | null>(null)
  const [cursorLine, setCursorLine] = useState(1)
  const [cursorCol, setCursorCol] = useState(1)

  useEffect(() => {
    cursorRef.current = { line: cursorLine, col: cursorCol }
  }, [cursorLine, cursorCol])

  useEffect(() => {
    let cancelled = false
    void ensureTypstWasm()
      .then(() => {
        if (!cancelled) {
          setWasmError(null)
          setWasmReady(true)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setWasmError(err instanceof Error ? err.message : String(err))
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!wasmReady || !hostRef.current || viewRef.current) return

    const lintSource = (view: EditorView): CmDiagnostic[] =>
      diagnostics.map((d) => ({
        from: lineColToPos(view.state.doc.toString(), d.line, d.col),
        to: lineColToPos(
          view.state.doc.toString(),
          d.endLine ?? d.line,
          d.endCol ?? d.col + 1
        ),
        severity: d.severity === 'warning' ? 'warning' : 'error',
        message: d.message
      }))

    const extensions = [
      panels(),
      history(),
      drawSelection(),
      highlightActiveLine(),
      search({ top: false }),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        {
          key: 'Mod-s',
          run: () => {
            onSave()
            return true
          }
        }
      ]),
      langCompartment.current.of(typstEditorExtensions(settings.theme)),
      lineNumberCompartment.current.of(
        settings.show_line_numbers ? lineNumbers() : []
      ),
      wrapCompartment.current.of(
        settings.word_wrap ? EditorView.lineWrapping : []
      ),
      vimCompartment.current.of(settings.vim_mode ? vimWithIntegratedStatus : []),
      tinymistAutocompletion(),
      imagePasteExtension(),
      lintGutter(),
      linter(lintSource),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) {
          onChange(u.state.doc.toString())
        }
        if (u.selectionSet || u.docChanged) {
          const pos = u.state.selection.main.head
          const { line, col } = indexToLineCol(u.state.doc.toString(), pos)
          setCursorLine(line)
          setCursorCol(col)
          onCursor(line, col)
          if (u.selectionSet && !u.docChanged && onCursorPreviewScrollRef.current) {
            onCursorPreviewScrollRef.current(line, col)
          }
        }
      })
    ]

    const state = EditorState.create({ doc: content, extensions })
    const view = new EditorView({ state, parent: hostRef.current })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [wasmReady])

  useEffect(() => {
    const view = viewRef.current
    const host = vimStatusHostRef.current
    if (!view || !host || !settings.vim_mode) return
    return attachVimStatusBar(view, host, () => cursorRef.current)
  }, [wasmReady, settings.vim_mode])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: langCompartment.current.reconfigure(typstEditorExtensions(settings.theme))
    })
  }, [settings.theme])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    if (vimEnabledRef.current === settings.vim_mode) return
    vimEnabledRef.current = settings.vim_mode
    view.dispatch({
      effects: vimCompartment.current.reconfigure(
        settings.vim_mode ? vimWithIntegratedStatus : []
      )
    })
  }, [settings.vim_mode])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: wrapCompartment.current.reconfigure(
        settings.word_wrap ? EditorView.lineWrapping : []
      )
    })
  }, [settings.word_wrap])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: lineNumberCompartment.current.reconfigure(
        settings.show_line_numbers ? lineNumbers() : []
      )
    })
  }, [settings.show_line_numbers])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const cur = view.state.doc.toString()
    if (cur !== content) {
      view.dispatch({
        changes: { from: 0, to: cur.length, insert: content }
      })
    }
  }, [content])

  useEffect(() => {
    const view = viewRef.current
    if (!view || !jumpTo) return
    const pos = lineColToPos(view.state.doc.toString(), jumpTo.line, jumpTo.col)
    const jumpTopOffsetPx = Math.max(80, Math.floor(view.dom.clientHeight * 0.28))
    view.dispatch({
      selection: { anchor: pos, head: pos },
      effects: EditorView.scrollIntoView(pos, { y: 'start', yMargin: jumpTopOffsetPx })
    })
    view.focus()
  }, [jumpTo?.key, jumpTo?.line, jumpTo?.col])

  const vimMode = settings.vim_mode

  return (
    <div className="editor-pane">
      <div className="pane-header">Source</div>
      <div
        className={`editor-host${vimMode ? ' editor-host-vim' : ''}`}
        style={{ fontSize: settings.font_size }}
      >
        {wasmError ? (
          <div className="editor-loading editor-error">
            Typst highlighter failed: {wasmError}
          </div>
        ) : !wasmReady ? (
          <div className="editor-loading">Loading Typst highlighter…</div>
        ) : (
          <>
            <div ref={hostRef} className="editor-host-inner" />
            {vimMode ? (
              <div
                ref={vimStatusHostRef}
                className="editor-vim-status-host"
                aria-label="Editor status"
              />
            ) : (
              <EditorStatusBar mode="Standard" line={cursorLine} col={cursorCol} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function lineColToPos(text: string, line: number, col: number): number {
  const lines = text.split('\n')
  const ln = Math.max(1, Math.min(line, lines.length))
  let pos = 0
  for (let i = 0; i < ln - 1; i++) {
    pos += lines[i].length + 1
  }
  const lineText = lines[ln - 1] ?? ''
  pos += Math.max(0, Math.min(col - 1, lineText.length))
  return pos
}
