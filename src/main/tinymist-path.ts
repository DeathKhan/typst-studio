import { existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

export function resolveTinymistBinary(): string {
  const bundled = join(
    process.resourcesPath,
    'bin',
    process.platform === 'win32' ? 'tinymist.exe' : 'tinymist'
  )
  if (existsSync(bundled)) {
    return bundled
  }

  const devBundled = join(app.getAppPath(), 'resources', 'bin', 'tinymist')
  if (existsSync(devBundled)) {
    return devBundled
  }

  return process.platform === 'win32' ? 'tinymist.exe' : 'tinymist'
}
