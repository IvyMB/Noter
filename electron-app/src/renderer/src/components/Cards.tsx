import { useMemo, useState } from 'react'
import { KINDS, type NoteMeta } from '@shared/types'
import { useI18n } from '../i18n'

type Sort = 'recent' | 'name'
type Direction = 'any' | 'out' | 'in'

interface Props {
  notes: NoteMeta[]
  current: string | null
  onOpen(name: string): void
}

interface Connection {
  name: string
  dir: 'out' | 'in'
  exists: boolean
  kind?: string
}

const MAX_CHIPS = 4

export default function Cards({ notes, current, onOpen }: Props): React.JSX.Element {
  const { t, kindLabel, lang } = useI18n()
  const [kind, setKind] = useState<string | null>(null)
  const [sort, setSort] = useState<Sort>('recent')
  const [hovered, setHovered] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [folder, setFolder] = useState('')
  const [focusText, setFocusText] = useState('') // "connected to" note, as typed
  const [direction, setDirection] = useState<Direction>('any')
  const [depth, setDepth] = useState(1)

  // only offer filters for kinds that actually have notes
  const kinds = useMemo(() => KINDS.filter((k) => notes.some((n) => n.kind === k)), [notes])

  // name -> connections (outgoing links first, then notes that link here)
  const connections = useMemo(() => {
    const byName = new Map(notes.map((n) => [n.name, n]))
    const map = new Map<string, Connection[]>(notes.map((n) => [n.name, []]))
    for (const n of notes) {
      for (const target of n.links) {
        if (target === n.name) continue
        const t = byName.get(target)
        map.get(n.name)!.push({ name: target, dir: 'out', exists: !!t, kind: t?.kind })
        map.get(target)?.push({ name: n.name, dir: 'in', exists: true, kind: n.kind })
      }
    }
    for (const list of map.values()) list.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir === 'out' ? -1 : 1))
    return map
  }, [notes])

  const folders = useMemo(() => [...new Set(notes.map((n) => n.folder).filter(Boolean))].sort(), [notes])
  const focus = notes.some((n) => n.name === focusText) ? focusText : ''

  // notes reachable from the focus note within `depth` hops, following the chosen direction
  const reachable = useMemo(() => {
    if (!focus) return null
    const seen = new Set([focus])
    let frontier = [focus]
    for (let hop = 0; hop < depth; hop++) {
      const next: string[] = []
      for (const name of frontier) {
        for (const c of connections.get(name) ?? []) {
          if (!c.exists || seen.has(c.name)) continue
          if (direction !== 'any' && c.dir !== direction) continue
          seen.add(c.name)
          next.push(c.name)
        }
      }
      frontier = next
    }
    return seen
  }, [focus, depth, direction, connections])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = notes.filter(
      (n) =>
        (!kind || n.kind === kind) &&
        (!folder || n.folder === folder) &&
        (!reachable || reachable.has(n.name)) &&
        (!q || n.name.toLowerCase().includes(q) || n.excerpt.toLowerCase().includes(q))
    )
    return list.sort((a, b) => (sort === 'recent' ? b.mtime - a.mtime : a.name.localeCompare(b.name)))
  }, [notes, kind, folder, query, reachable, sort])

  const filtered = !!(kind || folder || query.trim() || focus)
  const clearFilters = (): void => {
    setKind(null)
    setFolder('')
    setQuery('')
    setFocusText('')
    setDirection('any')
    setDepth(1)
  }

  // notes related to the hovered card (itself + its connections), used to highlight the graph neighborhood
  const related = useMemo(() => {
    if (!hovered) return null
    return new Set([hovered, ...(connections.get(hovered) ?? []).map((c) => c.name)])
  }, [hovered, connections])

  const fmt = (ms: number): string =>
    new Date(ms).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="cards-view">
      <div className="cards-toolbar">
        <button className={`filter-chip ${kind === null ? 'on' : ''}`} onClick={() => setKind(null)}>
          {t('cards.all')} · {notes.length}
        </button>
        {kinds.map((k) => (
          <button
            key={k}
            className={`filter-chip ${kind === k ? 'on' : ''}`}
            onClick={() => setKind(kind === k ? null : k)}
          >
            <span className="dot" data-kind={k} />
            {kindLabel(k)}
          </button>
        ))}
        <div className="spacer" />
        <span className="muted">{t('cards.sort')}</span>
        <div className="segmented small">
          {(['recent', 'name'] as Sort[]).map((s) => (
            <button key={s} className={sort === s ? 'on' : ''} onClick={() => setSort(s)}>
              {t(`cards.${s}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="cards-filters">
        <input
          className="input"
          placeholder={t('cards.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="input" value={folder} onChange={(e) => setFolder(e.target.value)}>
          <option value="">{t('cards.allFolders')}</option>
          {folders.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <div className="connected-filter">
          <span className="muted">{t('cards.connectedTo')}</span>
          <input
            className="input"
            list="cards-note-list"
            placeholder={t('cards.pickNote')}
            value={focusText}
            onChange={(e) => setFocusText(e.target.value)}
          />
          <datalist id="cards-note-list">
            {notes.map((n) => (
              <option key={n.name} value={n.name} />
            ))}
          </datalist>
          {focus && (
            <>
              <div className="segmented small">
                {(['any', 'out', 'in'] as Direction[]).map((d) => (
                  <button key={d} className={direction === d ? 'on' : ''} onClick={() => setDirection(d)}>
                    {t(`cards.dir.${d}`)}
                  </button>
                ))}
              </div>
              <div className="segmented small" title={t('cards.depth')}>
                {[1, 2, 3].map((d) => (
                  <button key={d} className={depth === d ? 'on' : ''} onClick={() => setDepth(d)}>
                    {d}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {filtered && (
          <>
            <span className="muted">{t('cards.showing', { n: String(shown.length), total: String(notes.length) })}</span>
            <button className="btn ghost" onClick={clearFilters}>
              ✕ {t('cards.clear')}
            </button>
          </>
        )}
      </div>

      {shown.length ? (
        <div className="cards-grid" onMouseLeave={() => setHovered(null)}>
          {shown.map((n) => {
            const conns = connections.get(n.name) ?? []
            const visible = conns.slice(0, MAX_CHIPS)
            const state = related ? (related.has(n.name) ? (hovered === n.name ? 'self' : 'related') : 'dim') : ''
            return (
              <div
                key={n.name}
                role="button"
                tabIndex={0}
                className={`card ${current === n.name ? 'active' : ''} ${state}`}
                data-kind={n.kind}
                onClick={() => onOpen(n.name)}
                onKeyDown={(e) => e.key === 'Enter' && onOpen(n.name)}
                onMouseEnter={() => setHovered(n.name)}
              >
                <div className="card-meta">
                  <span className="dot" data-kind={n.kind} />
                  {kindLabel(n.kind)}
                  {n.folder && <span>· {n.folder}</span>}
                  <div className="spacer" />
                  <button
                    className="card-action"
                    title={t('cards.showConnected')}
                    onClick={(e) => {
                      e.stopPropagation()
                      setFocusText(n.name)
                    }}
                  >
                    🔗
                  </button>
                </div>
                <div className="card-title">{n.name}</div>
                <div className="card-excerpt">{n.excerpt || t('cards.noExcerpt')}</div>

                {conns.length > 0 && (
                  <div className="card-links">
                    {visible.map((c) => (
                      <button
                        key={`${c.dir}:${c.name}`}
                        className={`conn ${c.exists ? '' : 'missing'}`}
                        title={t(c.dir === 'out' ? 'cards.linksTo' : 'cards.linkedFrom', { name: c.name })}
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpen(c.name)
                        }}
                      >
                        <span className="arrow">{c.dir === 'out' ? '→' : '←'}</span>
                        {c.kind ? <span className="dot" data-kind={c.kind} /> : null}
                        {c.name}
                      </button>
                    ))}
                    {conns.length > visible.length && <span className="muted">+{conns.length - visible.length}</span>}
                  </div>
                )}

                <div className="card-foot">
                  <span>{fmt(n.mtime)}</span>
                  {conns.length > 0 && <span>{t('cards.connections', { n: String(conns.length) })}</span>}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty">{t('sidebar.empty')}</div>
      )}
    </div>
  )
}
