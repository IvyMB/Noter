import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, type Simulation } from 'd3-force'
import { useEffect, useRef } from 'react'
import { KINDS, type NoteMeta } from '@shared/types'
import { useI18n } from '../i18n'

interface GNode {
  id: string
  kind: string | null // null = link to a note that does not exist
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}
interface GLink {
  source: string | GNode
  target: string | GNode
}

const R = 8

function colors(): { edge: string; text: string; missing: string; kinds: Record<string, string> } {
  const cs = getComputedStyle(document.documentElement)
  const v = (name: string): string => cs.getPropertyValue(name).trim()
  return {
    edge: v('--graph-edge'),
    text: v('--text'),
    missing: v('--graph-missing'),
    kinds: Object.fromEntries(KINDS.map((k, i) => [k, v(`--k${i}`)]))
  }
}

export default function Graph({
  notes,
  theme,
  onOpen
}: {
  notes: NoteMeta[]
  theme: string
  onOpen(name: string): void
}): React.JSX.Element {
  const { t } = useI18n()
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const draw = useRef<() => void>(() => {})
  const onOpenRef = useRef(onOpen)
  onOpenRef.current = onOpen

  useEffect(() => {
    const cv = canvas.current!
    const ctx = cv.getContext('2d')!
    const view = { x: 0, y: 0, k: 1, w: 0, h: 0 }

    const known = new Map<string, GNode>(notes.map((n) => [n.name, { id: n.name, kind: n.kind }]))
    const links: GLink[] = []
    for (const n of notes) {
      for (const target of n.links) {
        if (!known.has(target)) known.set(target, { id: target, kind: null })
        links.push({ source: n.name, target })
      }
    }
    const nodes = [...known.values()]

    const sim: Simulation<GNode, GLink> = forceSimulation(nodes)
      .force('link', forceLink<GNode, GLink>(links).id((d) => d.id).distance(90))
      .force('charge', forceManyBody().strength(-170))
      .force('center', forceCenter(0, 0))
      .force('collide', forceCollide(R + 6))

    const render = (): void => {
      const c = colors()
      const dpr = window.devicePixelRatio || 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, view.w, view.h)
      ctx.translate(view.w / 2 + view.x, view.h / 2 + view.y)
      ctx.scale(view.k, view.k)
      ctx.lineWidth = 1.2 / view.k
      ctx.strokeStyle = c.edge
      ctx.beginPath()
      for (const l of links) {
        const s = l.source as GNode
        const tg = l.target as GNode
        ctx.moveTo(s.x ?? 0, s.y ?? 0)
        ctx.lineTo(tg.x ?? 0, tg.y ?? 0)
      }
      ctx.stroke()
      ctx.font = `${12 / Math.max(view.k, 0.6)}px system-ui, sans-serif`
      ctx.textBaseline = 'middle'
      for (const n of nodes) {
        ctx.fillStyle = n.kind ? (c.kinds[n.kind] ?? c.kinds[KINDS[0]]) : c.missing
        ctx.beginPath()
        ctx.arc(n.x ?? 0, n.y ?? 0, R, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = c.text
        ctx.fillText(n.id, (n.x ?? 0) + R + 4, n.y ?? 0)
      }
    }
    draw.current = render
    sim.on('tick', render)

    const resize = (): void => {
      const r = box.current!.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      view.w = r.width
      view.h = r.height
      cv.width = r.width * dpr
      cv.height = r.height * dpr
      render()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(box.current!)
    resize()

    const world = (e: { clientX: number; clientY: number }): { x: number; y: number } => {
      const r = cv.getBoundingClientRect()
      return {
        x: (e.clientX - r.left - view.w / 2 - view.x) / view.k,
        y: (e.clientY - r.top - view.h / 2 - view.y) / view.k
      }
    }
    const hit = (e: { clientX: number; clientY: number }): GNode | undefined => {
      const p = world(e)
      return nodes.find((n) => Math.hypot((n.x ?? 0) - p.x, (n.y ?? 0) - p.y) <= R + 4)
    }

    let dragging: GNode | null = null
    let panning: { x: number; y: number } | null = null
    const down = (e: PointerEvent): void => {
      cv.setPointerCapture(e.pointerId)
      const n = hit(e)
      if (n) {
        dragging = n
        sim.alphaTarget(0.3).restart()
      } else panning = { x: e.clientX - view.x, y: e.clientY - view.y }
    }
    const move = (e: PointerEvent): void => {
      if (dragging) {
        const p = world(e)
        dragging.fx = p.x
        dragging.fy = p.y
      } else if (panning) {
        view.x = e.clientX - panning.x
        view.y = e.clientY - panning.y
        render()
      } else cv.style.cursor = hit(e) ? 'pointer' : 'grab'
    }
    const up = (): void => {
      if (dragging) {
        dragging.fx = dragging.fy = null
        sim.alphaTarget(0)
      }
      dragging = null
      panning = null
    }
    const wheel = (e: WheelEvent): void => {
      e.preventDefault()
      const before = world(e)
      view.k = Math.min(4, Math.max(0.2, view.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12)))
      const r = cv.getBoundingClientRect()
      view.x = e.clientX - r.left - view.w / 2 - before.x * view.k
      view.y = e.clientY - r.top - view.h / 2 - before.y * view.k
      render()
    }
    const dbl = (e: MouseEvent): void => {
      const n = hit(e)
      if (n) onOpenRef.current(n.id)
    }

    cv.addEventListener('pointerdown', down)
    cv.addEventListener('pointermove', move)
    cv.addEventListener('pointerup', up)
    cv.addEventListener('wheel', wheel, { passive: false })
    cv.addEventListener('dblclick', dbl)
    return () => {
      sim.stop()
      ro.disconnect()
      cv.removeEventListener('pointerdown', down)
      cv.removeEventListener('pointermove', move)
      cv.removeEventListener('pointerup', up)
      cv.removeEventListener('wheel', wheel)
      cv.removeEventListener('dblclick', dbl)
    }
  }, [notes])

  // theme change: just redraw with the new colors
  useEffect(() => draw.current(), [theme])

  return (
    <div className="graph" ref={box}>
      <canvas ref={canvas} />
      <div className="graph-hint">{t('graph.hint')}</div>
    </div>
  )
}
