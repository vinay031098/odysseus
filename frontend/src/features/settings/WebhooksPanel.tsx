import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WEBHOOK_EVENTS } from '@/api/webhooks'
import { useWebhooks } from '@/hooks/useWebhooks'

export function WebhooksPanel() {
  const { data: hooks = [], isLoading, create, test, toggle, remove } =
    useWebhooks(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [events, setEvents] = useState<string[]>([...WEBHOOK_EVENTS])

  function toggleEvent(ev: string) {
    setEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev],
    )
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !url.trim() || events.length === 0) {
      toast.error('Name, URL, and at least one event are required')
      return
    }
    try {
      await create.mutateAsync({
        name: name.trim(),
        url: url.trim(),
        secret: secret.trim() || undefined,
        events,
      })
      toast.success('Webhook created')
      setShowForm(false)
      setName('')
      setUrl('')
      setSecret('')
      setEvents([...WEBHOOK_EVENTS])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create webhook')
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted">Loading webhooks…</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">Webhooks</h3>
          <p className="text-xs text-muted mt-1">
            Notify external services on chat and session events.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Add webhook'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="rounded-lg border border-border bg-panel p-4 space-y-3"
        >
          <div>
            <Label htmlFor="wh-name">Name</Label>
            <Input
              id="wh-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="wh-url">URL</Label>
            <Input
              id="wh-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/hook"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="wh-secret">Secret (optional)</Label>
            <Input
              id="wh-secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="mt-1"
            />
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Events</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {WEBHOOK_EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={events.includes(ev)}
                    onChange={() => toggleEvent(ev)}
                  />
                  {ev}
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create webhook'}
          </Button>
        </form>
      )}

      {hooks.length === 0 ? (
        <p className="text-sm text-muted rounded-lg border border-dashed border-border p-4">
          No webhooks configured.
        </p>
      ) : (
        <ul className="space-y-2">
          {hooks.map((wh) => (
            <li
              key={wh.id}
              className="rounded-lg border border-border bg-panel p-3 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {wh.name}
                    {!wh.is_active && (
                      <span className="ml-2 text-xs text-muted">(disabled)</span>
                    )}
                  </div>
                  <div className="text-xs text-muted mt-0.5 break-all">{wh.url}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {wh.events.join(', ')}
                    {wh.last_status_code != null && ` · last HTTP ${wh.last_status_code}`}
                  </div>
                  {wh.last_error && (
                    <div className="text-xs text-destructive mt-1">{wh.last_error}</div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void test
                        .mutateAsync(wh.id)
                        .then(() => toast.success('Test sent'))
                        .catch((err) =>
                          toast.error(
                            err instanceof Error ? err.message : 'Test failed',
                          ),
                        )
                    }
                  >
                    Test
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void toggle.mutateAsync(wh.id).then(() => toast.success('Toggled'))
                    }
                  >
                    {wh.is_active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (!confirm(`Delete webhook "${wh.name}"?`)) return
                      void remove.mutateAsync(wh.id).then(() => toast.success('Deleted'))
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
