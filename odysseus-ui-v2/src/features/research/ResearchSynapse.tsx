import { useEffect, useMemo, useRef, useState } from 'react'
import type { ResearchProgress } from '@/api/types'
import './researchSynapse.css'

const PHASE_LABEL: Record<string, string> = {
  probing: 'verifying model',
  planning: 'planning strategy',
  searching: 'searching',
  reading: 'reading sources',
  analyzing: 'analyzing findings',
  writing: 'writing report',
  error: 'error',
  done: 'complete',
}

const W = 520
const H = 220

function trunc(s: string, n: number) {
  const t = String(s).replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
}

function rand(a: number, b: number) {
  return Math.random() * (b - a) + a
}

interface SubNode {
  x: number
  y: number
  count: number
  label?: string
}

interface SynapseEdge {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  firing: boolean
}

interface SynapseNode {
  id: string
  cx: number
  cy: number
  r: number
  kind: 'root' | 'sub' | 'leaf'
  label?: string
  labelAnchor?: 'start' | 'middle' | 'end'
  isNew?: boolean
}

interface ResearchSynapseProps {
  query: string
  progress?: ResearchProgress | null
  startedAt: number
  status: 'running' | 'done' | 'error' | 'cancelled'
  compact?: boolean
}

export function ResearchSynapse({
  query,
  progress,
  startedAt,
  status,
  compact = true,
}: ResearchSynapseProps) {
  const cx = W / 2
  const cy = H / 2
  const subsRef = useRef<SubNode[]>([])
  const lastRoundRef = useRef(0)
  const sourceCountRef = useRef(0)
  const [edges, setEdges] = useState<SynapseEdge[]>([])
  const [nodes, setNodes] = useState<SynapseNode[]>([
    { id: 'root', cx, cy, r: 11, kind: 'root' },
  ])
  const [statusText, setStatusText] = useState('starting…')
  const [round, setRound] = useState(0)
  const [sourceCount, setSourceCount] = useState(0)
  const [elapsed, setElapsed] = useState('00:00')
  const completed = status === 'done' || status === 'error' || status === 'cancelled'

  const rootLabel = useMemo(() => trunc(query || 'query', 28), [query])

  useEffect(() => {
    if (completed) return
    const tick = () => {
      const sec = Math.floor((Date.now() - startedAt) / 1000)
      setElapsed(
        `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`,
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt, completed])

  const pushEdge = (x1: number, y1: number, x2: number, y2: number) => {
    const id = `e-${Date.now()}-${Math.random()}`
    setEdges((prev) => [...prev, { id, x1, y1, x2, y2, firing: true }])
    setTimeout(() => {
      setEdges((prev) => prev.map((e) => (e.id === id ? { ...e, firing: false } : e)))
    }, 1100)
  }

  const addSub = (label?: string) => {
    if (subsRef.current.length >= 10) return
    const slot = subsRef.current.length
    const totalSlots = Math.max(6, subsRef.current.length + 1)
    const angle = (slot / totalSlots) * Math.PI * 2 - Math.PI / 2
    const r = 78
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    pushEdge(cx, cy, x, y)
    const subId = `sub-${slot}`
    const lx = cx + Math.cos(angle) * (r + 14)
    const ly = cy + Math.sin(angle) * (r + 14)
    const labelAnchor =
      Math.cos(angle) > 0.15 ? 'start' : Math.cos(angle) < -0.15 ? 'end' : 'middle'
    setNodes((prev) => [
      ...prev,
      {
        id: subId,
        cx: x,
        cy: y,
        r: 7,
        kind: 'sub',
        isNew: true,
        label: label ? trunc(label, 14) : undefined,
        labelAnchor,
      },
    ])
    if (label) {
      setNodes((prev) => [
        ...prev,
        {
          id: `${subId}-label`,
          cx: lx,
          cy: ly + 3,
          r: 0,
          kind: 'sub',
          label: trunc(label, 14),
          labelAnchor,
        },
      ])
    }
    subsRef.current.push({ x, y, count: 0, label })
  }

  const addLeaf = () => {
    if (!subsRef.current.length) addSub('')
    const sub = subsRef.current[subsRef.current.length - 1]
    sub.count++
    const baseAngle = Math.atan2(sub.y - cy, sub.x - cx)
    const idx = sub.count - 1
    const perRing = 6
    const ring = Math.floor(idx / perRing)
    const slot = idx % perRing
    const arcSpan = 2.4
    const angle =
      baseAngle + (slot - (perRing - 1) / 2) * (arcSpan / perRing) + rand(-0.05, 0.05)
    const r = 26 + ring * 14 + rand(-1.5, 1.5)
    const lx = sub.x + Math.cos(angle) * r
    const ly = sub.y + Math.sin(angle) * r
    pushEdge(sub.x, sub.y, lx, ly)
    setNodes((prev) => [
      ...prev,
      { id: `leaf-${Date.now()}-${Math.random()}`, cx: lx, cy: ly, r: 4, kind: 'leaf', isNew: true },
    ])
  }

  useEffect(() => {
    if (completed || !progress) return
    const phase = progress.phase ?? ''
    let txt = PHASE_LABEL[phase] ?? phase ?? ''
    if (phase === 'searching' && progress.queries) txt += ` · ${progress.queries} queries`
    else if (phase === 'reading' && progress.total_sources != null) {
      txt = `reading: ${trunc(String(progress.total_sources), 32)} sources`
    } else if (phase === 'analyzing' && progress.total_findings) {
      txt += ` · ${progress.total_findings} findings`
    }
    setStatusText(txt)

    const r = progress.round
    if (typeof r === 'number' && r >= 1 && r > lastRoundRef.current) {
      for (let i = lastRoundRef.current; i < r && subsRef.current.length < 10; i++) {
        addSub(`R${i + 1}`)
      }
      lastRoundRef.current = r
      setRound(r)
    }

    const total = progress.total_sources
    if (typeof total === 'number' && total > sourceCountRef.current) {
      const delta = Math.min(total - sourceCountRef.current, 6)
      for (let i = 0; i < delta; i++) {
        setTimeout(addLeaf, i * 110)
      }
      sourceCountRef.current = total
      setSourceCount(total)
    }
  }, [progress, completed]) // eslint-disable-line react-hooks/exhaustive-deps -- graph mutators

  useEffect(() => {
    if (status === 'done') setStatusText('complete')
    if (status === 'error') setStatusText('error')
    if (status === 'cancelled') setStatusText('cancelled')
  }, [status])

  const wrapClass = [
    'research-synapse',
    compact ? 'research-synapse-compact' : '',
    status === 'done' ? 'rs-complete' : '',
    status === 'error' ? 'rs-error' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={wrapClass}>
      <div className="rs-stage">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          <g className="rs-edges">
            {edges.map((e) => (
              <line
                key={e.id}
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                className={e.firing ? 'rs-edge rs-edge-firing' : 'rs-edge'}
              />
            ))}
          </g>
          <g className="rs-nodes">
            {nodes
              .filter((n) => n.r > 0)
              .map((n) => (
                <circle
                  key={n.id}
                  cx={n.cx}
                  cy={n.cy}
                  r={n.r}
                  className={`rs-node rs-node-${n.kind}${n.isNew ? ' rs-node-new' : ''}`}
                />
              ))}
            <text x={cx} y={cy + 28} textAnchor="middle" className="rs-label">
              {rootLabel}
            </text>
            {nodes
              .filter((n) => n.label && n.id.includes('label'))
              .map((n) => (
                <text
                  key={n.id}
                  x={n.cx}
                  y={n.cy}
                  textAnchor={n.labelAnchor ?? 'middle'}
                  className="rs-label rs-label-sub"
                >
                  {n.label}
                </text>
              ))}
          </g>
          <circle className="rs-pulse" cx={cx} cy={cy} r={6} />
        </svg>
      </div>
      <div className="rs-meta">
        <span className="rs-status">{statusText}</span>
        <span className="rs-sep">·</span>
        <span className="rs-round">
          round <b>{round}</b>
        </span>
        <span className="rs-sep">·</span>
        <span className="rs-sources">
          <b>{sourceCount}</b> sources
        </span>
        <span className="rs-sep">·</span>
        <span className="rs-timer">{elapsed}</span>
      </div>
    </div>
  )
}
