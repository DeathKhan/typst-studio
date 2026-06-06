import { isThemeDark, resolveThemeId } from './theme-ids'
import type { Settings } from './types'

/**
 * Tinymist `--invert-colors` for the current settings + theme.
 *
 * When matching the editor theme we use `always` / `never` explicitly.
 * Tinymist `auto` only follows browser/OS prefs inside the preview webview,
 * which does not track Typst Studio's selected palette.
 */
export function effectiveTinymistInvert(settings: Settings): string {
  const configured = settings.tinymist_invert_colors
  if (!settings.preview_match_theme) {
    return configured
  }
  if (configured !== 'auto' && configured !== 'never') {
    return configured
  }
  return isThemeDark(resolveThemeId(settings.theme)) ? 'always' : 'never'
}
