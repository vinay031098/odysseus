import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { ApiError } from '@/api/client'

export function LoginPage() {
  const { authenticated, isLoading, login, loginState } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/chat'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [needsTotp, setNeedsTotp] = useState(false)

  if (!isLoading && authenticated) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await login({
        username: username.trim(),
        password,
        remember: true,
        totp_code: needsTotp ? totpCode : undefined,
      })
      if (result.requires_totp) {
        setNeedsTotp(true)
        toast.message('Enter your 2FA code')
        return
      }
      toast.success('Welcome back')
      navigate(from, { replace: true })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed'
      toast.error(message)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-panel p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Odysseus</h1>
          <p className="mt-2 text-sm text-muted">Sign in to your workspace</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={needsTotp}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={needsTotp}
            />
          </div>

          {needsTotp ? (
            <div className="space-y-2">
              <Label htmlFor="totp">2FA code</Label>
              <Input
                id="totp"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                required
              />
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={loginState.isPending}>
            {loginState.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
