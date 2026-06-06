export const THEME_IDS = [
  'gruvbox',
  'gruvbox_light',
  'ayu',
  'ayu_dark',
  'github_dark',
  'github_light',
  'sonokai'
] as const

export type ThemeId = (typeof THEME_IDS)[number]

const THEME_DARK: Record<ThemeId, boolean> = {
  gruvbox: true,
  gruvbox_light: false,
  ayu: false,
  ayu_dark: true,
  github_dark: true,
  github_light: false,
  sonokai: true
}

export function isThemeDark(themeId: string | undefined): boolean {
  return THEME_DARK[resolveThemeId(themeId)]
}

export function resolveThemeId(id: string | undefined): ThemeId {
  if (id && (THEME_IDS as readonly string[]).includes(id)) {
    return id as ThemeId
  }
  return 'gruvbox'
}

/** Migrate legacy `app_theme` / `editor_theme` from settings.json. */
export function normalizeSettingsTheme(raw: Record<string, unknown>): ThemeId {
  if (typeof raw.theme === 'string') {
    return resolveThemeId(raw.theme)
  }
  if (typeof raw.editor_theme === 'string') {
    return resolveThemeId(raw.editor_theme)
  }
  if (raw.app_theme === 'light') return 'gruvbox_light'
  if (raw.app_theme === 'dark') return 'gruvbox'
  return 'gruvbox'
}
