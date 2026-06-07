import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'

export function imagePasteExtension(): Extension {
  return EditorView.domEventHandlers({
    paste(event, view) {
      const items = event.clipboardData?.items
      if (!items) return false

      for (const item of items) {
        if (!item.type.startsWith('image/')) continue

        const file = item.getAsFile()
        if (!file) return true

        event.preventDefault()
        void file.arrayBuffer().then(async (buf) => {
          const result = await window.typstStudio.saveClipboardImage(buf)
          if (!result.ok || !result.path) return

          const { from, to } = view.state.selection.main
          const insert = `#image("${result.path}")`
          view.dispatch({
            changes: { from, to, insert },
            selection: { anchor: from + insert.length }
          })
        })
        return true
      }

      return false
    }
  })
}
