import { useCallback, useRef } from 'react'
import { Check } from 'lucide-react'
import type { AgentSkill, BuiltinAgentCapability } from '@/api/types'
import {
  AgentCardMenu,
  TeacherMarkInline,
  VerdictCheckedPill,
} from '@/features/agents/AgentCardMenu'
import {
  menuIconDelete,
  menuIconEdit,
  menuIconPublish,
  menuIconTest,
} from '@/features/agents/agentCardMenuIcons'
import {
  skillConfidenceColor,
  skillConfidencePercent,
  skillNecessityKind,
  type SkillDuplicateMeta,
} from '@/lib/skillHelpers'
import { cn } from '@/lib/utils'

interface AgentCardProps {
  skill: AgentSkill | BuiltinAgentCapability
  kind: 'skill' | 'builtin'
  selected?: boolean
  onSelect?: () => void
  selectMode?: boolean
  checked?: boolean
  onCheckChange?: (checked: boolean) => void
  auditActive?: boolean
  duplicateMeta?: SkillDuplicateMeta | null
  onPublish?: () => void
  onEdit?: () => void
  onTest?: () => void
  onAudit?: () => void
  onDelete?: () => void
  onSelectMode?: () => void
  liveVerdict?: string | null
}

function StatusPill({ status }: { status?: string }) {
  const s = status ?? 'draft'
  if (s === 'published') {
    return (
      <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-success/20 text-success">
        published
      </span>
    )
  }
  if (s === 'draft') {
    return (
      <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-foreground/10 text-muted">
        draft
      </span>
    )
  }
  return (
    <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide opacity-60">
      {s}
    </span>
  )
}

function SourcePill({ skill }: { skill: AgentSkill }) {
  if (skill.source !== 'teacher-escalation') return null
  const teacher = skill.teacher_model ?? 'teacher'
  return (
    <span
      className="shrink-0 rounded px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300"
      title={`Created by teacher escalation: ${teacher}`}
    >
      teacher-created
    </span>
  )
}

function AuditModelPills({ skill }: { skill: AgentSkill }) {
  const pills: { key: string; label: string; title: string; className: string }[] = []
  if (skill.audit_worker_model) {
    pills.push({
      key: 'audit',
      label: 'audit',
      title: `Last audited by default audit model: ${skill.audit_worker_model}`,
      className: 'bg-foreground/10 text-muted',
    })
  }
  if (skill.audit_by_teacher || skill.audit_teacher_model) {
    const teacher = skill.audit_teacher_model
    pills.push({
      key: 'teacher-fixed',
      label: 'teacher-fixed',
      title: teacher
        ? `Teacher rewrote this skill; audit model passed after the rewrite. Teacher: ${teacher}`
        : 'Teacher rewrote this skill; audit model passed after the rewrite.',
      className: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
    })
  }
  if (!pills.length) return null
  return (
    <>
      {pills.map((p) => (
        <span
          key={p.key}
          className={cn('max-w-[90px] shrink-0 truncate rounded px-1.5 py-0.5 text-[10px]', p.className)}
          title={p.title}
        >
          {p.label}
        </span>
      ))}
    </>
  )
}

function DuplicatePills({ meta }: { meta: SkillDuplicateMeta }) {
  if (meta.keep) {
    return (
      <span
        className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary"
        title="Best duplicate candidate by published status, uses, confidence, and specificity"
      >
        recommended
      </span>
    )
  }
  return (
    <>
      <span
        className="shrink-0 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] text-destructive"
        title={`Duplicate group #${meta.group}. Recommended keep: ${meta.keepName}. Group: ${meta.names.join(', ')}`}
      >
        duplicate #{meta.group}
      </span>
      <span
        className="shrink-0 rounded bg-foreground/10 px-1.5 py-0.5 text-[10px] text-muted"
        title={`Lower-priority duplicate. Suggested keeper: ${meta.keepName}`}
      >
        lower-priority
      </span>
    </>
  )
}

function NecessityPill({ skill, duplicateGroup }: { skill: AgentSkill; duplicateGroup?: number }) {
  const kind = duplicateGroup ? 'duplicate' : skillNecessityKind(skill)
  if (!kind) return null
  const nec = skill.necessity ?? {}
  const dup = (nec.redundant_with ?? []).filter(Boolean)
  const label =
    kind === 'duplicate'
      ? duplicateGroup
        ? `duplicate #${duplicateGroup}`
        : 'duplicate'
      : kind === 'trivial'
        ? 'generic'
        : 'possibly-irrelevant'
  const why = duplicateGroup
    ? `Duplicate group #${duplicateGroup}`
    : (nec.reason ?? 'May not be worth keeping') + (dup.length ? ` | overlaps: ${dup.join(', ')}` : '')
  return (
    <span
      className={cn(
        'shrink-0 rounded px-1.5 py-0.5 text-[10px]',
        kind === 'duplicate' && 'bg-destructive/15 text-destructive',
        kind === 'trivial' && 'bg-foreground/10 text-muted',
        kind === 'irrelevant' && 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
      )}
      title={why}
    >
      {label}
    </span>
  )
}

function AuditMarks({ skill }: { skill: AgentSkill }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {skill.audit_verdict === 'pass' ? (
        <span className="text-success" title="Passed an automated test">
          <Check className="size-3" strokeWidth={3} aria-hidden />
        </span>
      ) : null}
      {skill.audit_by_teacher ? (
        <TeacherMarkInline teacher={skill.audit_teacher_model} />
      ) : null}
    </span>
  )
}

export function AgentCard({
  skill,
  kind,
  selected,
  onSelect,
  selectMode,
  checked,
  onCheckChange,
  auditActive,
  duplicateMeta,
  onPublish,
  onEdit,
  onTest,
  onAudit,
  onDelete,
  onSelectMode,
  liveVerdict,
}: AgentCardProps) {
  const name = skill.name
  const description =
    'description' in skill && skill.description
      ? skill.description
      : 'when_to_use' in skill
        ? skill.when_to_use
        : undefined
  const category = 'category' in skill ? skill.category : undefined
  const status = 'status' in skill ? skill.status : undefined
  const isOverridden =
    kind === 'builtin' &&
    Boolean((skill as BuiltinAgentCapability).is_overridden ?? (skill as BuiltinAgentCapability).overridden)

  const agentSkill = kind === 'skill' ? (skill as AgentSkill) : null
  const conf = agentSkill ? skillConfidencePercent(agentSkill) : null
  const uses = agentSkill?.uses ?? 0
  const isPublished = (status ?? 'draft') === 'published'

  const holdRef = useRef<number | null>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const suppressClickRef = useRef(false)

  const cancelHold = useCallback(() => {
    if (holdRef.current) {
      window.clearTimeout(holdRef.current)
      holdRef.current = null
    }
    startRef.current = null
  }, [])

  function handleClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (selectMode && onCheckChange) {
      onCheckChange(!checked)
      return
    }
    onSelect?.()
  }

  const menuActions =
    kind === 'skill'
      ? [
          {
            key: 'publish',
            label: isPublished ? 'Unpublish' : 'Publish',
            icon: menuIconPublish(isPublished),
            onClick: () => onPublish?.(),
          },
          { key: 'edit', label: 'Edit', icon: menuIconEdit(), onClick: () => onEdit?.() },
          { key: 'test', label: 'Test', icon: menuIconTest(), onClick: () => onTest?.() },
          { key: 'audit', label: 'Audit', icon: menuIconTest(), onClick: () => onAudit?.() },
          {
            key: 'select',
            label: 'Select',
            onClick: () => onSelectMode?.(),
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: menuIconDelete(),
            danger: true,
            onClick: () => onDelete?.(),
          },
        ]
      : []

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      onPointerDown={(e) => {
        if (kind !== 'skill') return
        if ((e.target as HTMLElement).closest('button, input')) return
        startRef.current = { x: e.clientX, y: e.clientY }
        holdRef.current = window.setTimeout(() => {
          holdRef.current = null
          suppressClickRef.current = true
          window.setTimeout(() => {
            suppressClickRef.current = false
          }, 400)
          if (navigator.vibrate) {
            try {
              navigator.vibrate(15)
            } catch {
              /* ignore */
            }
          }
          const btn = (e.currentTarget as HTMLElement).querySelector<HTMLButtonElement>(
            '[aria-label="Actions"]',
          )
          btn?.click()
        }, 500)
      }}
      onPointerMove={(e) => {
        if (!startRef.current) return
        if (Math.hypot(e.clientX - startRef.current.x, e.clientY - startRef.current.y) > 10) {
          cancelHold()
        }
      }}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      className={cn(
        'w-full rounded-lg border border-border bg-panel p-3 text-left transition-colors cursor-pointer',
        'hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        selected && !selectMode && 'border-primary ring-1 ring-primary/30',
        auditActive && 'border-primary/60 ring-2 ring-primary/40 animate-pulse',
        checked && selectMode && 'border-primary/50 bg-primary/5',
      )}
    >
      <div className="flex items-start gap-2">
        {selectMode ? (
          <input
            type="checkbox"
            checked={!!checked}
            onChange={(e) => {
              e.stopPropagation()
              onCheckChange?.(e.target.checked)
            }}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 shrink-0 cursor-pointer"
            aria-label={`Select ${name}`}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{name}</div>
              {category ? (
                <div className="mt-0.5 text-xs capitalize text-muted">{category}</div>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
              {kind === 'builtin' ? (
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide',
                    'bg-primary/15 text-primary',
                  )}
                >
                  {isOverridden ? 'Edited' : 'Built-in'}
                </span>
              ) : (
                <>
                  {liveVerdict ? <VerdictCheckedPill verdict={liveVerdict} /> : null}
                  <StatusPill status={status} />
                  {agentSkill ? <SourcePill skill={agentSkill} /> : null}
                  {agentSkill ? <AuditModelPills skill={agentSkill} /> : null}
                  {agentSkill ? (
                    <NecessityPill skill={agentSkill} duplicateGroup={duplicateMeta?.group} />
                  ) : null}
                  {duplicateMeta ? <DuplicatePills meta={duplicateMeta} /> : null}
                </>
              )}
              {kind === 'skill' ? <AgentCardMenu actions={menuActions} /> : null}
            </div>
          </div>

          {agentSkill && conf != null ? (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted">
              <AuditMarks skill={agentSkill} />
              <span style={{ color: skillConfidenceColor(conf) }}>{conf}%</span>
              <span>· {uses}u</span>
            </div>
          ) : null}

          {description ? (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
