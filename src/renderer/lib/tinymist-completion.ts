import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult
} from '@codemirror/autocomplete'
import type { Extension } from '@codemirror/state'
import type { Text } from '@codemirror/state'
import type { StudioCompletionItem } from '../../shared/types'

const TRIGGER_BEFORE = /[#@$./(\[{][#@$.\w(\[{-]*$/

function lspPosToOffset(doc: Text, line: number, character: number): number {
  const clampedLine = Math.max(1, Math.min(line + 1, doc.lines))
  const lineObj = doc.line(clampedLine)
  return lineObj.from + Math.max(0, Math.min(character, lineObj.length))
}

function toCompletion(item: StudioCompletionItem): Completion {
  return {
    label: item.label,
    detail: item.detail,
    type: item.type,
    apply: item.insertText,
    boost: item.type === 'keyword' ? 2 : undefined
  }
}

function completionSource(context: CompletionContext): Promise<CompletionResult | null> {
  const { state, pos, explicit } = context
  const before = context.matchBefore(TRIGGER_BEFORE)
  if (!before && !explicit) return Promise.resolve(null)

  const line = state.doc.lineAt(pos)
  const line1 = line.number
  const col1 = pos - line.from + 1
  const content = state.doc.toString()

  return window.typstStudio
    .complete(line1, col1, content)
    .then((items) => {
      if (!items.length) return null

      let from = before?.from ?? pos
      for (const item of items) {
        if (item.range) {
          from = Math.min(
            from,
            lspPosToOffset(state.doc, item.range.start.line, item.range.start.character)
          )
        }
      }

      return {
        from,
        to: pos,
        options: items.map(toCompletion),
        validFor: TRIGGER_BEFORE
      }
    })
    .catch(() => null)
}

export function tinymistAutocompletion(): Extension {
  return autocompletion({
    override: [completionSource],
    activateOnTyping: true,
    maxRenderedOptions: 48,
    defaultKeymap: true,
    icons: true
  })
}
