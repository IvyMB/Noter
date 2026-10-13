import { useEffect, useMemo, useState } from 'react'
import { KINDS, type NoteMeta } from '@shared/types'
import { useI18n } from '../i18n'

export type Grouping = 'folder' | 'kind'

interface Props {
  notes: NoteMeta[]
  folders: string[]
  current: string | null
  onOpen(name: string): void
  onNewNote(folder: string): void
  onNewFolder(base: string): void
  onMove(name: string): void
  onChangeKind(name: string, kind: string): void
  onDelete(name: string): void
}

interface TreeNode {
  label: string
  path: string
  groups: TreeNode[]
  notes: NoteMeta[]
}

function buildTree(notes: NoteMeta[], folders: string[], grouping: Grouping, showEmpty: boolean): TreeNode {
  const root: TreeNode = { label: '', path: '', groups: [], notes: [] }
  const find = (path: string): TreeNode => {
    let node = root
    let acc = ''
    for (const part of path.split('/')) {
      acc = acc ? `${acc}/${part}` : part
      let next = node.groups.find((g) => g.path === acc)
      if (!next) {
        next = { label: part, path: acc, groups: [], notes: [] }
        node.groups.push(next)
      }
      node = next
    }
    return node
  }
  if (grouping === 'folder' && showEmpty) folders.forEach((f) => find(f))
  if (grouping === 'kind') KINDS.forEach((k) => notes.some((n) => n.kind === k) && find(k))
  for (const n of notes) {
    const key = grouping === 'kind' ? n.kind : n.folder
    ;(key ? find(key) : root).notes.push(n)
  }
  return root
}

export default function Sidebar(p: Props): React.JSX.Element {
  const { t, kindLabel } = useI18n()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<Set<string> | null>(null)
  const [grouping, setGrouping] = useState<Grouping>('folder')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [menu, setMenu] = useState<{ x: number; y: number; note: string } | null>(null)
  const [selectedFolder, setSelectedFolder] = useState('')

  useEffect(() => {
    if (!query.trim()) return setHits(null)
    const id = setTimeout(() => void window.api.vault.search(query.trim()).then((r) => setHits(new Set(r))), 150)
    return () => clearTimeout(id)
  }, [query, p.notes])

  useEffect(() => {
    const close = (): void => setMenu(null)
    window.addEventListener('click', close)
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('blur', close)
    }
  }, [])

  const tree = useMemo(() => {
    const visible = hits ? p.notes.filter((n) => hits.has(n.name)) : p.notes
    return buildTree(visible, p.folders, grouping, !hits)
  }, [p.notes, p.folders, grouping, hits])

  const toggle = (path: string): void =>
    setCollapsed((s) => {
      const next = new Set(s)
      if (!next.delete(path)) next.add(path)
      return next
    })

  const renderNode = (node: TreeNode, depth: number): React.JSX.Element[] => {
    const rows: React.JSX.Element[] = []
    for (const g of node.groups) {
      const open = !collapsed.has(g.path)
      rows.push(
        <div
          key={`g:${g.path}`}
          className={`tree-row group ${selectedFolder === g.path && grouping === 'folder' ? 'selected-folder' : ''}`}
          style={{ paddingLeft: 8 + depth * 14 }}
          onClick={() => {
            toggle(g.path)
            if (grouping === 'folder') setSelectedFolder(g.path)
          }}
        >
          <span className={`chev ${open ? 'open' : ''}`}>▸</span>
          <span className="label">{grouping === 'kind' ? kindLabel(g.path) : g.label}</span>
        </div>
      )
      if (open) rows.push(...renderNode(g, depth + 1))
    }
    for (const n of node.notes) {
      rows.push(
        <div
          key={`n:${n.name}`}
          className={`tree-row note ${p.current === n.name ? 'active' : ''}`}
          style={{ paddingLeft: 8 + depth * 14 + 14 }}
          onClick={() => p.onOpen(n.name)}
          onContextMenu={(e) => {
            e.preventDefault()
            setMenu({ x: e.clientX, y: e.clientY, note: n.name })
          }}
        >
          <span className="dot" data-kind={n.kind} />
          <span className="label">{n.name}</span>
        </div>
      )
    }
    return rows
  }

  const rows = renderNode(tree, 0)
  const folderForNew = grouping === 'folder' ? selectedFolder : ''

  return (
    <aside className="sidebar">
      <div className="sidebar-actions">
        <button className="btn primary grow" onClick={() => p.onNewNote(folderForNew)}>
          + {t('sidebar.newNote')}
        </button>
        <button className="btn" title={t('sidebar.newFolder')} onClick={() => p.onNewFolder(folderForNew)}>
          + 📁
        </button>
      </div>
      <input
        className="input"
        placeholder={t('sidebar.search')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="segmented">
        <button className={grouping === 'folder' ? 'on' : ''} onClick={() => setGrouping('folder')}>
          {t('sidebar.byFolder')}
        </button>
        <button className={grouping === 'kind' ? 'on' : ''} onClick={() => setGrouping('kind')}>
          {t('sidebar.byKind')}
        </button>
      </div>
      <div className="tree">
        {rows.length ? rows : <div className="muted pad">{t('sidebar.empty')}</div>}
      </div>

      {menu && (
        <div className="context-menu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => (setMenu(null), p.onMove(menu.note))}>{t('ctx.move')}</button>
          <div className="menu-label">{t('ctx.changeKind')}</div>
          {KINDS.map((k) => (
            <button
              key={k}
              className="indent"
              onClick={() => (setMenu(null), p.onChangeKind(menu.note, k))}
            >
              <span className="dot" data-kind={k} /> {kindLabel(k)}
            </button>
          ))}
          <div className="menu-sep" />
          <button className="danger-text" onClick={() => (setMenu(null), p.onDelete(menu.note))}>
            {t('ctx.delete')}
          </button>
        </div>
      )}
    </aside>
  )
}
