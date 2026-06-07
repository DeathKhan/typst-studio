import { resolve, relative, dirname } from 'path'

let projectRoot: string | null = null

export function getProjectRoot(): string | null {
  return projectRoot
}

export function setProjectRoot(root: string | null): void {
  projectRoot = root ? resolve(root) : null
}

/** Typst `--root` and assets folder for the open file. */
export function projectRootForFile(filePath: string): string {
  const abs = resolve(filePath)
  if (projectRoot) {
    const rel = relative(projectRoot, abs)
    if (!rel.startsWith('..')) return projectRoot
  }
  return dirname(abs)
}
