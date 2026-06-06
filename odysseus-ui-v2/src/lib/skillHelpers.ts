import type { AgentSkill } from '@/api/types'

export function skillConfidencePercent(skill: AgentSkill): number {
  return Math.round((skill.confidence ?? 0) * 100)
}

/** Hue 120→0 over 90→50% confidence (matches legacy skills.js). */
export function skillConfidenceColor(conf: number): string {
  const hue = Math.max(0, Math.min(120, ((conf - 50) / 40) * 120))
  return `hsl(${Math.round(hue)}, 70%, 42%)`
}

export type NecessityKind = 'duplicate' | 'trivial' | 'irrelevant' | null

export function skillNecessityKind(skill: AgentSkill): NecessityKind {
  const nec = skill.necessity
  if (!nec || nec.necessary !== false) return null
  const reason = String(nec.reason ?? '').toLowerCase()
  const redundant = (nec.redundant_with ?? []).filter(Boolean)
  if (
    redundant.length ||
    /duplicat|redundan|overlap|same skill|same procedure/.test(reason)
  ) {
    return 'duplicate'
  }
  if (/trivial|generic|capable assistant|without a saved|not need|unnecessary/.test(reason)) {
    return 'trivial'
  }
  return 'irrelevant'
}

export function isNonPassingSkill(skill: AgentSkill, approvalThreshold: number): boolean {
  const necessity = skillNecessityKind(skill)
  if (necessity === 'duplicate' || necessity === 'trivial' || necessity === 'irrelevant') {
    return true
  }
  if ((skill.audit_verdict ?? '') !== 'pass') return true
  return Number(skill.confidence ?? 0) < approvalThreshold
}

export function parseSkillApprovalThreshold(prefs: Record<string, unknown> | undefined): number {
  const raw = prefs?.skill_min_confidence ?? prefs?.skill_autosave_min_confidence
  const val = Number(raw)
  if (!Number.isFinite(val)) return 0.85
  return Math.max(0, Math.min(1, val))
}

export interface SkillDuplicateMeta {
  group: number
  keep: boolean
  keepName: string
  names: string[]
}

function skillTokens(sk: AgentSkill): Set<string> {
  return new Set(
    String([sk.name || '', sk.description || '', sk.when_to_use || '', ...(sk.tags || [])].join(' '))
      .toLowerCase()
      .replace(/-\d+\b/g, '')
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !['the', 'and', 'with', 'for', 'from', 'using'].includes(t)),
  )
}

function skillSimilarity(a: AgentSkill, b: AgentSkill): number {
  const A = skillTokens(a)
  const B = skillTokens(b)
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const t of A) if (B.has(t)) inter++
  return inter / (A.size + B.size - inter)
}

function baseSkillName(name: string): string {
  return String(name || '').replace(/-\d+$/, '')
}

function scoreDuplicateKeeper(sk: AgentSkill): number {
  return [
    sk.status === 'published' ? 100000 : 0,
    (sk.uses || 0) * 100,
    Math.round((sk.confidence || 0) * 100),
    sk.audit_by_teacher ? -5 : 0,
    -String(sk.name || '').length / 1000,
  ].reduce((a, b) => a + b, 0)
}

/** Detect duplicate/overlap groups among skills (legacy skills.js parity). */
export function computeDuplicateMeta(list: AgentSkill[]): Map<string, SkillDuplicateMeta> {
  const parent = new Map<string, string>()
  const names = list.map((s) => s.name).filter(Boolean)
  names.forEach((n) => parent.set(n, n))
  const find = (x: string) => {
    let p = parent.get(x) || x
    while (p !== parent.get(p)) p = parent.get(p) || p
    return p
  }
  const unite = (a: string, b: string) => {
    const pa = find(a)
    const pb = find(b)
    if (pa !== pb) parent.set(pb, pa)
  }
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]
      const b = list[j]
      if (!a.name || !b.name) continue
      if (baseSkillName(a.name) === baseSkillName(b.name) || skillSimilarity(a, b) >= 0.38) {
        unite(a.name, b.name)
      }
    }
  }
  const groups = new Map<string, AgentSkill[]>()
  for (const sk of list) {
    if (!sk.name) continue
    const root = find(sk.name)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root)!.push(sk)
  }
  const meta = new Map<string, SkillDuplicateMeta>()
  let idx = 1
  for (const group of groups.values()) {
    if (group.length < 2) continue
    const sorted = group.slice().sort((a, b) => scoreDuplicateKeeper(b) - scoreDuplicateKeeper(a))
    const keep = sorted[0].name
    const groupNames = sorted.map((s) => s.name).filter(Boolean)
    for (const sk of sorted) {
      if (!sk.name) continue
      meta.set(sk.name, {
        group: idx,
        keep: sk.name === keep,
        keepName: keep,
        names: groupNames,
      })
    }
    idx++
  }
  return meta
}

export function mergeSkillWithPatch(skill: AgentSkill, patch?: Partial<AgentSkill>): AgentSkill {
  if (!patch) return skill
  return { ...skill, ...patch, name: skill.name }
}
