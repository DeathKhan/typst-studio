export type PreviewMode = 'tinymist' | 'pdf'
export type SplitLayout = 'editor_left' | 'editor_top'
export type PreviewFit = 'manual' | 'fit_width' | 'fit_page'

export interface Settings {
  /** Unified UI + editor palette id (e.g. gruvbox, github_dark). */
  theme: string
  ui_scale: number
  font_size: number
  show_line_numbers: boolean
  word_wrap: boolean
  vim_mode: boolean
  preview_mode: PreviewMode
  preview_zoom: number
  preview_fit: PreviewFit
  tinymist_partial_rendering: boolean
  tinymist_invert_colors: string
  /** When true, preview background and Tinymist invert follow the editor theme. */
  preview_match_theme: boolean
  preview_open_in_browser: boolean
  auto_compile: boolean
  debounce_ms: number
  split: SplitLayout
  show_toolbar: boolean
  show_outline: boolean
  show_source: boolean
  show_preview: boolean
  show_problems: boolean
  /** Outline sidebar width (px). */
  layout_outline_width: number
  /** Editor share of main split, 0–1 (width or height depending on split). */
  layout_editor_ratio: number
  /** Problems panel height (px). */
  layout_problems_height: number
}

/** Matches typst-editor egui `set_pixels_per_point` range. */
export const UI_SCALE_MIN = 0.75
export const UI_SCALE_MAX = 2

export function normalizeUiScale(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.ui_scale
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, n))
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'gruvbox',
  ui_scale: 1,
  font_size: 14,
  show_line_numbers: true,
  word_wrap: true,
  vim_mode: true,
  preview_mode: 'tinymist',
  preview_zoom: 1,
  preview_fit: 'fit_width',
  tinymist_partial_rendering: true,
  tinymist_invert_colors: 'auto',
  preview_match_theme: false,
  preview_open_in_browser: false,
  auto_compile: true,
  debounce_ms: 400,
  split: 'editor_left',
  show_toolbar: true,
  show_outline: true,
  show_source: true,
  show_preview: true,
  show_problems: true,
  layout_outline_width: 200,
  layout_editor_ratio: 0.5,
  layout_problems_height: 140
}

export interface OutlineEntry {
  title: string
  level: number
  line: number
  /** 1-based column for preview scroll (from LSP symbol range when available). */
  col?: number
}

export interface DiagnosticItem {
  message: string
  severity: 'error' | 'warning' | 'info' | 'hint'
  line: number
  col: number
  endLine?: number
  endCol?: number
}

export interface JumpInfo {
  filepath: string
  start: [number, number] | null
  end: [number, number] | null
}

/** Tinymist LSP `tinymist.doStartPreview` response (camelCase from server). */
export interface TinymistStartPreviewResponse {
  staticServerAddr?: string
  staticServerPort?: number
  dataPlanePort?: number
  isPrimary?: boolean
}

export interface PreviewResult {
  url: string
  taskId: string
}
