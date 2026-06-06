import type { Settings, PreviewMode, SplitLayout, PreviewFit } from '../../shared/types'
import { normalizeUiScale, UI_SCALE_MAX, UI_SCALE_MIN } from '../../shared/types'
import { THEME_OPTIONS } from '../lib/themes'

export interface SettingsDialogProps {
  settings: Settings
  open: boolean
  onChange: (s: Settings) => void
  onClose: () => void
}

export function SettingsDialog({
  settings,
  open,
  onChange,
  onClose
}: SettingsDialogProps): React.ReactElement | null {
  if (!open) return null

  const patch = (partial: Partial<Settings>): void => {
    onChange({ ...settings, ...partial })
  }

  const togglePanel = (
    key: 'show_toolbar' | 'show_outline' | 'show_source' | 'show_preview' | 'show_problems'
  ): void => {
    if (key === 'show_source' || key === 'show_preview') {
      const next = !settings[key]
      const other = key === 'show_source' ? settings.show_preview : settings.show_source
      if (!next && !other) return
    }
    patch({ [key]: !settings[key] })
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-dialog" onClick={(e) => e.stopPropagation()}>
        <header className="settings-header">
          <h2>Settings</h2>
          <button type="button" className="btn-sm" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="settings-body">
          <section>
            <h3>Appearance</h3>
            <div className="settings-grid">
              <label>
                Theme
                <select
                  value={settings.theme}
                  onChange={(e) => patch({ theme: e.target.value })}
                >
                  {THEME_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="settings-range">
                UI scale ({Math.round(normalizeUiScale(settings.ui_scale) * 100)}%)
                <input
                  type="range"
                  min={UI_SCALE_MIN}
                  max={UI_SCALE_MAX}
                  step={0.05}
                  value={normalizeUiScale(settings.ui_scale)}
                  onChange={(e) => patch({ ui_scale: normalizeUiScale(Number(e.target.value)) })}
                />
              </label>
            </div>
            <div className="settings-checkgrid">
              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={settings.preview_match_theme}
                  onChange={(e) => patch({ preview_match_theme: e.target.checked })}
                />
                Apply theme to preview
              </label>
            </div>
            <p className="settings-hint">
              The preview panel always uses the same background as the source editor. Enabling this
              restarts Tinymist to invert page colors on dark themes (light themes keep normal pages).
            </p>
          </section>

          <section>
            <h3>Panels</h3>
            <p className="settings-hint">
              Also under View in the menu bar. Toolbar shows recompile and auto-compile only (file
              actions are under File).
            </p>
            <div className="settings-checkgrid">
              {(
                [
                  ['show_toolbar', 'Toolbar'],
                  ['show_outline', 'Outline'],
                  ['show_source', 'Source'],
                  ['show_preview', 'Preview'],
                  ['show_problems', 'Problems']
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="settings-check">
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    onChange={() => togglePanel(key)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>

          <section>
            <h3>Editor</h3>
            <div className="settings-grid">
              <label>
                Font size
                <input
                  type="number"
                  min={10}
                  max={24}
                  value={settings.font_size}
                  onChange={(e) => patch({ font_size: Number(e.target.value) })}
                />
              </label>
            </div>
            <div className="settings-checkgrid">
              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={settings.show_line_numbers}
                  onChange={(e) => patch({ show_line_numbers: e.target.checked })}
                />
                Line numbers
              </label>
              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={settings.word_wrap}
                  onChange={(e) => patch({ word_wrap: e.target.checked })}
                />
                Word wrap
              </label>
              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={settings.vim_mode}
                  onChange={(e) => patch({ vim_mode: e.target.checked })}
                />
                Vim mode
              </label>
            </div>
          </section>

          <section>
            <h3>Layout</h3>
            <div className="settings-grid">
              <label>
                Split
                <select
                  value={settings.split}
                  onChange={(e) => patch({ split: e.target.value as SplitLayout })}
                >
                  <option value="editor_left">Side by side</option>
                  <option value="editor_top">Editor on top</option>
                </select>
              </label>
            </div>
          </section>

          <section>
            <h3>Preview</h3>
            <div className="settings-grid">
              <label>
                Mode
                <select
                  value={settings.preview_mode}
                  onChange={(e) => patch({ preview_mode: e.target.value as PreviewMode })}
                >
                  <option value="tinymist">Tinymist HTML (live)</option>
                  <option value="pdf">PDF (typst CLI)</option>
                </select>
              </label>
              <label>
                Zoom
                <input
                  type="number"
                  min={0.25}
                  max={3}
                  step={0.1}
                  value={settings.preview_zoom}
                  onChange={(e) => patch({ preview_zoom: Number(e.target.value) })}
                />
              </label>
              <label>
                PDF fit
                <select
                  value={settings.preview_fit}
                  onChange={(e) => patch({ preview_fit: e.target.value as PreviewFit })}
                >
                  <option value="fit_width">Fit width</option>
                  <option value="fit_page">Fit page</option>
                  <option value="manual">Manual zoom</option>
                </select>
              </label>
              <label>
                Invert colors
                <select
                  value={settings.tinymist_invert_colors}
                  disabled={settings.preview_match_theme}
                  onChange={(e) => patch({ tinymist_invert_colors: e.target.value })}
                >
                  <option value="auto">Auto</option>
                  <option value="never">Never</option>
                </select>
              </label>
            </div>
            <div className="settings-checkgrid">
              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={settings.tinymist_partial_rendering}
                  onChange={(e) => patch({ tinymist_partial_rendering: e.target.checked })}
                />
                Partial rendering (faster updates)
              </label>
            </div>
          </section>

          <section>
            <h3>Compile</h3>
            <div className="settings-grid">
              <label>
                Debounce (ms)
                <input
                  type="number"
                  min={100}
                  max={3000}
                  step={50}
                  value={settings.debounce_ms}
                  onChange={(e) => patch({ debounce_ms: Number(e.target.value) })}
                />
              </label>
            </div>
            <div className="settings-checkgrid">
              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={settings.auto_compile}
                  onChange={(e) => patch({ auto_compile: e.target.checked })}
                />
                Auto-compile PDF when in PDF preview mode
              </label>
            </div>
          </section>
        </div>

        <footer className="settings-footer">
          <button type="button" className="btn-primary" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  )
}
