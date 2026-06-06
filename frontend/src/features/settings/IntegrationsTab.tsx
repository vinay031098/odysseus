import { useState } from 'react'
import { toast } from 'sonner'
import type { Integration } from '@/api/integrations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AdminGate } from '@/features/settings/SettingsCard'
import { useAuth } from '@/hooks/useAuth'
import { useIntegrations } from '@/hooks/useIntegrations'

type FormState = {
  name: string
  preset: string
  baseUrl: string
  apiKey: string
}

const EMPTY: FormState = { name: '', preset: '', baseUrl: '', apiKey: '' }

function integrationToForm(item: Integration): FormState {
  return {
    name: item.name,
    preset: item.preset ?? '',
    baseUrl: item.base_url ?? '',
    apiKey: '',
  }
}

export function IntegrationsTab() {
  const { user } = useAuth()
  const isAdmin = !!user?.is_admin
  const { data: items = [], presets, create, update, remove, test, isLoading } =
    useIntegrations(isAdmin)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)

  if (!isAdmin) {
    return (
      <AdminGate>External service integrations require an administrator account.</AdminGate>
    )
  }

  const presetKeys = Object.keys(presets.data ?? {})

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY)
    setShowForm(true)
  }

  function openEdit(item: Integration) {
    setEditingId(item.id)
    setForm(integrationToForm(item))
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      preset: form.preset || undefined,
      base_url: form.baseUrl.trim(),
    }
    if (form.apiKey.trim()) body.api_key = form.apiKey.trim()

    try {
      if (editingId) {
        await update.mutateAsync({ id: editingId, body })
        toast.success('Integration updated')
      } else {
        await create.mutateAsync(body)
        toast.success('Integration added')
      }
      closeForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted">ntfy, Discord, CalDAV, and custom HTTP services.</p>
        <Button type="button" size="sm" onClick={() => (showForm ? closeForm() : openCreate())}>
          {showForm ? 'Cancel' : 'Add integration'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 rounded-lg border border-border bg-panel p-4">
          <h3 className="text-sm font-medium">
            {editingId ? 'Edit integration' : 'New integration'}
          </h3>
          <div>
            <Label htmlFor="int-name">Name</Label>
            <Input id="int-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="int-preset">Preset</Label>
            <select
              id="int-preset"
              value={form.preset}
              onChange={(e) => setForm((f) => ({ ...f, preset: e.target.value }))}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Custom</option>
              {presetKeys.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="int-url">Base URL</Label>
            <Input id="int-url" value={form.baseUrl} onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="int-key">
              API key {editingId ? '(leave blank to keep)' : '(optional)'}
            </Label>
            <Input
              id="int-key"
              type="password"
              value={form.apiKey}
              onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
              className="mt-1"
              autoComplete="off"
            />
          </div>
          <Button type="submit" disabled={create.isPending || update.isPending}>
            {editingId ? 'Save changes' : 'Add'}
          </Button>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted rounded-lg border border-dashed border-border p-4">
          No integrations yet. Add one to enable webhook and reminder channels.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-border bg-panel p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-muted break-all">{item.base_url}</div>
                  {item.has_api_key && (
                    <div className="text-xs text-muted">API key set</div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(item)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void test.mutateAsync(item.id).then((r) =>
                        toast.success(r.message ?? (r.ok ? 'OK' : 'Failed')),
                      )
                    }
                  >
                    Test
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (!confirm(`Delete ${item.name}?`)) return
                      void remove.mutateAsync(item.id).then(() => toast.success('Deleted'))
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
