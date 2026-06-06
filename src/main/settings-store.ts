import { app } from 'electron'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { normalizeSettingsTheme } from '../shared/theme-ids'
import { DEFAULT_SETTINGS, normalizeUiScale, type Settings } from '../shared/types'

function settingsPath(): string {
  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  return join(dir, 'settings.json')
}

export function loadSettings(): Settings {
  const path = settingsPath()
  if (!existsSync(path)) {
    return { ...DEFAULT_SETTINGS }
  }
  try {
    const raw = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const { app_theme: _a, editor_theme: _e, ...rest } = parsed
    const theme = normalizeSettingsTheme(parsed)
    const merged = { ...DEFAULT_SETTINGS, ...rest, theme } as Settings
    merged.ui_scale = normalizeUiScale(merged.ui_scale)
    if ((merged.split as string) === 'editor_left_sync') {
      merged.split = 'editor_left'
    }
    return merged
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: Settings): void {
  writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
}
