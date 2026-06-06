import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  addContact,
  deleteContact,
  listContacts,
  updateContact,
  type Contact,
} from '@/api/contacts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AdminGate } from '@/features/settings/SettingsCard'
import { useAuth } from '@/hooks/useAuth'

export function ContactsTab() {
  const { user } = useAuth()
  const isAdmin = !!user?.is_admin
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [busyUid, setBusyUid] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listContacts()
      const rows = [...(data.contacts ?? [])]
      rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      setContacts(rows)
    } catch {
      toast.error('Failed to load contacts')
      setContacts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) void refresh()
  }, [isAdmin, refresh])

  if (!isAdmin) {
    return <AdminGate>Contacts management requires an administrator account.</AdminGate>
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const email = addEmail.trim()
    if (!email) {
      toast.error('Email is required')
      return
    }
    try {
      const res = await addContact({ name: addName.trim() || undefined, email })
      if (!res.success) {
        toast.error(res.error ?? 'Failed to add contact')
        return
      }
      toast.success('Contact added')
      setAddName('')
      setAddEmail('')
      setShowAdd(false)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add contact')
    }
  }

  async function handleDelete(contact: Contact) {
    if (!window.confirm(`Delete ${contact.name || contact.emails[0] || 'this contact'}?`)) return
    setBusyUid(contact.uid)
    try {
      await deleteContact(contact.uid)
      toast.success('Contact deleted')
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete contact')
    } finally {
      setBusyUid(null)
    }
  }

  async function handleInlineEdit(contact: Contact, field: 'name' | 'email', value: string) {
    const trimmed = value.trim()
    if (field === 'email' && !trimmed) return
    setBusyUid(contact.uid)
    try {
      const body =
        field === 'name'
          ? { name: trimmed || contact.emails[0]?.split('@')[0] || 'Contact' }
          : { emails: [trimmed, ...contact.emails.slice(1)] }
      const res = await updateContact(contact.uid, body)
      if (!res.success) {
        toast.error(res.error ?? 'Update failed')
        return
      }
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusyUid(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-panel p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium">Contacts</h3>
            <p className="mt-1 text-xs text-muted">
              CardDAV-backed address book used by email autocomplete and agent tools.
            </p>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={() => setShowAdd((v) => !v)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add contact
          </Button>
        </div>

        {showAdd ? (
          <form onSubmit={(e) => void handleAdd(e)} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Jane Doe"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                required
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="jane@example.com"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" size="sm">
                Save
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </div>

      <div className="rounded-lg border border-border bg-panel">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading contacts…
          </div>
        ) : contacts.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">No contacts yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {contacts.map((c) => (
              <li key={c.uid} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Input
                    defaultValue={c.name}
                    disabled={busyUid === c.uid}
                    className="h-8 text-sm"
                    aria-label="Contact name"
                    onBlur={(e) => {
                      if (e.target.value.trim() !== (c.name || '').trim()) {
                        void handleInlineEdit(c, 'name', e.target.value)
                      }
                    }}
                  />
                  <Input
                    defaultValue={c.emails[0] ?? ''}
                    disabled={busyUid === c.uid}
                    className="h-8 text-sm"
                    aria-label="Contact email"
                    onBlur={(e) => {
                      const next = e.target.value.trim()
                      if (next && next !== (c.emails[0] ?? '')) {
                        void handleInlineEdit(c, 'email', next)
                      }
                    }}
                  />
                  {c.phones.length > 0 ? (
                    <p className="text-xs text-muted">{c.phones.join(' · ')}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  disabled={busyUid === c.uid}
                  aria-label={`Delete ${c.name || c.emails[0]}`}
                  onClick={() => void handleDelete(c)}
                >
                  {busyUid === c.uid ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
