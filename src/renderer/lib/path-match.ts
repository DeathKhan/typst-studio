/** Compare filesystem paths from Tinymist jumps vs the open document. */
export function pathsMatch(a: string, b: string): boolean {
  const norm = (p: string): string => p.replace(/\\/g, '/').replace(/\/+$/, '')
  const na = norm(a)
  const nb = norm(b)
  if (na === nb) return true
  const sa = na.split('/')
  const sb = nb.split('/')
  return sa.length > 0 && sb.length > 0 && sa[sa.length - 1] === sb[sb.length - 1]
}
