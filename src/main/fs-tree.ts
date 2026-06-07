import { readdir } from 'fs/promises'
import { join } from 'path'
import type { FsEntry } from '../shared/types'

const SKIP_DIRS = new Set(['node_modules', '.git', 'target', 'out', 'release', 'dist'])

export async function listDirectory(dirPath: string): Promise<FsEntry[]> {
  const entries = await readdir(dirPath, { withFileTypes: true })
  const items: FsEntry[] = []

  for (const ent of entries) {
    if (ent.name.startsWith('.')) continue
    if (ent.isDirectory() && SKIP_DIRS.has(ent.name)) continue
    items.push({
      name: ent.name,
      path: join(dirPath, ent.name),
      kind: ent.isDirectory() ? 'directory' : 'file'
    })
  }

  items.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })

  return items
}
