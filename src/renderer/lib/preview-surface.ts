import type { Settings } from '../../shared/types'
import { isThemeDark } from '../../shared/theme-ids'
import { previewUsesDarkColorScheme } from '../../shared/preview-theme'
import { editorBackgroundColor, getTheme, hex } from './themes'

/** Match `.cm-scroller` in styles.css — used for badge offset and webview injection. */
export const PREVIEW_SCROLLBAR_SIZE_PX = 10

function previewScrollbarCss(bg: string, muted: string, accent: string): string {
  return `
html,
body,
#typst-container,
#typst-container-main {
  scrollbar-width: thin;
  scrollbar-color: ${muted} ${bg};
}
html::-webkit-scrollbar,
body::-webkit-scrollbar,
#typst-container::-webkit-scrollbar,
#typst-container-main::-webkit-scrollbar {
  width: ${PREVIEW_SCROLLBAR_SIZE_PX}px;
  height: ${PREVIEW_SCROLLBAR_SIZE_PX}px;
}
html::-webkit-scrollbar-track,
body::-webkit-scrollbar-track,
#typst-container::-webkit-scrollbar-track,
#typst-container-main::-webkit-scrollbar-track {
  background: ${bg};
}
html::-webkit-scrollbar-thumb,
body::-webkit-scrollbar-thumb,
#typst-container::-webkit-scrollbar-thumb,
#typst-container-main::-webkit-scrollbar-thumb {
  background: ${muted};
  border-radius: 5px;
  border: 2px solid ${bg};
}
html::-webkit-scrollbar-thumb:hover,
body::-webkit-scrollbar-thumb:hover,
#typst-container::-webkit-scrollbar-thumb:hover,
#typst-container-main::-webkit-scrollbar-thumb:hover {
  background: ${accent};
}
html::-webkit-scrollbar-corner,
body::-webkit-scrollbar-corner,
#typst-container::-webkit-scrollbar-corner,
#typst-container-main::-webkit-scrollbar-corner {
  background: ${bg};
}`.trim()
}

/** CSS injected into the Tinymist preview webview to match the studio theme. */
export function buildPreviewWebviewCss(settings: Settings): string {
  const theme = getTheme(settings.theme)
  const bg = editorBackgroundColor(settings.theme)
  const fg = hex(theme.fg)
  const muted = hex(theme.muted)
  const accent = hex(theme.accent)
  const scheme =
    previewUsesDarkColorScheme(settings) && isThemeDark(settings.theme) ? 'dark' : 'light'

  return `
:root {
  --typst-preview-background-color: ${bg};
  --typst-preview-foreground-color: ${fg};
  --vscode-sideBar-background: ${bg};
}
html,
body {
  background-color: ${bg} !important;
  color-scheme: ${scheme};
}
#typst-app,
#typst-container,
#typst-container-main {
  background-color: ${bg} !important;
}
${previewScrollbarCss(bg, muted, accent)}
`.trim()
}

/** Inline styles Tinymist reads on load; set after dom-ready so they win over defaults. */
export function previewSurfaceJs(settings: Settings): string {
  const bg = editorBackgroundColor(settings.theme)
  const fg = hex(getTheme(settings.theme).fg)
  return `(function () {
  const root = document.documentElement;
  root.style.setProperty('--typst-preview-background-color', ${JSON.stringify(bg)});
  root.style.setProperty('--typst-preview-foreground-color', ${JSON.stringify(fg)});
  root.style.setProperty('--vscode-sideBar-background', ${JSON.stringify(bg)});
  for (const id of ['typst-app', 'typst-container', 'typst-container-main']) {
    const el = document.getElementById(id);
    if (el) el.style.backgroundColor = ${JSON.stringify(bg)};
  }
})();`
}
