/** Note format: markdown with optional frontmatter (`type: ...`) and [[Note]] links. */
import { DEFAULT_KIND, type NoteData } from './types'

const FRONT_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/
const KIND_LINE_RE = /^(?:type|tipo):\s*(.+?)\s*$/m // `tipo` is the legacy (Portuguese) key
const KIND_KEY_RE = /^(?:type|tipo):/

// Portuguese kind names written by older versions -> canonical names
const LEGACY_KINDS: Record<string, string> = {
  Nota: 'Note',
  Ideia: 'Idea',
  Projeto: 'Project',
  Tarefa: 'Task',
  Reunião: 'Meeting',
  Diário: 'Journal',
  Referência: 'Reference'
}
const LINK_RE = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g

export function parseNote(text: string): Pick<NoteData, 'kind' | 'extra' | 'body'> {
  const m = FRONT_RE.exec(text)
  if (!m) return { kind: DEFAULT_KIND, extra: '', body: text }
  const front = m[1]
  const raw = KIND_LINE_RE.exec(front)?.[1] ?? DEFAULT_KIND
  const kind = LEGACY_KINDS[raw] ?? raw
  const extra = front
    .split(/\r?\n/)
    .filter((l) => !KIND_KEY_RE.test(l))
    .join('\n')
  return { kind, extra, body: text.slice(m[0].length) }
}

export function serializeNote(n: Pick<NoteData, 'kind' | 'extra' | 'body'>): string {
  const lines = [...(n.kind !== DEFAULT_KIND ? [`type: ${n.kind}`] : []), ...(n.extra ? [n.extra] : [])]
  return lines.length ? `---\n${lines.join('\n')}\n---\n${n.body}` : n.body
}

/** Plain-text preview of a note body: markdown symbols stripped, first heading dropped. */
export function makeExcerpt(body: string, max = 200): string {
  const text = body
    .replace(/^\s*#[ \t][^\r\n]*(\r?\n)?/, '') // the first heading usually repeats the title
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>+|[-*+]|\d+[.)])\s+/gm, '')
    .replace(/(\*\*|__|~~|[*_`])/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
}

export function extractLinks(text: string): string[] {
  return [...new Set([...text.matchAll(LINK_RE)].map((m) => m[1].trim()))]
}
