import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { useChangePassword } from '@/hooks/useChangePassword'
import { TwoFactorSection } from '@/features/settings/TwoFactorSection'
import { validatePasswordChange } from '@/lib/settings-validation'

export function AccountTab() {
  const { user } = useAuth()
  const changePassword = useChangePassword()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = validatePasswordChange(current, next, confirm)
    if (!result.valid) {
      toast.error(result.error)
      return
    }
    try {
      await changePassword.mutateAsync({
        current_password: current,
        new_password: next,
      })
      toast.success('Password updated — sign in again with your new password')
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-panel p-4">
        <h3 className="text-sm font-medium">Profile</h3>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Username</dt>
            <dd className="font-medium">{user?.username ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Role</dt>
            <dd className="font-medium">{user?.is_admin ? 'Administrator' : 'User'}</dd>
          </div>
        </dl>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-border bg-panel p-4"
      >
        <h3 className="text-sm font-medium">Change password</h3>
        <div className="space-y-2">
          <Label htmlFor="pw-current">Current password</Label>
          <Input
            id="pw-current"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw-new">New password</Label>
          <Input
            id="pw-new"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            minLength={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw-confirm">Confirm new password</Label>
          <Input
            id="pw-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" disabled={changePassword.isPending}>
          {changePassword.isPending ? 'Updating…' : 'Update password'}
        </Button>
      </form>

      <TwoFactorSection />
    </div>
  )
}
