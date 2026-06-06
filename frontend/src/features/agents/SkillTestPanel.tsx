import type { SkillTestLogEvent, SkillTestStatus, SkillTestVerdict } from '@/api/types'
import { Button } from '@/components/ui/button'

interface SkillTestPanelProps {
  status: SkillTestStatus | undefined
  isStarting: boolean
  onStart: () => void
  onRetry: () => void
}

function renderLogEvent(ev: SkillTestLogEvent, index: number) {
  switch (ev.type) {
    case 'skill_test_start':
      return (
        <div key={index} className="text-muted">
          Task: {ev.task}
          {ev.model ? ` · Model: ${ev.model}` : ''}
        </div>
      )
    case 'agent_step':
      return (
        <div key={index} className="font-medium text-xs text-muted">
          — round {ev.round} —
        </div>
      )
    case 'tool_start':
      return (
        <div key={index} className="font-mono text-xs">
          ▸ {ev.tool} {ev.command ? String(ev.command).slice(0, 200) : ''}
        </div>
      )
    case 'tool_output':
      return (
        <pre key={index} className="whitespace-pre-wrap text-xs text-muted">
          {String(ev.output ?? '').slice(0, 500)}
        </pre>
      )
    case 'say':
      return (
        <div key={index} className="text-sm">
          {ev.text}
        </div>
      )
    case 'evaluating':
      return (
        <div key={index} className="text-xs text-muted">
          Evaluating run…
        </div>
      )
    case 'error':
      return (
        <div key={index} className="text-sm text-destructive">
          Error: {ev.error ?? 'run failed'}
        </div>
      )
    default:
      return null
  }
}

function VerdictBadge({ verdict }: { verdict: SkillTestVerdict }) {
  const v = verdict.verdict ?? 'unknown'
  const label = {
    pass: 'PASS',
    needs_work: 'NEEDS WORK',
    fail: 'FAIL',
    inconclusive: 'INCONCLUSIVE',
  }[v] ?? v.toUpperCase()
  const tone =
    v === 'pass'
      ? 'bg-green-500/15 text-green-700 dark:text-green-400'
      : v === 'fail'
        ? 'bg-destructive/15 text-destructive'
        : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'

  return (
    <div className="space-y-2">
      <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${tone}`}>
        {label}
        {typeof verdict.confidence === 'number'
          ? ` · ${Math.round(verdict.confidence * 100)}%`
          : ''}
      </span>
      {verdict.summary ? <p className="text-sm text-muted">{verdict.summary}</p> : null}
      {verdict.issues?.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          {verdict.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function SkillTestPanel({ status, isStarting, onStart, onRetry }: SkillTestPanelProps) {
  const running = status?.status === 'running' || isStarting
  const done = status?.status === 'done'

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium">Skill test</h3>
        {running ? (
          <span className="text-xs text-muted">Running…</span>
        ) : done ? (
          <span className="text-xs text-muted">Complete</span>
        ) : null}
        <div className="ml-auto flex gap-2">
          {done ? (
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
          <Button type="button" size="sm" onClick={onStart} disabled={running}>
            {running ? 'Testing…' : done ? 'Run again' : 'Run test'}
          </Button>
        </div>
      </div>

      {status && status.status !== 'none' ? (
        <div className="max-h-64 space-y-1 overflow-y-auto rounded border border-border bg-background p-3 font-mono text-xs">
          {(status.log ?? []).map((ev, i) => renderLogEvent(ev, i))}
          {running ? (
            <div className="text-xs text-muted">…running (continues in background)</div>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted">
          Runs the skill in a sandbox with an AI judge. Requires a default model in Settings.
        </p>
      )}

      {done && status.verdict ? <VerdictBadge verdict={status.verdict} /> : null}
    </div>
  )
}
