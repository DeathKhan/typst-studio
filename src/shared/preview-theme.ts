import { isThemeDark, resolveThemeId } from './theme-ids'
import type { Settings } from './types'

type InvertMode = 'never' | 'auto' | 'always'

function invertSpec(rest: InvertMode, image: InvertMode): string {
  if (rest === 'never' && image === 'never') return 'never'
  if (rest === image && (rest === 'auto' || rest === 'always')) return rest
  return JSON.stringify({ rest, image })
}

function manualRestMode(settings: Settings): InvertMode {
  const configured = settings.tinymist_invert_colors
  if (configured === 'always' || configured === 'never') {
    return configured
  }
  if (configured === 'auto') {
    // Embedded preview webview has no OS theme; follow the editor palette instead.
    return isThemeDark(resolveThemeId(settings.theme)) ? 'always' : 'never'
  }
  return 'never'
}

/**
 * Tinymist `--invert-colors` for the current settings + theme.
 *
 * This is a CSS color flip for readability, not studio palette theming.
 * Images are never flipped unless `preview_invert_images` is enabled.
 */
export function effectiveTinymistInvert(settings: Settings): string {
  let rest: InvertMode = 'never'

  if (settings.preview_match_theme) {
    rest = isThemeDark(resolveThemeId(settings.theme)) ? 'always' : 'never'
  } else {
    rest = manualRestMode(settings)
  }

  const image: InvertMode = settings.preview_invert_images ? rest : 'never'
  return invertSpec(rest, image)
}

/** Whether the preview webview should use a dark color-scheme (affects Tinymist `auto` invert). */
export function previewUsesDarkColorScheme(settings: Settings): boolean {
  const invert = effectiveTinymistInvert(settings)
  if (invert === 'never') return false
  if (invert === 'always' || invert === 'auto') return true
  try {
    const parsed = JSON.parse(invert) as { rest?: string }
    return parsed.rest === 'always' || parsed.rest === 'auto'
  } catch {
    return false
  }
}
