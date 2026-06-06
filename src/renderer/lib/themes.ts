import { EditorView, type Extension } from '@codemirror/view'
import { resolveThemeId } from '../../shared/theme-ids'

export interface StudioTheme {
  id: string
  name: string
  dark: boolean
  bg: string
  fg: string
  cursor: string
  selection: string
  border: string
  surface: string
  muted: string
  accent: string
  error: string
  comments: string
  functions: string
  keywords: string
  literals: string
  numerics: string
  punctuation: string
  strs: string
  types: string
  special: string
}

const THEMES: StudioTheme[] = [
  {
    id: 'gruvbox',
    name: 'Gruvbox',
    dark: true,
    bg: '282828',
    fg: 'ebdbb2',
    cursor: 'a89984',
    selection: '504945',
    border: '3c3836',
    surface: '32302f',
    muted: '928374',
    accent: '83a598',
    error: 'fb4934',
    comments: '928374',
    functions: 'b8bb26',
    keywords: 'fb4934',
    literals: 'ebdbb2',
    numerics: 'd3869b',
    punctuation: 'fe8019',
    strs: '8ec07c',
    types: 'fabd2f',
    special: '83a598'
  },
  {
    id: 'gruvbox_light',
    name: 'Gruvbox Light',
    dark: false,
    bg: 'fbf1c7',
    fg: '282828',
    cursor: '7c6f64',
    selection: 'd5c4a1',
    border: 'd5c4a1',
    surface: 'ebdbb2',
    muted: '7c6f64',
    accent: '076678',
    error: '9d0006',
    comments: '7c6f64',
    functions: '79740e',
    keywords: '9d0006',
    literals: '282828',
    numerics: '8f3f71',
    punctuation: 'af3a03',
    strs: '427b58',
    types: 'b57614',
    special: '076678'
  },
  {
    id: 'ayu',
    name: 'Ayu',
    dark: false,
    bg: 'fafafa',
    fg: '5c6166',
    cursor: '5c6166',
    selection: 'f0f4f7',
    border: 'e6e8eb',
    surface: 'f0f4f7',
    muted: 'abb0b6',
    accent: '39bae6',
    error: 'f07171',
    comments: 'abb0b6',
    functions: 'f29718',
    keywords: 'f07171',
    literals: '5c6166',
    numerics: 'a37acc',
    punctuation: '5c6166',
    strs: '86b300',
    types: '39bae6',
    special: '39bae6'
  },
  {
    id: 'ayu_dark',
    name: 'Ayu Dark',
    dark: true,
    bg: '0d1017',
    fg: 'bfbdb6',
    cursor: 'bfbdb6',
    selection: '253340',
    border: '1f2430',
    surface: '131721',
    muted: '626a73',
    accent: '59c2ff',
    error: 'f07171',
    comments: '626a73',
    functions: 'ffb454',
    keywords: 'f07171',
    literals: 'bfbdb6',
    numerics: 'd2a6ff',
    punctuation: 'bfbdb6',
    strs: 'aad84c',
    types: '59c2ff',
    special: '59c2ff'
  },
  {
    id: 'github_dark',
    name: 'GitHub Dark',
    dark: true,
    bg: '0d1117',
    fg: 'c9d1d9',
    cursor: 'c9d1d9',
    selection: '264f78',
    border: '30363d',
    surface: '161b22',
    muted: '8b949e',
    accent: '58a6ff',
    error: 'ff7b72',
    comments: '8b949e',
    functions: 'd2a8ff',
    keywords: 'ff7b72',
    literals: 'c9d1d9',
    numerics: '79c0ff',
    punctuation: 'c9d1d9',
    strs: 'a5d6ff',
    types: 'ffa657',
    special: '58a6ff'
  },
  {
    id: 'github_light',
    name: 'GitHub Light',
    dark: false,
    bg: 'ffffff',
    fg: '24292f',
    cursor: '24292f',
    selection: 'b6e3ff',
    border: 'd0d7de',
    surface: 'f6f8fa',
    muted: '6e7781',
    accent: '0969da',
    error: 'cf222e',
    comments: '6e7781',
    functions: '8250df',
    keywords: 'cf222e',
    literals: '24292f',
    numerics: '0550ae',
    punctuation: '24292f',
    strs: '0a3069',
    types: '953800',
    special: '0969da'
  },
  {
    id: 'sonokai',
    name: 'Sonokai',
    dark: true,
    bg: '2d2a2e',
    fg: 'fcfcfa',
    cursor: 'fcfcfa',
    selection: '403e41',
    border: '3a383b',
    surface: '252326',
    muted: '727072',
    accent: '78dce8',
    error: 'ff6188',
    comments: '727072',
    functions: 'a9dc76',
    keywords: 'ff6188',
    literals: 'fcfcfa',
    numerics: 'ab9df2',
    punctuation: 'fcfcfa',
    strs: 'ffd866',
    types: '78dce8',
    special: '78dce8'
  }
]

export function hex(s: string): string {
  return s.startsWith('#') ? s : `#${s}`
}

export function getTheme(id: string): StudioTheme {
  return THEMES.find((t) => t.id === resolveThemeId(id))!
}

export const THEME_OPTIONS = THEMES.map((t) => ({ id: t.id, name: t.name }))

/** Editor / preview canvas background for a theme id. */
export function editorBackgroundColor(themeId: string): string {
  return hex(getTheme(themeId).bg)
}

/** CSS variables applied on `.app` so the whole UI shares one palette. */
export function themeStyleVars(themeId: string): Record<string, string> {
  const p = getTheme(themeId)
  const editorBg = hex(p.bg)
  return {
    '--ts-bg': editorBg,
    '--ts-fg': hex(p.fg),
    '--ts-border': hex(p.border),
    '--ts-surface': hex(p.surface),
    '--ts-muted': hex(p.muted),
    '--ts-accent': hex(p.accent),
    '--ts-accent-soft': `${hex(p.accent)}40`,
    '--ts-selection': hex(p.selection),
    '--ts-error': hex(p.error),
    '--ts-hover': p.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    '--ts-overlay': p.dark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)',
    '--ts-shadow': p.dark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.15)',
    '--ts-preview-paper': editorBg,
    '--ts-syntax-comment': hex(p.comments),
    '--ts-syntax-keyword': hex(p.keywords),
    '--ts-syntax-string': hex(p.strs),
    '--ts-syntax-number': hex(p.numerics),
    '--ts-syntax-type': hex(p.types),
    '--ts-syntax-heading': hex(p.special),
    '--ts-syntax-math': hex(p.numerics),
    '--ts-syntax-label': hex(p.types)
  }
}

function codemirrorChrome(theme: StudioTheme): Extension {
  return EditorView.theme(
    {
      '&': {
        backgroundColor: hex(theme.bg),
        color: hex(theme.fg)
      },
      '.cm-content': { caretColor: hex(theme.cursor) },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: hex(theme.cursor) },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
        backgroundColor: hex(theme.selection)
      },
      '.cm-scroller': {
        scrollbarColor: `${hex(theme.muted)} ${hex(theme.bg)}`
      },
      '.cm-gutters': {
        backgroundColor: hex(theme.bg),
        color: hex(theme.muted),
        borderRight: `1px solid ${hex(theme.border)}`
      },
      '.cm-activeLine': { backgroundColor: `${hex(theme.selection)}88` },
      '.cm-activeLineGutter': { backgroundColor: `${hex(theme.selection)}66` },
      '.cm-panel.cm-search': {
        backgroundColor: hex(theme.surface),
        color: hex(theme.fg),
        borderTop: `1px solid ${hex(theme.border)}`,
        boxShadow: `0 -2px 12px ${theme.dark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.08)'}`
      },
      '.cm-panel.cm-search input[type="text"]': {
        backgroundColor: hex(theme.bg),
        color: hex(theme.fg),
        border: `1px solid ${hex(theme.border)}`,
        borderRadius: '4px',
        padding: '2px 6px'
      },
      '.cm-panel.cm-search label': {
        color: hex(theme.muted),
        fontSize: '0.8rem'
      },
      '.cm-panel.cm-search button.cm-button, .cm-panel.cm-search [name="close"]': {
        backgroundColor: hex(theme.selection),
        color: hex(theme.fg),
        border: `1px solid ${hex(theme.border)}`,
        borderRadius: '4px',
        padding: '2px 8px',
        cursor: 'pointer',
        font: 'inherit'
      },
      '.cm-panel.cm-search button.cm-button:hover, .cm-panel.cm-search [name="close"]:hover': {
        backgroundColor: hex(theme.accent),
        color: hex(theme.bg),
        borderColor: hex(theme.accent)
      },
      '.cm-vim-panel': {
        backgroundColor: hex(theme.surface),
        color: hex(theme.fg),
        borderTop: `1px solid ${hex(theme.border)}`,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '12px',
        minHeight: '1.6em',
        alignItems: 'center'
      },
      '.cm-vim-panel input': {
        backgroundColor: hex(theme.bg),
        color: hex(theme.fg),
        flex: 1,
        minWidth: 0,
        padding: '2px 4px',
        fontFamily: 'inherit',
        fontSize: 'inherit'
      },
      '.cm-vim-panel .cm-vim-message': {
        color: hex(theme.error)
      },
      '.cm-vim-panel > span[style*="cursor"]': {
        color: hex(theme.accent),
        fontWeight: 600,
        paddingRight: '8px'
      },
      '.cm-searchMatch': {
        backgroundColor: `${hex(theme.accent)}44`,
        outline: `1px solid ${hex(theme.accent)}`
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: `${hex(theme.accent)}77`
      }
    },
    { dark: theme.dark }
  )
}

const cmCache = new Map<string, Extension[]>()

export function codemirrorThemeExtensions(themeId: string): Extension[] {
  const id = resolveThemeId(themeId)
  let ext = cmCache.get(id)
  if (!ext) {
    const theme = getTheme(id)
    ext = [codemirrorChrome(theme)]
    cmCache.set(id, ext)
  }
  return ext
}

