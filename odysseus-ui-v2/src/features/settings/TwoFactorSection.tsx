import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTwoFactor } from '@/hooks/useTwoFactor'

export function TwoFactorSection() {
  const { data: status, setup, confirm, disable } = useTwoFactor()
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [qr, setQr] = useState<string | null>(null)
  const [backup, setBackup] = useState<string[]>([])

  async function handleSetup() {
    try {
      const res = await setup.mutateAsync()
      setQr(res.qr_code)
      toast.success('Scan the QR code with your authenticator app')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Setup failed')
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await confirm.mutateAsync(code.trim())
      setBackup(res.backup_codes ?? [])
      setQr(null)
      setCode('')
      toast.success('2FA enabled')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid code')
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault()
    try {
      await disable.mutateAsync(password)
      setPassword('')
      toast.success('2FA disabled')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disable')
    }
  }

  return (
    <div className="rounded-lg border border-border bg-panel p-4 space-y-4">
      <h3 className="text-sm font-medium">Two-factor authentication</h3>
      {status?.enabled ? (
        <form onSubmit={(e) => void handleDisable(e)} className="space-y-3">
          <p className="text-sm text-muted">2FA is enabled on your account.</p>
          <div>
            <Label htmlFor="2fa-disable-pw">Password to disable</Label>
            <Input
              id="2fa-disable-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button type="submit" variant="secondary" disabled={disable.isPending}>
            Disable 2FA
          </Button>
        </form>
      ) : (
        <div className="space-y-3">
          {!qr ? (
            <Button type="button" onClick={() => void handleSetup()} disabled={setup.isPending}>
              Enable 2FA
            </Button>
          ) : (
            <form onSubmit={(e) => void handleConfirm(e)} className="space-y-3">
              <img src={qr} alt="2FA QR code" className="h-40 w-40 rounded border border-border" />
              <div>
                <Label htmlFor="2fa-code">Verification code</Label>
                <Input
                  id="2fa-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mt-1 max-w-xs"
                  autoComplete="one-time-code"
                />
              </div>
              <Button type="submit" disabled={confirm.isPending}>Confirm</Button>
            </form>
          )}
        </div>
      )}
      {backup.length > 0 && (
        <div className="rounded border border-border bg-background p-3 text-xs">
          <p className="font-medium mb-2">Backup codes (save these):</p>
          <ul className="font-mono space-y-1">
            {backup.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
