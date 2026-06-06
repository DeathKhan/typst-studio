import { useEffect, useRef, useState } from 'react'
import type { Settings } from '../../shared/types'

export interface MenuBarProps {
  settings: Settings
  documentTitle: string
  onPatch: (partial: Partial<Settings>) => void
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onRefreshPreview: () => void
  onExportPdf: () => void
  onOpenSettings: () => void
}

type PanelKey = 'show_toolbar' | 'show_outline' | 'show_source' | 'show_preview' | 'show_problems'

const VIEW_ITEMS: Array<{ key: PanelKey; label: string }> = [
  { key: 'show_outline', label: 'Outline' },
  { key: 'show_source', label: 'Source' },
  { key: 'show_preview', label: 'Preview' },
  { key: 'show_problems', label: 'Problems' }
]

export function MenuBar({
  settings,
  documentTitle,
  onPatch,
  onOpen,
  onSave,
  onSaveAs,
  onRefreshPreview,
  onExportPdf,
  onOpenSettings
}: MenuBarProps): React.ReactElement {
  const [openMenu, setOpenMenu] = useState<'file' | 'edit' | 'view' | 'build' | null>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openMenu) return
    const onDoc = (e: MouseEvent): void => {
      if (!barRef.current?.contains(e.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [openMenu])

  const togglePanel = (key: PanelKey): void => {
    if (key === 'show_source' || key === 'show_preview') {
      const next = !settings[key]
      const other = key === 'show_source' ? settings.show_preview : settings.show_source
      if (!next && !other) return
    }
    onPatch({ [key]: !settings[key] })
  }

  const menuBtn = (
    id: 'file' | 'edit' | 'view' | 'build',
    label: string
  ): React.ReactElement => (
    <button
      type="button"
      className={`menu-trigger${openMenu === id ? ' active' : ''}`}
      onClick={() => setOpenMenu((m) => (m === id ? null : id))}
    >
      {label}
    </button>
  )

  return (
    <nav className="menubar" ref={barRef}>
      <div className="menubar-menus">
        <div className="menu-group">
          {menuBtn('file', 'File')}
          {openMenu === 'file' && (
            <div className="menu-dropdown">
              <button type="button" className="menu-item" onClick={() => { setOpenMenu(null); onOpen() }}>
                Open…
              </button>
              <button type="button" className="menu-item" onClick={() => { setOpenMenu(null); onSave() }}>
                Save
              </button>
              <button
                type="button"
                className="menu-item"
                onClick={() => { setOpenMenu(null); onSaveAs() }}
              >
                Save As…
              </button>
              <div className="menu-sep" />
              <button
                type="button"
                className="menu-item"
                onClick={() => { setOpenMenu(null); onOpenSettings() }}
              >
                Settings…
              </button>
            </div>
          )}
        </div>
        <div className="menu-group">
          {menuBtn('edit', 'Edit')}
          {openMenu === 'edit' && (
            <div className="menu-dropdown">
              <button
                type="button"
                className={`menu-item menu-check${settings.vim_mode ? ' checked' : ''}`}
                onClick={() => { setOpenMenu(null); onPatch({ vim_mode: !settings.vim_mode }) }}
              >
                <span className="menu-checkmark">{settings.vim_mode ? '✓' : ''}</span>
                Vim mode
              </button>
              <button
                type="button"
                className={`menu-item menu-check${settings.word_wrap ? ' checked' : ''}`}
                onClick={() => { setOpenMenu(null); onPatch({ word_wrap: !settings.word_wrap }) }}
              >
                <span className="menu-checkmark">{settings.word_wrap ? '✓' : ''}</span>
                Word wrap
              </button>
              <button
                type="button"
                className={`menu-item menu-check${settings.show_line_numbers ? ' checked' : ''}`}
                onClick={() => {
                  setOpenMenu(null)
                  onPatch({ show_line_numbers: !settings.show_line_numbers })
                }}
              >
                <span className="menu-checkmark">{settings.show_line_numbers ? '✓' : ''}</span>
                Line numbers
              </button>
            </div>
          )}
        </div>
        <div className="menu-group">
          {menuBtn('view', 'View')}
          {openMenu === 'view' && (
            <div className="menu-dropdown">
              {VIEW_ITEMS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`menu-item menu-check${settings[key] ? ' checked' : ''}`}
                  onClick={() => togglePanel(key)}
                >
                  <span className="menu-checkmark">{settings[key] ? '✓' : ''}</span>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="menu-group">
          {menuBtn('build', 'Build')}
          {openMenu === 'build' && (
            <div className="menu-dropdown">
              <button
                type="button"
                className="menu-item"
                onClick={() => { setOpenMenu(null); onRefreshPreview() }}
              >
                Recompile preview
              </button>
              <button
                type="button"
                className="menu-item"
                onClick={() => { setOpenMenu(null); onExportPdf() }}
              >
                Export PDF…
              </button>
              <div className="menu-sep" />
              <button
                type="button"
                className={`menu-item menu-check${settings.preview_mode === 'tinymist' ? ' checked' : ''}`}
                onClick={() => { setOpenMenu(null); onPatch({ preview_mode: 'tinymist' }) }}
              >
                <span className="menu-checkmark">{settings.preview_mode === 'tinymist' ? '✓' : ''}</span>
                Live preview mode
              </button>
              <button
                type="button"
                className={`menu-item menu-check${settings.preview_mode === 'pdf' ? ' checked' : ''}`}
                onClick={() => { setOpenMenu(null); onPatch({ preview_mode: 'pdf' }) }}
              >
                <span className="menu-checkmark">{settings.preview_mode === 'pdf' ? '✓' : ''}</span>
                PDF mode
              </button>
              <button
                type="button"
                className={`menu-item menu-check${settings.auto_compile ? ' checked' : ''}`}
                onClick={() => { setOpenMenu(null); onPatch({ auto_compile: !settings.auto_compile }) }}
              >
                <span className="menu-checkmark">{settings.auto_compile ? '✓' : ''}</span>
                Auto-compile
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="menubar-spacer" />

      <span className="menubar-title" title={documentTitle}>
        {documentTitle}
      </span>

    </nav>
  )
}
