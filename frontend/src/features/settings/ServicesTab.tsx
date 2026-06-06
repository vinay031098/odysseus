import { SettingsCard } from '@/features/settings/SettingsCard'
import { useServicesHealth } from '@/hooks/useServicesHealth'

export function ServicesTab() {
  const { health, ready, runtime, version } = useServicesHealth()

  return (
    <div className="space-y-4">
      <SettingsCard title="System status" description="Liveness and readiness checks.">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Health</dt>
            <dd className="font-medium">{health.data?.status ?? '…'}</dd>
          </div>
          <div>
            <dt className="text-muted">Ready</dt>
            <dd className="font-medium">
              {ready.data?.ready === undefined
                ? '…'
                : ready.data.ready
                  ? 'Yes'
                  : 'No'}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Version</dt>
            <dd className="font-medium">{version.data?.version ?? '…'}</dd>
          </div>
          <div>
            <dt className="text-muted">Runtime</dt>
            <dd className="font-medium text-xs">
              {runtime.data
                ? runtime.data.in_docker
                  ? 'Docker'
                  : 'Native'
                : '…'}
              {runtime.data?.ollama_base_url && (
                <span className="block text-muted mt-0.5">
                  Ollama: {runtime.data.ollama_base_url}
                </span>
              )}
            </dd>
          </div>
        </dl>
        {ready.data?.checks && (
          <ul className="mt-4 space-y-1 text-xs">
            {Object.entries(ready.data.checks).map(([name, check]) => (
              <li key={name} className={check.ok ? 'text-foreground' : 'text-destructive'}>
                {name}: {check.ok ? 'ok' : check.detail ?? 'failed'}
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>
      <SettingsCard
        title="Model endpoints"
        description="Add and manage LLM endpoints under the AI tab."
      >
        <p className="text-sm text-muted">Open the AI tab to add Ollama, OpenAI, or other providers.</p>
      </SettingsCard>
    </div>
  )
}
