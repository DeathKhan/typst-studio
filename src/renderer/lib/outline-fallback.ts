import type { OutlineEntry } from '../../shared/types'

export function parseOutline(source: string): OutlineEntry[] {
  const entries: OutlineEntry[] = []
  const lines = source.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1
    const line = lines[i]
    const h = parseMarkdownHeading(lineNum, line)
    if (h) {
      entries.push(h)
      continue
    }
    const c = parseSectionComment(lineNum, line)
    if (c) entries.push(c)
  }
  return entries
}

function parseMarkdownHeading(lineNum: number, line: string): OutlineEntry | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('=')) return null
  let level = 0
  for (const c of trimmed) {
    if (c === '=') level++
    else break
  }
  if (level < 1 || level > 6) return null
  const rest = trimmed.slice(level).trimStart()
  if (!rest) return null
  const title = stripLabel(rest)
  if (!title) return null
  return { title, level, line: lineNum, col: headingPreviewCol(line) }
}

/** 1-based column Tinymist accepts on a heading line for preview scroll. */
export function headingPreviewCol(line: string): number {
  const trimmed = line.trimStart()
  if (!trimmed.startsWith('=')) return 1
  let i = line.length - trimmed.length
  while (i < line.length && line[i] === '=') i++
  while (i < line.length && line[i] === ' ') i++
  return Math.min(i + 2, line.length + 1)
}

/** Column to use when jumping from the outline (LSP col or heading heuristic). */
export function resolveOutlineJumpCol(source: string, line: number, col?: number): number {
  const lineText = source.split('\n')[line - 1] ?? ''
  if (lineText.trimStart().startsWith('=')) {
    const minCol = headingPreviewCol(lineText)
    if (col == null || col < minCol) return minCol
    return col
  }
  return col != null && col >= 1 ? col : 1
}

function parseSectionComment(lineNum: number, line: string): OutlineEntry | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('//')) return null
  const inner = trimmed.slice(2).trim()
  if (!inner.startsWith('---')) return null
  const title = inner.replace(/^-+|-+$/g, '').trim()
  if (!title) return null
  return { title, level: 2, line: lineNum }
}

function stripLabel(s: string): string {
  const t = s.trim()
  const lt = t.lastIndexOf('<')
  if (lt >= 0 && t.endsWith('>')) {
    const c = t.slice(0, lt).trim()
    if (c) return c
  }
  return t
}
