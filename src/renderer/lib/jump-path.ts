import { pathsMatch } from './path-match'

/** Normalize Tinymist jump targets (file URI, absolute path, or @ws/… virtual paths). */
export function normalizeJumpPath(filepath: string): string {
  const raw = filepath.trim()
  if (raw.startsWith('file://')) {
    try {
      return decodeURIComponent(raw.replace(/^file:\/\//, ''))
    } catch {
      return raw
    }
  }
  return raw
}

/** Last path segment, ignoring Tinymist workspace prefixes like `@ws/p0:0.0.0/`. */
export function jumpBasename(filepath: string): string {
  const parts = normalizeJumpPath(filepath).split(/[/\\]/)
  const last = parts[parts.length - 1] ?? filepath
  if (last.includes(':') && parts.length > 1) {
    return parts[parts.length - 1] ?? last
  }
  return last
}

/** Whether a preview→source jump targets the document we have open. */
export function shouldAcceptJump(jumpPath: string, openPath: string | null): boolean {
  if (!openPath) return true
  const j = normalizeJumpPath(jumpPath)
  const o = normalizeJumpPath(openPath)
  if (j && pathsMatch(j, o)) return true
  return jumpBasename(jumpPath) === jumpBasename(openPath)
}
