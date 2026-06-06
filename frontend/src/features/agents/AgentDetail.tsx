import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSkill } from '@/api/agents'
import { MarkdownMessage } from '@/components/chat/MarkdownMessage'
import { Button } from '@/components/ui/button'
import {
  useAgentMarkdown,
  useAgentMutations,
  useBuiltinSkill,
  useSkillTestStatus,
} from '@/hooks/useAgents'
import { SkillTestPanel } from './SkillTestPanel'

interface AgentDetailProps {
  skillId: string | null
  kind: 'skill' | 'builtin' | null
  onDeleted?: () => void
  pendingAction?: { skillId: string; action: 'edit' | 'test' } | null
  onPendingActionDone?: () => void
}

export function AgentDetail({ skillId, kind, onDeleted, pendingAction, onPendingActionDone }: AgentDetailProps) {
  if (!skillId) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted">
        Select an agent skill to view details.
      </div>
    )
  }

  if (kind === 'builtin') {
    return <BuiltinDetail name={skillId} />
  }

  return <SkillDetail skillId={skillId} onDeleted={onDeleted} pendingAction={pendingAction} onPendingActionDone={onPendingActionDone} />
}

function SkillDetail({
  skillId,
  onDeleted,
  pendingAction,
  onPendingActionDone,
}: {
  skillId: string
  onDeleted?: () => void
  pendingAction?: { skillId: string; action: 'edit' | 'test' } | null
  onPendingActionDone?: () => void
}) {
  const { data, isLoading, isError } = useAgentMarkdown(skillId)
  const skillMeta = useQuery({
    queryKey: ['agents', 'skill', skillId],
    queryFn: () => fetchSkill(skillId),
  })
  const { saveMarkdown, setStatus, remove, runTest } = useAgentMutations()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [testPolling, setTestPolling] = useState(false)
  const testQuery = useSkillTestStatus(skillId, testPolling)

  useEffect(() => {
    if (data?.markdown != null) setDraft(data.markdown)
  }, [data?.markdown])

  useEffect(() => {
    if (testQuery.data?.status === 'running') setTestPolling(true)
    if (testQuery.data?.status === 'done' || testQuery.data?.status === 'none') {
      setTestPolling(false)
    }
  }, [testQuery.data?.status])

  useEffect(() => {
    if (!pendingAction || pendingAction.skillId !== skillId) return
    if (pendingAction.action === 'edit') {
      setEditing(true)
      onPendingActionDone?.()
    } else if (pendingAction.action === 'test') {
      void runTest.mutateAsync({ id: skillId })
      setTestPolling(true)
      onPendingActionDone?.()
    }
  }, [pendingAction, skillId, runTest, onPendingActionDone])

  if (isLoading) {
    return <div className="p-6 text-sm text-muted">Loading skill…</div>
  }

  if (isError || !data?.markdown) {
    return <div className="p-6 text-sm text-destructive">Could not load skill source.</div>
  }

  const isPublished = skillMeta.data?.status === 'published'

  async function handleSave() {
    await saveMarkdown.mutateAsync({ id: skillId, markdown: draft })
    setEditing(false)
  }

  async function handleDelete() {
    if (!window.confirm(`Delete skill "${skillId}"? This removes the SKILL.md.`)) return
    await remove.mutateAsync(skillId)
    onDeleted?.()
  }

  async function handleTogglePublish() {
    await setStatus.mutateAsync({
      id: skillId,
      status: isPublished ? 'draft' : 'published',
    })
  }

  async function startTest() {
    setTestPolling(true)
    await runTest.mutateAsync({ id: skillId })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-4">
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">{data.name}</h2>
        <Button type="button" size="sm" variant="outline" onClick={() => void handleTogglePublish()}>
          {isPublished ? 'Unpublish' : 'Publish'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? 'Preview' : 'Edit'}
        </Button>
        {editing ? (
          <Button
            type="button"
            size="sm"
            onClick={() => void handleSave()}
            disabled={saveMarkdown.isPending}
          >
            Save
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={() => void handleDelete()}
          disabled={remove.isPending}
        >
          Delete
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-4">
        <SkillTestPanel
          status={testQuery.data}
          isStarting={runTest.isPending}
          onStart={() => void startTest()}
          onRetry={() => void startTest()}
        />

        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="min-h-[360px] w-full resize-y rounded-lg border border-border bg-background p-4 font-mono text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
        ) : (
          <MarkdownMessage content={data.markdown} />
        )}
      </div>
    </div>
  )
}

function BuiltinDetail({ name }: { name: string }) {
  const { data, isLoading, isError } = useBuiltinSkill(name)
  const { saveBuiltin, revertBuiltin } = useAgentMutations()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (data?.text != null) setDraft(data.text)
  }, [data?.text])

  if (isLoading) {
    return <div className="p-6 text-sm text-muted">Loading built-in capability…</div>
  }

  if (isError || !data) {
    return <div className="p-6 text-sm text-destructive">Could not load built-in tool.</div>
  }

  async function handleSave() {
    await saveBuiltin.mutateAsync({ name, text: draft })
    setEditing(false)
  }

  async function handleRevert() {
    if (
      !window.confirm(
        `Revert "${name}" to its original built-in instructions?`,
      )
    ) {
      return
    }
    await revertBuiltin.mutateAsync(name)
    setEditing(false)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{name}</h2>
          <p className="mt-1 text-xs text-muted">
            Built-in tool instructions
            {data.is_overridden ? ' · edited' : ''}
          </p>
        </div>
        {data.is_overridden ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void handleRevert()}>
            Revert
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
          {editing ? 'Preview' : 'Edit'}
        </Button>
        {editing ? (
          <Button
            type="button"
            size="sm"
            onClick={() => void handleSave()}
            disabled={saveBuiltin.isPending}
          >
            Save
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
          Editing a built-in capability changes how the assistant is instructed to use this native
          tool. Use Revert to restore the shipped default.
        </div>

        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="min-h-[360px] w-full resize-y rounded-lg border border-border bg-background p-4 font-mono text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
        ) : (
          <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-4 text-xs leading-relaxed">
            {data.text}
          </pre>
        )}
      </div>
    </div>
  )
}

