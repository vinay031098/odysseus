import { useMemo, useState } from 'react'
import type { AgentSkill, BuiltinAgentCapability } from '@/api/types'
import { AgentCard } from './AgentCard'
import {
  computeDuplicateMeta,
  mergeSkillWithPatch,
  skillConfidencePercent,
  skillNecessityKind,
} from '@/lib/skillHelpers'

export type SkillSortKey = 'confidence' | 'uses' | 'recent' | 'name'
export type SkillFilterKey = 'all' | 'drafts' | 'published' | 'conf70' | 'conf80' | 'conf90'

interface AgentListProps {
  skills: AgentSkill[]
  builtin: BuiltinAgentCapability[]
  selectedId: string | null
  onSelect: (id: string, kind: 'skill' | 'builtin') => void
  selectMode?: boolean
  selectedNames?: Set<string>
  onToggleSkill?: (name: string, checked: boolean) => void
  activeAuditSkill?: string | null
  skillPatches?: Record<string, Partial<AgentSkill>>
  liveVerdicts?: Record<string, string>
  onPublishSkill?: (name: string, published: boolean) => void
  onEditSkill?: (name: string) => void
  onTestSkill?: (name: string) => void
  onAuditSkill?: (name: string) => void
  onDeleteSkill?: (name: string) => void
  onEnterSelectForSkill?: (name: string) => void
}

function matchesSearch(sk: AgentSkill, query: string): boolean {
  const q = query.toLowerCase()
  return (
    (sk.name || '').toLowerCase().includes(q) ||
    (sk.description || '').toLowerCase().includes(q) ||
    (sk.when_to_use || '').toLowerCase().includes(q) ||
    (sk.category || '').toLowerCase().includes(q) ||
    (sk.tags || []).some((t) => (t || '').toLowerCase().includes(q))
  )
}

function sortSkills(list: AgentSkill[], sort: SkillSortKey): AgentSkill[] {
  const arr = list.slice()
  if (sort === 'confidence') {
    arr.sort(
      (a, b) =>
        (b.confidence || 0) - (a.confidence || 0) || (a.name || '').localeCompare(b.name || ''),
    )
  } else if (sort === 'uses') {
    arr.sort(
      (a, b) => (b.uses || 0) - (a.uses || 0) || (a.name || '').localeCompare(b.name || ''),
    )
  } else if (sort === 'recent') {
    arr.sort(
      (a, b) =>
        (b.updated_at || b.created_at || 0) - (a.updated_at || a.created_at || 0) ||
        (a.name || '').localeCompare(b.name || ''),
    )
  } else {
    arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }
  return arr
}

function filterSkills(list: AgentSkill[], filter: SkillFilterKey): AgentSkill[] {
  if (filter === 'drafts') {
    return list.filter((sk) => (sk.status || 'draft') !== 'published')
  }
  if (filter === 'published') {
    return list.filter((sk) => sk.status === 'published')
  }
  if (filter.startsWith('conf')) {
    const max = parseInt(filter.slice(4), 10)
    if (Number.isFinite(max)) {
      return list.filter((sk) => skillConfidencePercent(sk) <= max)
    }
  }
  return list
}

export function AgentList({
  skills,
  builtin,
  selectedId,
  onSelect,
  selectMode,
  selectedNames,
  onToggleSkill,
  activeAuditSkill,
  skillPatches = {},
  liveVerdicts = {},
  onPublishSkill,
  onEditSkill,
  onTestSkill,
  onAuditSkill,
  onDeleteSkill,
  onEnterSelectForSkill,
}: AgentListProps) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SkillSortKey>('confidence')
  const [filter, setFilter] = useState<SkillFilterKey>('all')

  const filteredSkills = useMemo(() => {
    let list = skills
    if (search.trim()) list = list.filter((sk) => matchesSearch(sk, search.trim()))
    list = filterSkills(list, filter)
    return sortSkills(list, sort)
  }, [skills, search, sort, filter])

  const duplicateMeta = useMemo(() => computeDuplicateMeta(filteredSkills), [filteredSkills])

  if (skills.length === 0 && builtin.length === 0) {
    return (
      <p className="p-4 text-sm text-muted">
        No agent skills found. Skills are learned over time or imported below.
      </p>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-border px-3 py-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search skills…"
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
          aria-label="Search skills"
        />
        <div className="flex gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SkillSortKey)}
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
            aria-label="Sort skills"
          >
            <option value="confidence">Sort: confidence</option>
            <option value="uses">Sort: uses</option>
            <option value="recent">Sort: recent</option>
            <option value="name">Sort: name</option>
          </select>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as SkillFilterKey)}
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
            aria-label="Filter skills"
          >
            <option value="all">Filter: all</option>
            <option value="drafts">Drafts</option>
            <option value="published">Published</option>
            <option value="conf90">Confidence ≤ 90%</option>
            <option value="conf80">Confidence ≤ 80%</option>
            <option value="conf70">Confidence ≤ 70%</option>
          </select>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {filteredSkills.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-muted">No skills match your filters.</p>
        ) : (
          filteredSkills.map((raw) => {
            const skill = mergeSkillWithPatch(raw, skillPatches[raw.name])
            const dm = duplicateMeta.get(raw.name) ?? null
            const necessityDup = dm && !dm.keep
            const patched =
              necessityDup && skillNecessityKind(skill) !== 'duplicate'
                ? {
                    ...skill,
                    necessity: {
                      necessary: false,
                      reason: `Duplicate group #${dm.group}`,
                      redundant_with: dm.names.filter((n) => n !== raw.name),
                    },
                  }
                : skill
            return (
              <AgentCard
                key={raw.name}
                skill={patched}
                kind="skill"
                selected={selectedId === raw.name}
                onSelect={() => onSelect(raw.name, 'skill')}
                selectMode={selectMode}
                checked={selectedNames?.has(raw.name)}
                onCheckChange={(checked) => onToggleSkill?.(raw.name, checked)}
                auditActive={activeAuditSkill === raw.name}
                duplicateMeta={dm}
                liveVerdict={liveVerdicts[raw.name] ?? null}
                onPublish={() =>
                  onPublishSkill?.(raw.name, (skill.status ?? 'draft') === 'published')
                }
                onEdit={() => onEditSkill?.(raw.name)}
                onTest={() => onTestSkill?.(raw.name)}
                onAudit={() => onAuditSkill?.(raw.name)}
                onDelete={() => onDeleteSkill?.(raw.name)}
                onSelectMode={() => onEnterSelectForSkill?.(raw.name)}
              />
            )
          })
        )}

        {builtin.length > 0 ? (
          <div className="pt-3">
            <div className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Built-in tools
            </div>
            <div className="space-y-2">
              {builtin.map((cap) => (
                <AgentCard
                  key={cap.name}
                  skill={cap}
                  kind="builtin"
                  selected={selectedId === cap.name}
                  onSelect={() => onSelect(cap.name, 'builtin')}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
