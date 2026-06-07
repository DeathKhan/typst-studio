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
  /** When true, flip document colors on dark editor themes via Tinymist (not the syntax palette). */
  preview_match_theme: boolean
  /** When true, also invert images in the preview (can distort photo colors). */
  preview_invert_images: boolean
  /** Page counter overlay in the preview pane (e.g. 2 / 5). */
  show_preview_page_count: boolean
  preview_open_in_browser: boolean
  auto_compile: boolean
  debounce_ms: number
  split: SplitLayout
  /** Last opened project folder (restored on launch). */
  last_project_root: string | null
  show_outline: boolean
  show_explorer: boolean
  show_source: boolean
  show_preview: boolean
  show_problems: boolean
  /** Outline sidebar width (px). */
  layout_outline_width: number
  /** Project explorer share of sidebar height when outline is also visible (0–1). */
  layout_sidebar_project_ratio: number
  /** Editor share of main split, 0–1 (width or height depending on split). */
  layout_editor_ratio: number
  /** Problems panel height (px). */
  layout_problems_height: number
}

/** Matches typst-editor egui `set_pixels_per_point` range (50%–200%). */
export const UI_SCALE_MIN = 0.5
export const UI_SCALE_MAX = 2

export const UI_SCALE_PRESET_PERCENTS = [50, 75, 100, 125, 150, 175, 200] as const

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
  tinymist_invert_colors: 'never',
  preview_match_theme: false,
  preview_invert_images: false,
  show_preview_page_count: true,
  preview_open_in_browser: false,
  auto_compile: true,
  debounce_ms: 400,
  split: 'editor_left',
  last_project_root: null,
  show_outline: true,
  show_explorer: true,
  show_source: true,
  show_preview: true,
  show_problems: true,
  layout_outline_width: 200,
  layout_sidebar_project_ratio: 0.45,
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

export interface LspPosition {
  line: number
  character: number
}

export interface StudioCompletionItem {
  label: string
  insertText: string
  detail?: string
  type?: string
  range?: {
    start: LspPosition
    end: LspPosition
  }
}

export interface FsEntry {
  name: string
  path: string
  kind: 'file' | 'directory'
}
