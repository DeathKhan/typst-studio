import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { projectRootForFile } from './project-root'

export async function saveClipboardImage(
  projectFile: string,
  png: Buffer
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const root = projectRootForFile(projectFile)
  const assetsDir = join(root, 'assets')
  await mkdir(assetsDir, { recursive: true })
  const filename = `${formatTimestamp(new Date())}.png`
  await writeFile(join(assetsDir, filename), png)
  return { ok: true, path: `assets/${filename}` }
}

function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
