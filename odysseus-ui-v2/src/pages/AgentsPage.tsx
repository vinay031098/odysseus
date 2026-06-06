import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchUserPrefs } from '@/api/settings'
import type { AgentSkill } from '@/api/types'
import { AgentDetail } from '@/features/agents/AgentDetail'
import { AgentList } from '@/features/agents/AgentList'
import { SkillAuditConfirmDialog } from '@/features/agents/SkillAuditConfirmDialog'
import { SkillAuditPanel } from '@/features/agents/SkillAuditPanel'
import { SkillBulkBar } from '@/features/agents/SkillBulkBar'
import { SkillImportPanel } from '@/features/agents/SkillImportPanel'
import { Button } from '@/components/ui/button'
import {
  agentsQueryKey,
  useAgentMutations,
  useAgents,
  useSkillAuditStatus,
} from '@/hooks/useAgents'
import {
  isNonPassingSkill,
  parseSkillApprovalThreshold,
} from '@/lib/skillHelpers'

type AuditConfirmState = { label: string; names: string[] } | null
type PendingDetailAction = { skillId: string; action: 'edit' | 'test' } | null

export function AgentsPage() {
  const qc = useQueryClient()
  const { data, isLoading, isError } = useAgents()
  const { startAudit, cancelAudit, bulkDelete, bulkPublish, setStatus, remove } = useAgentMutations()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedKind, setSelectedKind] = useState<'skill' | 'builtin' | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedNames, setSelectedNames] = useState<Set<string>>(() => new Set())
  const [auditPanelVisible, setAuditPanelVisible] = useState(false)
  const [auditConfirm, setAuditConfirm] = useState<AuditConfirmState>(null)
  const [skillPatches, setSkillPatches] = useState<Record<string, Partial<AgentSkill>>>({})
  const [liveVerdicts, setLiveVerdicts] = useState<Record<string, string>>({})
  const [pendingDetailAction, setPendingDetailAction] = useState<PendingDetailAction>(null)
  const auditSeenRef = useRef(0)

  const skills = useMemo(() => data?.skills ?? [], [data?.skills])
  const builtin = useMemo(() => data?.builtin ?? [], [data?.builtin])

  const auditQuery = useSkillAuditStatus(true)
  const auditStatus = auditQuery.data
  const auditRunning = auditStatus?.status === 'running'

  const prefsQuery = useQuery({
    queryKey: ['prefs'],
    queryFn: fetchUserPrefs,
    staleTime: 60_000,
  })
  const approvalThreshold = parseSkillApprovalThreshold(prefsQuery.data)

  useEffect(() => {
    if (auditRunning) setAuditPanelVisible(true)
  }, [auditRunning])

  useEffect(() => {
    if (auditStatus?.status === 'done' || auditStatus?.status === 'cancelled') {
      void qc.invalidateQueries({ queryKey: agentsQueryKey })
      auditSeenRef.current = 0
    }
  }, [auditStatus?.status, qc])

  useEffect(() => {
    const results = auditStatus?.results ?? []
    if (results.length <= auditSeenRef.current) return
    for (const r of results.slice(auditSeenRef.current)) {
      const name = r.skill
      if (!name) continue
      const state = r.skill_state
      if (state) {
        setSkillPatches((prev) => ({ ...prev, [name]: { ...prev[name], ...state } }))
      }
      const verdict = state?.audit_verdict || r.verdict?.verdict
      if (verdict) {
        setLiveVerdicts((prev) => ({ ...prev, [name]: verdict }))
      }
    }
    auditSeenRef.current = results.length
  }, [auditStatus?.results])

  const handleSelect = (id: string, kind: 'skill' | 'builtin') => {
    setSelectedId(id)
    setSelectedKind(kind)
  }

  const exitSelectMode = useCallback(() => {
    setSelectMode(false)
    setSelectedNames(new Set())
  }, [])

  const toggleSkillSelection = useCallback((name: string, checked: boolean) => {
    setSelectedNames((prev) => {
      const next = new Set(prev)
      if (checked) next.add(name)
      else next.delete(name)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedNames(() => {
        if (!checked) return new Set()
        return new Set(skills.map((s) => s.name))
      })
    },
    [skills],
  )

  const selectedNonPassing = useMemo(() => {
    const selected = selectedNames
    return skills.filter((sk) => selected.has(sk.name) && isNonPassingSkill(sk, approvalThreshold))
  }, [skills, selectedNames, approvalThreshold])

  const anyDraftSelected = useMemo(
    () =>
      [...selectedNames].some((name) => {
        const sk = skills.find((s) => s.name === name)
        return sk && (sk.status ?? 'draft') !== 'published'
      }),
    [selectedNames, skills],
  )

  const requestAudit = useCallback(
    (names: string[], label: string) => {
      if (!names.length) return
      setAuditConfirm({ label, names })
    },
    [],
  )

  const confirmAudit = useCallback(
    async (skipAudited: boolean) => {
      if (!auditConfirm) return
      const { names } = auditConfirm
      setAuditConfirm(null)
      setAuditPanelVisible(true)

      if (auditStatus?.status === 'running') return

      await startAudit.mutateAsync({
        scope: 'selected',
        names,
        skip_audited: skipAudited,
      })
    },
    [auditConfirm, auditStatus?.status, startAudit],
  )

  const handleAuditAll = () => {
    const names = skills.map((s) => s.name)
    const label = `${names.length} visible skill${names.length === 1 ? '' : 's'}`
    requestAudit(names, label)
  }

  const handleBulkAudit = async () => {
    const ordered = skills.map((s) => s.name).filter((n) => selectedNames.has(n))
    exitSelectMode()
    requestAudit(
      ordered,
      `${ordered.length} selected skill${ordered.length === 1 ? '' : 's'}`,
    )
  }

  const handleBulkDelete = async () => {
    const names = [...selectedNames]
    if (!names.length) return
    if (
      !window.confirm(
        `Delete ${names.length} skill${names.length === 1 ? '' : 's'}? This removes their SKILL.md files.`,
      )
    ) {
      return
    }
    await bulkDelete.mutateAsync(names)
    if (selectedId && names.includes(selectedId)) {
      setSelectedId(null)
      setSelectedKind(null)
    }
    exitSelectMode()
  }

  const handleBulkDeleteNonPassing = async () => {
    const targets = selectedNonPassing
    if (!targets.length) return
    const thresholdPct = Math.round(approvalThreshold * 100)
    const names = targets.map((sk) => sk.name)
    if (
      !window.confirm(
        `Delete ${names.length} selected non-passing skill${names.length === 1 ? '' : 's'}? This removes duplicates, generic/irrelevant skills, failed audits, and anything below ${thresholdPct}%.`,
      )
    ) {
      return
    }
    await bulkDelete.mutateAsync(names)
    if (selectedId && names.includes(selectedId)) {
      setSelectedId(null)
      setSelectedKind(null)
    }
    exitSelectMode()
  }

  const handleBulkPublish = async () => {
    const names = [...selectedNames].filter((name) => {
      const sk = skills.find((s) => s.name === name)
      return sk && sk.status !== 'published'
    })
    if (!names.length) return
    await bulkPublish.mutateAsync(names)
    exitSelectMode()
  }

  const handlePublishSkill = useCallback(
    async (name: string, currentlyPublished: boolean) => {
      await setStatus.mutateAsync({
        id: name,
        status: currentlyPublished ? 'draft' : 'published',
      })
    },
    [setStatus],
  )

  const handleDeleteSkill = useCallback(
    async (name: string) => {
      if (!window.confirm(`Delete skill "${name}"? This removes the SKILL.md.`)) return
      await remove.mutateAsync(name)
      if (selectedId === name) {
        setSelectedId(null)
        setSelectedKind(null)
      }
    },
    [remove, selectedId],
  )

  const handleAuditSkill = useCallback(
    (name: string) => {
      requestAudit([name], '1 selected skill')
    },
    [requestAudit],
  )

  const handleEnterSelectForSkill = useCallback((name: string) => {
    setSelectMode(true)
    setSelectedNames(new Set([name]))
  }, [])

  const summary = useMemo(() => {
    if (!data) return null
    return `${skills.length} skill${skills.length === 1 ? '' : 's'}, ${builtin.length} built-in`
  }, [data, skills.length, builtin.length])

  const bulkBusy =
    bulkDelete.isPending ||
    bulkPublish.isPending ||
    startAudit.isPending ||
    setStatus.isPending

  if (isLoading) {
    return <PageState message="Loading agents…" />
  }
  if (isError) {
    return <PageState message="Could not load agent skills." error />
  }

  return (
    <div className="flex h-full min-h-[480px]">
      <div className="flex w-full max-w-sm shrink-0 flex-col border-r border-border">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-sm font-semibold">Agents & skills</h1>
              {summary ? <p className="mt-1 text-xs text-muted">{summary}</p> : null}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => void handleAuditAll()}
                disabled={!skills.length || auditRunning}
              >
                Audit
              </Button>
              <Button
                type="button"
                size="sm"
                variant={selectMode ? 'default' : 'outline'}
                className="h-7 px-2 text-xs"
                onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
              >
                {selectMode ? 'Cancel' : 'Select'}
              </Button>
            </div>
          </div>
        </div>

        {auditPanelVisible && auditStatus && auditStatus.status !== 'none' ? (
          <div className="border-b border-border px-3 py-2">
            <SkillAuditPanel
              status={auditStatus}
              onCancel={() => void cancelAudit.mutateAsync()}
              onClose={() => setAuditPanelVisible(false)}
              cancelling={cancelAudit.isPending}
            />
          </div>
        ) : null}

        {selectMode ? (
          <SkillBulkBar
            selectedCount={selectedNames.size}
            visibleCount={skills.length}
            allSelected={skills.length > 0 && skills.every((s) => selectedNames.has(s.name))}
            onToggleAll={toggleSelectAll}
            onAudit={() => void handleBulkAudit()}
            onPublish={() => void handleBulkPublish()}
            onDelete={() => void handleBulkDelete()}
            onDeleteNonPassing={() => void handleBulkDeleteNonPassing()}
            onCancel={exitSelectMode}
            nonPassingCount={selectedNonPassing.length}
            anyDraftSelected={anyDraftSelected}
            busy={bulkBusy}
          />
        ) : null}

        <SkillImportPanel
          onImported={(name) => {
            setSelectedId(name)
            setSelectedKind('skill')
          }}
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AgentList
            skills={skills}
            builtin={builtin}
            selectedId={selectedId}
            onSelect={handleSelect}
            selectMode={selectMode}
            selectedNames={selectedNames}
            onToggleSkill={toggleSkillSelection}
            activeAuditSkill={auditRunning ? (auditStatus?.current ?? null) : null}
            skillPatches={skillPatches}
            liveVerdicts={liveVerdicts}
            onPublishSkill={(name, pub) => void handlePublishSkill(name, pub)}
            onEditSkill={(name) => {
              setSelectedId(name)
              setSelectedKind('skill')
              setPendingDetailAction({ skillId: name, action: 'edit' })
            }}
            onTestSkill={(name) => {
              setSelectedId(name)
              setSelectedKind('skill')
              setPendingDetailAction({ skillId: name, action: 'test' })
            }}
            onAuditSkill={handleAuditSkill}
            onDeleteSkill={(name) => void handleDeleteSkill(name)}
            onEnterSelectForSkill={handleEnterSelectForSkill}
          />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <AgentDetail
          skillId={selectedId}
          kind={selectedKind}
          pendingAction={pendingDetailAction}
          onPendingActionDone={() => setPendingDetailAction(null)}
          onDeleted={() => {
            setSelectedId(null)
            setSelectedKind(null)
          }}
        />
      </div>

      {auditConfirm ? (
        <SkillAuditConfirmDialog
          label={auditConfirm.label}
          onConfirm={(skip) => void confirmAudit(skip)}
          onCancel={() => setAuditConfirm(null)}
        />
      ) : null}
    </div>
  )
}

function PageState({ message, error }: { message: string; error?: boolean }) {
  return (
    <div
      className={`flex h-full items-center justify-center p-6 text-sm ${error ? 'text-destructive' : 'text-muted'}`}
    >
      {message}
    </div>
  )
}
