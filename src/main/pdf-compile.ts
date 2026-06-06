import { spawn } from 'child_process'
import { mkdir, readFile } from 'fs/promises'
import { dirname, join } from 'path'
import { tmpdir } from 'os'

export async function compileTypstToPdf(
  sourcePath: string,
  projectRoot: string
): Promise<{ ok: boolean; pdfPath?: string; error?: string }> {
  const outDir = join(tmpdir(), 'typst-studio-preview')
  await mkdir(outDir, { recursive: true })
  const pdfPath = join(outDir, 'preview.pdf')

  return new Promise((resolve) => {
    const proc = spawn(
      'typst',
      ['compile', '--format', 'pdf', '--root', projectRoot, sourcePath, pdfPath],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    )
    let stderr = ''
    proc.stderr.on('data', (d) => {
      stderr += d.toString()
    })
    proc.on('close', async (code) => {
      if (code === 0) {
        try {
          await readFile(pdfPath)
          resolve({ ok: true, pdfPath })
        } catch {
          resolve({ ok: false, error: 'PDF not produced' })
        }
      } else {
        resolve({ ok: false, error: stderr.trim() || `typst exited ${code}` })
      }
    })
    proc.on('error', (e) => {
      resolve({ ok: false, error: e.message })
    })
  })
}

export function projectRootFor(filePath: string): string {
  return dirname(filePath)
}
