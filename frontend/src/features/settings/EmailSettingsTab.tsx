import { useState } from 'react'
import { toast } from 'sonner'
import type { EmailAccount } from '@/api/email-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SettingsCard } from '@/features/settings/SettingsCard'
import type { EmailAccountInput } from '@/api/emailAccounts'
import { useEmailAccounts } from '@/hooks/useEmailAccounts'

type FormState = {
  name: string
  imap_host: string
  imap_port: string
  imap_user: string
  imap_password: string
  smtp_host: string
  smtp_port: string
  smtp_user: string
  smtp_password: string
  from_address: string
}

const EMPTY: FormState = {
  name: '',
  imap_host: '',
  imap_port: '993',
  imap_user: '',
  imap_password: '',
  smtp_host: '',
  smtp_port: '465',
  smtp_user: '',
  smtp_password: '',
  from_address: '',
}

function accountToForm(acc: EmailAccount): FormState {
  return {
    name: acc.name,
    imap_host: acc.imap_host,
    imap_port: String(acc.imap_port || 993),
    imap_user: acc.imap_user,
    imap_password: '',
    smtp_host: acc.smtp_host,
    smtp_port: String(acc.smtp_port || 465),
    smtp_user: acc.smtp_user,
    smtp_password: '',
    from_address: acc.from_address,
  }
}

export function EmailSettingsTab() {
  const { data: accounts = [], isLoading, create, update, remove, setDefault, test } =
    useEmailAccounts()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)

  function updateField(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY)
    setShowForm(true)
  }

  function openEdit(acc: EmailAccount) {
    setEditingId(acc.id)
    setForm(accountToForm(acc))
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY)
  }

  function buildPayload(): EmailAccountInput {
    const payload: EmailAccountInput = {
      name: form.name.trim(),
      imap_host: form.imap_host.trim(),
      imap_port: Number(form.imap_port) || 993,
      imap_user: form.imap_user.trim(),
      imap_starttls: true,
      smtp_host: form.smtp_host.trim(),
      smtp_port: Number(form.smtp_port) || 465,
      smtp_user: form.smtp_user.trim(),
      from_address: form.from_address.trim(),
    }
    if (form.imap_password) payload.imap_password = form.imap_password
    if (form.smtp_password) payload.smtp_password = form.smtp_password
    return payload
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const payload = buildPayload()
      if (editingId) {
        const res = await update.mutateAsync({ id: editingId, data: payload })
        if (res.ok === false) throw new Error(res.error ?? 'Failed')
        toast.success('Email account updated')
      } else {
        const res = await create.mutateAsync(payload)
        if (res.ok === false) throw new Error(res.error ?? 'Failed')
        toast.success('Email account added')
      }
      closeForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save account')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted">IMAP/SMTP accounts for the Email app.</p>
        <Button type="button" size="sm" onClick={() => (showForm ? closeForm() : openCreate())}>
          {showForm ? 'Cancel' : 'Add account'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 rounded-lg border border-border bg-panel p-4">
          <h3 className="text-sm font-medium">
            {editingId ? 'Edit email account' : 'New email account'}
          </h3>
          {(['name', 'imap_host', 'imap_user', 'imap_password', 'smtp_host', 'smtp_user', 'smtp_password', 'from_address'] as const).map(
            (key) => (
              <div key={key}>
                <Label htmlFor={`em-${key}`}>
                  {key.replace(/_/g, ' ')}
                  {editingId && key.includes('password') && (
                    <span className="ml-1 text-xs text-muted">(leave blank to keep)</span>
                  )}
                </Label>
                <Input
                  id={`em-${key}`}
                  type={key.includes('password') ? 'password' : 'text'}
                  value={form[key]}
                  onChange={(e) => updateField(key, e.target.value)}
                  className="mt-1"
                  autoComplete="off"
                />
              </div>
            ),
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="em-imap-port">IMAP port</Label>
              <Input id="em-imap-port" value={form.imap_port} onChange={(e) => updateField('imap_port', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="em-smtp-port">SMTP port</Label>
              <Input id="em-smtp-port" value={form.smtp_port} onChange={(e) => updateField('smtp_port', e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                void test
                  .mutateAsync({
                    ...buildPayload(),
                    ...(editingId ? { account_id: editingId } : {}),
                  })
                  .then((r) => toast.success(r.ok ? 'Connection OK' : 'Connection failed'))
              }
            >
              Test
            </Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {editingId ? 'Save changes' : 'Save account'}
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-muted">Loading accounts…</p>
      ) : accounts.length === 0 ? (
        <SettingsCard title="No email accounts">Add an account to use Email in the sidebar.</SettingsCard>
      ) : (
        <ul className="space-y-2">
          {accounts.map((acc) => (
            <li key={acc.id} className="rounded-lg border border-border bg-panel p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {acc.name}
                    {acc.is_default && (
                      <span className="ml-2 text-xs text-primary">default</span>
                    )}
                  </div>
                  <div className="text-xs text-muted">
                    {acc.imap_user} · {acc.from_address}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(acc)}>
                    Edit
                  </Button>
                  {!acc.is_default && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        void setDefault.mutateAsync(acc.id).then(() => toast.success('Default set'))
                      }
                    >
                      Set default
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void test.mutateAsync({ account_id: acc.id }).then((r) =>
                        toast.success(r.ok ? 'OK' : 'Failed'),
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
                      if (!confirm(`Delete ${acc.name}?`)) return
                      void remove.mutateAsync(acc.id).then(() => toast.success('Deleted'))
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
