import {
  HighlightStyle,
  Language,
  LanguageSupport,
  defineLanguageFacet,
  syntaxHighlighting
} from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import { TypstParser, typstHighlight } from 'codemirror-lang-typst'
import type { Extension } from '@codemirror/view'
import { initTypstWasm } from './typst-wasm-init'
import { codemirrorThemeExtensions, getTheme, hex, type StudioTheme } from './themes'
import { resolveThemeId } from '../../shared/theme-ids'

const typstFacet = defineLanguageFacet({
  commentTokens: { block: { open: '/*', close: '*/' } }
})

function typstHighlightStyle(theme: StudioTheme): Extension {
  const style = HighlightStyle.define(
    [
      { tag: t.heading, color: hex(theme.special), fontWeight: 'bold' },
      { tag: t.comment, color: hex(theme.comments), fontStyle: 'italic' },
      { tag: t.emphasis, fontStyle: 'italic' },
      { tag: t.strong, fontWeight: 'bold' },
      { tag: t.link, color: hex(theme.accent), textDecoration: 'underline' },
      { tag: t.labelName, color: hex(theme.types) },
      { tag: t.monospace, color: hex(theme.strs), fontFamily: 'monospace' },
      {
        tag: [
          t.keyword,
          t.controlKeyword,
          t.moduleKeyword,
          t.operatorKeyword,
          t.definitionKeyword
        ],
        color: hex(theme.keywords),
        fontWeight: 'bold'
      },
      { tag: [t.string, t.special(t.string)], color: hex(theme.strs) },
      { tag: [t.number, t.integer, t.float, t.bool, t.null], color: hex(theme.numerics) },
      { tag: [t.variableName, t.name, t.propertyName], color: hex(theme.fg) },
      { tag: [t.brace, t.bracket, t.paren], color: hex(theme.punctuation) },
      { tag: t.invalid, color: hex(theme.error) },
      { tag: t.content, color: hex(theme.fg) }
    ],
    { themeType: theme.dark ? 'dark' : 'light' }
  )
  return syntaxHighlighting(style)
}

let wasmReady: Promise<void> | null = null

export function ensureTypstWasm(): Promise<void> {
  if (!wasmReady) wasmReady = initTypstWasm()
  return wasmReady
}

export function typstLanguageSupport(themeId: string): LanguageSupport {
  const theme = getTheme(resolveThemeId(themeId))
  const parser = new TypstParser(typstHighlight)
  return new LanguageSupport(
    new Language(typstFacet, parser, [parser.updateListener()], 'typst'),
    [typstHighlightStyle(theme), ...codemirrorThemeExtensions(resolveThemeId(themeId))]
  )
}

export function typstEditorExtensions(themeId: string): Extension[] {
  const support = typstLanguageSupport(themeId)
  return [support]
}
