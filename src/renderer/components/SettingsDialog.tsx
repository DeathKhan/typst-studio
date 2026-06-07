import { useEffect, useState } from 'react'
import type { Settings, PreviewMode, SplitLayout, PreviewFit } from '../../shared/types'
import { normalizeUiScale, UI_SCALE_PRESET_PERCENTS } from '../../shared/types'
import { THEME_OPTIONS } from '../lib/themes'

export interface SettingsDialogProps {
  settings: Settings
  open: boolean
  onChange: (s: Settings) => void
  onClose: () => void
}

type SettingsTab = 'general' | 'editor' | 'preview' | 'panels' | 'build'

const TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'editor', label: 'Editor' },
  { id: 'preview', label: 'Preview' },
  { id: 'panels', label: 'Panels' },
  { id: 'build', label: 'Build' }
]

type DocumentAdapt = 'original' | 'dark' | 'always'

function documentAdapt(settings: Settings): DocumentAdapt {
  if (settings.preview_match_theme) return 'dark'
  if (settings.tinymist_invert_colors === 'always') return 'always'
  if (settings.tinymist_invert_colors === 'auto') return 'dark'
  return 'original'
}

function adaptAllowsImages(settings: Settings): boolean {
  return documentAdapt(settings) !== 'original'
}

function isPresetPercent(p: number): boolean {
  return (UI_SCALE_PRESET_PERCENTS as readonly number[]).includes(p)
}

function UiScaleField({
  value,
  onChange
}: {
  value: number
  onChange: (scale: number) => void
}): React.ReactElement {
  const applied = Math.round(normalizeUiScale(value) * 100)
  const [custom, setCustom] = useState(() => !isPresetPercent(applied))
  const [text, setText] = useState(String(applied))

  useEffect(() => {
    const p = Math.round(normalizeUiScale(value) * 100)
    setText(String(p))
    setCustom(!isPresetPercent(p))
  }, [value])

  const applyPercent = (raw: number): void => {
    const scale = normalizeUiScale(raw / 100)
    onChange(scale)
    const p = Math.round(scale * 100)
    setText(String(p))
    setCustom(!isPresetPercent(p))
  }

  const selectValue =
    !custom && isPresetPercent(applied) ? String(applied) : 'custom'

  return (
    <div className="settings-scale-control">
      <select
        className="settings-scale-select"
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value
          if (v === 'custom') {
            setCustom(true)
            return
          }
          setCustom(false)
          applyPercent(Number(v))
        }}
      >
        {UI_SCALE_PRESET_PERCENTS.map((p) => (
          <option key={p} value={p}>
            {p}%
          </option>
        ))}
        <option value="custom">Custom…</option>
      </select>
      {custom && (
        <label className="settings-scale-custom">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            aria-label="Custom UI scale percent"
            value={text}
            onChange={(e) => setText(e.target.value.replace(/\D/g, '').slice(0, 3))}
            onBlur={() => applyPercent(Number(text) || applied)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
          />
          <span>%</span>
        </label>
      )}
    </div>
  )
}

export function SettingsDialog({
  settings,
  open,
  onChange,
  onClose
}: SettingsDialogProps): React.ReactElement | null {
  const [tab, setTab] = useState<SettingsTab>('general')

  if (!open) return null

  const patch = (partial: Partial<Settings>): void => {
    onChange({ ...settings, ...partial })
  }

  const setDocumentAdapt = (value: DocumentAdapt): void => {
    if (value === 'original') {
      patch({ preview_match_theme: false, tinymist_invert_colors: 'never', preview_invert_images: false })
      return
    }
    if (value === 'dark') {
      patch({ preview_match_theme: true, tinymist_invert_colors: 'never' })
      return
    }
    patch({ preview_match_theme: false, tinymist_invert_colors: 'always' })
  }

  const togglePanel = (
    key: 'show_explorer' | 'show_outline' | 'show_source' | 'show_preview' | 'show_problems'
  ): void => {
    if (key === 'show_source' || key === 'show_preview') {
      const next = !settings[key]
      const other = key === 'show_source' ? settings.show_preview : settings.show_source
      if (!next && !other) return
    }
    patch({ [key]: !settings[key] })
  }

  const rowSelect = (
    label: string,
    value: string,
    onValue: (v: string) => void,
    options: Array<{ value: string; label: string }>,
    disabled = false
  ): React.ReactElement => (
    <div className="settings-row">
      <span className="settings-row-label">{label}</span>
      <select value={value} disabled={disabled} onChange={(e) => onValue(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )

  const rowNumber = (
    label: string,
    value: number,
    onValue: (n: number) => void,
    min: number,
    max: number,
    step = 1
  ): React.ReactElement => (
    <div className="settings-row">
      <span className="settings-row-label">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onValue(Number(e.target.value))}
      />
    </div>
  )

  const rowCheck = (
    label: string,
    checked: boolean,
    onToggle: () => void,
    disabled = false
  ): React.ReactElement => (
    <label className={`settings-row settings-row-check${disabled ? ' disabled' : ''}`}>
      <span className="settings-row-label">{label}</span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onToggle} />
    </label>
  )

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-dialog" onClick={(e) => e.stopPropagation()}>
        <header className="settings-header">
          <h2>Settings</h2>
          <button type="button" className="btn-sm" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="settings-shell">
          <nav className="settings-nav" aria-label="Settings sections">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`settings-nav-item${tab === id ? ' active' : ''}`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="settings-panel">
            {tab === 'general' && (
              <>
                {rowSelect(
                  'Theme',
                  settings.theme,
                  (theme) => patch({ theme }),
                  THEME_OPTIONS.map((t) => ({ value: t.id, label: t.name }))
                )}
                <div className="settings-row">
                  <span className="settings-row-label">UI scale</span>
                  <UiScaleField
                    value={settings.ui_scale}
                    onChange={(ui_scale) => patch({ ui_scale })}
                  />
                </div>
                {rowSelect(
                  'Layout',
                  settings.split,
                  (split) => patch({ split: split as SplitLayout }),
                  [
                    { value: 'editor_left', label: 'Side by side' },
                    { value: 'editor_top', label: 'Editor on top' }
                  ]
                )}
              </>
            )}

            {tab === 'editor' && (
              <>
                {rowNumber('Font size', settings.font_size, (font_size) => patch({ font_size }), 10, 24)}
                {rowCheck('Line numbers', settings.show_line_numbers, () =>
                  patch({ show_line_numbers: !settings.show_line_numbers })
                )}
                {rowCheck('Word wrap', settings.word_wrap, () =>
                  patch({ word_wrap: !settings.word_wrap })
                )}
                {rowCheck('Vim mode', settings.vim_mode, () => patch({ vim_mode: !settings.vim_mode }))}
              </>
            )}

            {tab === 'preview' && (
              <>
                {rowSelect(
                  'Mode',
                  settings.preview_mode,
                  (preview_mode) => patch({ preview_mode: preview_mode as PreviewMode }),
                  [
                    { value: 'tinymist', label: 'Live (Tinymist)' },
                    { value: 'pdf', label: 'PDF' }
                  ]
                )}
                {rowSelect(
                  'Document',
                  documentAdapt(settings),
                  (v) => setDocumentAdapt(v as DocumentAdapt),
                  [
                    { value: 'original', label: 'Original' },
                    { value: 'dark', label: 'Adapt for dark UI' },
                    { value: 'always', label: 'Always adapt' }
                  ]
                )}
                {rowCheck(
                  'Flip images',
                  settings.preview_invert_images,
                  () => patch({ preview_invert_images: !settings.preview_invert_images }),
                  !adaptAllowsImages(settings)
                )}
                {rowCheck('Page counter', settings.show_preview_page_count, () =>
                  patch({ show_preview_page_count: !settings.show_preview_page_count })
                )}
                {rowCheck('Partial rendering', settings.tinymist_partial_rendering, () =>
                  patch({ tinymist_partial_rendering: !settings.tinymist_partial_rendering })
                )}
                {rowNumber('Zoom', settings.preview_zoom, (preview_zoom) => patch({ preview_zoom }), 0.25, 3, 0.1)}
                {rowSelect(
                  'PDF fit',
                  settings.preview_fit,
                  (preview_fit) => patch({ preview_fit: preview_fit as PreviewFit }),
                  [
                    { value: 'fit_width', label: 'Fit width' },
                    { value: 'fit_page', label: 'Fit page' },
                    { value: 'manual', label: 'Manual' }
                  ]
                )}
              </>
            )}

            {tab === 'panels' && (
              <div className="settings-toggles">
                {(
                  [
                    ['show_explorer', 'Explorer'],
                    ['show_outline', 'Outline'],
                    ['show_source', 'Source'],
                    ['show_preview', 'Preview'],
                    ['show_problems', 'Problems']
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="settings-toggle">
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={settings[key]}
                      onChange={() => togglePanel(key)}
                    />
                  </label>
                ))}
              </div>
            )}

            {tab === 'build' && (
              <>
                {rowNumber(
                  'Debounce (ms)',
                  settings.debounce_ms,
                  (debounce_ms) => patch({ debounce_ms }),
                  100,
                  3000,
                  50
                )}
                {rowCheck('Auto-compile PDF', settings.auto_compile, () =>
                  patch({ auto_compile: !settings.auto_compile })
                )}
              </>
            )}
          </div>
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
