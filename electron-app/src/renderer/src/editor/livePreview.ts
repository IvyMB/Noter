/**
 * Live markdown: formats while typing and hides the syntax symbols (#, **, `, [[ ]]...)
 * except on the lines holding the cursor. The file stays plain markdown.
 */
import type { Range } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'

const hide = Decoration.replace({})
const markerDim = Decoration.mark({ class: 'cm-md-marker' })

const HEADING_RE = /^(#{1,6})(\s+)/
const QUOTE_RE = /^(\s*>+\s?)/
const LIST_RE = /^(\s*)([-*+]|\d+[.)])(\s+)(\[[ xX]\]\s+)?/
const RULE_RE = /^\s*(---+|\*\*\*+|___+)\s*$/
const FENCE_RE = /^\s*```/

interface Inline {
  re: RegExp
  mark: number // length of the opening/closing delimiters
  cls: string
}
const INLINE: Inline[] = [
  { re: /\*\*(?=\S)(.+?)(?<=\S)\*\*|__(?=\S)(.+?)(?<=\S)__/g, mark: 2, cls: 'cm-md-bold' },
  {
    re: /(?<![*\w])\*(?=[^\s*])(.+?)(?<=[^\s*])\*(?![*\w])|(?<![_\w])_(?=[^\s_])(.+?)(?<=[^\s_])_(?![_\w])/g,
    mark: 1,
    cls: 'cm-md-italic'
  },
  { re: /~~(?=\S)(.+?)(?<=\S)~~/g, mark: 2, cls: 'cm-md-strike' }
]
const CODE_RE = /`([^`]+)`/g
const WIKILINK_RE = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g
const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g

function build(view: EditorView): DecorationSet {
  const { doc, selection } = view.state
  const active = new Set<number>()
  for (const r of selection.ranges) {
    for (let n = doc.lineAt(r.from).number; n <= doc.lineAt(r.to).number; n++) active.add(n)
  }

  const out: Range<Decoration>[] = []
  let inFence = false

  for (let n = 1; n <= doc.lines; n++) {
    const line = doc.line(n)
    const text = line.text
    const isActive = active.has(n)
    const base = line.from

    /** Markdown symbol: hidden, or dimmed on the active line. */
    const marker = (from: number, to: number): void => {
      if (to > from) out.push((isActive ? markerDim : hide).range(base + from, base + to))
    }
    const lineCls = (cls: string): void => {
      out.push(Decoration.line({ class: cls }).range(base))
    }

    if (FENCE_RE.test(text)) {
      lineCls(isActive ? 'cm-code-line' : 'cm-code-line cm-fence-hidden')
      marker(0, text.length)
      inFence = !inFence
      continue
    }
    if (inFence) {
      lineCls('cm-code-line')
      continue
    }
    if (RULE_RE.test(text)) {
      lineCls('cm-hr')
      marker(0, text.length)
      continue
    }

    let start = 0
    let m: RegExpExecArray | null
    if ((m = HEADING_RE.exec(text))) {
      lineCls(`cm-h cm-h${m[1].length}`)
      marker(0, m[0].length)
      start = m[0].length
    } else if ((m = QUOTE_RE.exec(text))) {
      lineCls('cm-quote')
      marker(0, m[0].length)
      start = m[0].length
    } else if ((m = LIST_RE.exec(text))) {
      lineCls('cm-li')
      const markStart = m[1].length
      out.push(Decoration.mark({ class: 'cm-list-marker' }).range(base + markStart, base + markStart + m[2].length))
      if (m[4]) {
        const s = markStart + m[2].length + m[3].length
        out.push(Decoration.mark({ class: 'cm-task' }).range(base + s, base + s + m[4].trimEnd().length))
      }
      start = m[0].length
    }

    // inline code first: whatever is inside it is not formatted again
    const codeSpans: [number, number][] = []
    for (const c of text.matchAll(CODE_RE)) {
      const from = c.index!
      const to = from + c[0].length
      if (from < start) continue
      codeSpans.push([from, to])
      out.push(Decoration.mark({ class: 'cm-md-code' }).range(base + from, base + to))
      marker(from, from + 1)
      marker(to - 1, to)
    }
    const inCode = (pos: number): boolean => codeSpans.some(([a, b]) => pos >= a && pos < b)

    for (const { re, mark, cls } of INLINE) {
      for (const i of text.matchAll(re)) {
        const from = i.index!
        if (from < start || inCode(from)) continue
        const to = from + i[0].length
        out.push(Decoration.mark({ class: cls }).range(base + from, base + to))
        marker(from, from + mark)
        marker(to - mark, to)
      }
    }

    for (const w of text.matchAll(WIKILINK_RE)) {
      const from = w.index!
      if (from < start || inCode(from)) continue
      const to = from + w[0].length
      marker(from, from + 2)
      out.push(
        Decoration.mark({ class: 'cm-wikilink', attributes: { 'data-note': w[1].trim() } }).range(
          base + from + 2,
          base + to - 2
        )
      )
      marker(to - 2, to)
    }

    for (const l of text.matchAll(LINK_RE)) {
      const from = l.index!
      if (from < start || inCode(from) || text[from - 1] === '[') continue
      const textEnd = from + 1 + l[1].length
      marker(from, from + 1)
      out.push(Decoration.mark({ class: 'cm-md-link' }).range(base + from + 1, base + textEnd))
      marker(textEnd, from + l[0].length)
    }
  }

  return Decoration.set(out, true)
}

export function livePreview(onOpenNote: (name: string) => void) {
  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) {
        this.decorations = build(view)
      }
      update(u: ViewUpdate): void {
        if (u.docChanged || u.selectionSet || u.viewportChanged) this.decorations = build(u.view)
      }
    },
    { decorations: (p) => p.decorations }
  )

  // Ctrl/Cmd + click on [[Note]] opens the note
  const click = EditorView.domEventHandlers({
    mousedown(e) {
      const el = (e.target as HTMLElement).closest<HTMLElement>('.cm-wikilink')
      if (el && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        onOpenNote(el.dataset.note ?? '')
        return true
      }
      return false
    }
  })

  return [plugin, click]
}
