export function lineColToIndex(text: string, line: number, col: number): number {
  const lines = text.split('\n')
  const ln = Math.max(1, Math.min(line, lines.length))
  const lineStart = lines.slice(0, ln - 1).join('\n').length + (ln > 1 ? 1 : 0)
  const lineText = lines[ln - 1] ?? ''
  const c = Math.max(1, Math.min(col, lineText.length + 1))
  return lineStart + c - 1
}

export function indexToLineCol(text: string, index: number): { line: number; col: number } {
  const i = Math.max(0, Math.min(index, text.length))
  const before = text.slice(0, i)
  const line = before.split('\n').length
  const lastNl = before.lastIndexOf('\n')
  const col = i - (lastNl + 1) + 1
  return { line, col }
}
