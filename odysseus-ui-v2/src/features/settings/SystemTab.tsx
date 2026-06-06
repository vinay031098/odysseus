import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { McpServersPanel } from '@/features/settings/McpServersPanel'
import { AdminGate, SettingsCard } from '@/features/settings/SettingsCard'
import { WebhooksPanel } from '@/features/settings/WebhooksPanel'
import { useApiTokens } from '@/hooks/useApiTokens'
import { useAuth } from '@/hooks/useAuth'

export function SystemTab() {
  const { user } = useAuth()
  const isAdmin = !!user?.is_admin
  const { data: tokens = [], create, remove, isLoading } = useApiTokens(isAdmin)
  const [tokenName, setTokenName] = useState('')
  const [createdToken, setCreatedToken] = useState<string | null>(null)

  if (!isAdmin) {
    return <AdminGate>API tokens, MCP, and webhooks require an administrator account.</AdminGate>
  }

  async function handleCreateToken(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await create.mutateAsync({ name: tokenName.trim(), profile: 'chat' })
      setCreatedToken(res.token)
      setTokenName('')
      toast.success('Token created — copy it now')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    }
  }

  return (
    <div className="space-y-8">
      <SettingsCard title="API tokens" description="Bearer tokens for automation and mobile clients.">
        {createdToken && (
          <div className="mb-3 rounded border border-primary/40 bg-primary/5 p-3 text-xs font-mono break-all">
            {createdToken}
          </div>
        )}
        <form onSubmit={(e) => void handleCreateToken(e)} className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="tok-name">Name</Label>
            <Input id="tok-name" value={tokenName} onChange={(e) => setTokenName(e.target.value)} className="mt-1" />
          </div>
          <Button type="submit" disabled={create.isPending}>Create token</Button>
        </form>
        {isLoading ? (
          <p className="mt-3 text-sm text-muted">Loading…</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {tokens.map((t) => (
              <li key={t.id} className="flex justify-between rounded border border-border px-3 py-2">
                <span>
                  {t.name} <span className="text-muted">({t.token_prefix}…)</span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (!confirm(`Revoke ${t.name}?`)) return
                    void remove.mutateAsync(t.id).then(() => toast.success('Revoked'))
                  }}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>
      <McpServersPanel />
      <WebhooksPanel />
    </div>
  )
}
