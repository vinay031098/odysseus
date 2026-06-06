import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AdminGate, SettingsCard } from '@/features/settings/SettingsCard'
import { UserPrivilegePanel } from '@/features/settings/UserPrivilegePanel'
import { useAuth } from '@/hooks/useAuth'
import { useFeatures } from '@/hooks/useAppSettings'
import { useUsers } from '@/hooks/useUsers'

export function UsersTab() {
  const { user } = useAuth()
  const isAdmin = !!user?.is_admin
  const { data: users = [], create, remove, signup } = useUsers(isAdmin)
  const { features, save: saveFeatures } = useFeatures()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [makeAdmin, setMakeAdmin] = useState(false)

  if (!isAdmin) {
    return <AdminGate>User management requires an administrator account.</AdminGate>
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      await create.mutateAsync({
        username: username.trim(),
        password,
        is_admin: makeAdmin,
      })
      toast.success('User created')
      setUsername('')
      setPassword('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    }
  }

  async function toggleFeature(key: string, enabled: boolean) {
    if (!features) return
    try {
      await saveFeatures({ ...features, [key]: enabled })
      toast.success('Feature updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    }
  }

  return (
    <div className="space-y-6">
      <SettingsCard title="Users">
        <ul className="space-y-2 text-sm">
          {users.map((u) => (
            <li key={u.username} className="rounded border border-border px-3 py-2">
              <div className="flex justify-between items-start gap-2">
                <span>
                  {u.username}
                  {u.is_admin && (
                    <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary">
                      admin
                    </span>
                  )}
                </span>
                {u.username !== user?.username && !u.is_admin && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (!confirm(`Delete user ${u.username}?`)) return
                      void remove.mutateAsync(u.username).then(() => toast.success('Deleted'))
                    }}
                  >
                    Delete
                  </Button>
                )}
              </div>
              {!u.is_admin && <UserPrivilegePanel user={u} />}
            </li>
          ))}
        </ul>
      </SettingsCard>

      <form onSubmit={(e) => void handleCreate(e)} className="space-y-3 rounded-lg border border-border bg-panel p-4">
        <h3 className="text-sm font-medium">Add user</h3>
        <div>
          <Label htmlFor="new-user">Username</Label>
          <Input id="new-user" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="new-pass">Password</Label>
          <Input id="new-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={makeAdmin} onChange={(e) => setMakeAdmin(e.target.checked)} />
          Administrator
        </label>
        <Button type="submit" disabled={create.isPending}>Create user</Button>
      </form>

      <SettingsCard title="Open registration">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!user?.signup_enabled}
            onChange={(e) =>
              void signup.mutateAsync(e.target.checked).then(() => toast.success('Updated'))
            }
          />
          Allow new signups
        </label>
      </SettingsCard>

      {features && (
        <SettingsCard title="Feature flags">
          <ul className="space-y-2 text-sm">
            {Object.entries(features).map(([key, on]) => (
              <li key={key} className="flex justify-between items-center">
                <span>{key}</span>
                <input
                  type="checkbox"
                  checked={!!on}
                  onChange={(e) => void toggleFeature(key, e.target.checked)}
                />
              </li>
            ))}
          </ul>
        </SettingsCard>
      )}
    </div>
  )
}
