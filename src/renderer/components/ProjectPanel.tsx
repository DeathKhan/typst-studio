import { useCallback, useEffect, useState } from 'react'
import type { FsEntry } from '../../shared/types'

export interface ProjectPanelProps {
  projectRoot: string | null
  activeFile: string | null
  onOpenFolder: () => void
  onOpenFile: (path: string) => void
}

export function ProjectPanel({
  projectRoot,
  activeFile,
  onOpenFolder,
  onOpenFile
}: ProjectPanelProps): React.ReactElement {
  const rootLabel = projectRoot?.split('/').filter(Boolean).pop() ?? null

  return (
    <div className="project-panel">
      <div className="pane-header project-header">
        <span>Project</span>
        <button type="button" className="btn-sm" onClick={onOpenFolder} title="Open folder">
          Open…
        </button>
      </div>
      <div className="project-tree">
        {!projectRoot ? (
          <p className="muted project-empty">Open a folder to browse project files.</p>
        ) : (
          <>
            <div className="project-root-label" title={projectRoot}>
              {rootLabel}
            </div>
            <TreeDirectory
              path={projectRoot}
              depth={0}
              activeFile={activeFile}
              onOpenFile={onOpenFile}
            />
          </>
        )}
      </div>
    </div>
  )
}

interface TreeDirectoryProps {
  path: string
  depth: number
  activeFile: string | null
  onOpenFile: (path: string) => void
}

function TreeDirectory({
  path,
  depth,
  activeFile,
  onOpenFile
}: TreeDirectoryProps): React.ReactElement {
  const [entries, setEntries] = useState<FsEntry[]>([])
  const [expanded, setExpanded] = useState(depth === 0)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    const items = await window.typstStudio.listDirectory(path)
    setEntries(items)
    setLoaded(true)
  }, [path])

  useEffect(() => {
    if (expanded && !loaded) void load()
  }, [expanded, loaded, load])

  useEffect(() => {
    setLoaded(false)
    setEntries([])
    if (depth === 0) setExpanded(true)
  }, [path, depth])

  useEffect(() => {
    const unsub = window.typstStudio.onProjectRootChanged((root) => {
      if (root === path && depth === 0) {
        setLoaded(false)
        setExpanded(true)
      }
    })
    return unsub
  }, [path, depth])

  if (depth > 0) {
    return (
      <>
        {entries.map((entry) => (
          <TreeEntry
            key={entry.path}
            entry={entry}
            depth={depth}
            activeFile={activeFile}
            onOpenFile={onOpenFile}
          />
        ))}
      </>
    )
  }

  return (
    <>
      {entries.map((entry) => (
        <TreeEntry
          key={entry.path}
          entry={entry}
          depth={depth}
          activeFile={activeFile}
          onOpenFile={onOpenFile}
        />
      ))}
    </>
  )
}

interface TreeEntryProps {
  entry: FsEntry
  depth: number
  activeFile: string | null
  onOpenFile: (path: string) => void
}

function TreeEntry({ entry, depth, activeFile, onOpenFile }: TreeEntryProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false)
  const isDir = entry.kind === 'directory'
  const isTyp = entry.name.endsWith('.typ')
  const pad = 8 + depth * 14

  if (isDir) {
    return (
      <div className="project-node">
        <button
          type="button"
          className="project-row project-dir"
          style={{ paddingLeft: pad }}
          onClick={() => setExpanded((e) => !e)}
        >
          <span className="project-chevron">{expanded ? '▾' : '▸'}</span>
          {entry.name}
        </button>
        {expanded && (
          <TreeDirectory
            path={entry.path}
            depth={depth + 1}
            activeFile={activeFile}
            onOpenFile={onOpenFile}
          />
        )}
      </div>
    )
  }

  if (!isTyp && !/\.(bib|png|jpg|jpeg|gif|svg|webp|pdf)$/i.test(entry.name)) {
    return (
      <button
        type="button"
        className="project-row project-file project-file-muted"
        style={{ paddingLeft: pad + 14 }}
        title={entry.path}
        onClick={() => onOpenFile(entry.path)}
      >
        {entry.name}
      </button>
    )
  }

  return (
    <button
      type="button"
      className={`project-row project-file${activeFile === entry.path ? ' selected' : ''}`}
      style={{ paddingLeft: pad + 14 }}
      title={entry.path}
      onClick={() => onOpenFile(entry.path)}
    >
      {entry.name}
    </button>
  )
}
