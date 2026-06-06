import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { authenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted">
        Loading…
      </div>
    )
  }

  const authEnabled = user?.auth_enabled !== false
  if (!authEnabled || authenticated) {
    return <>{children}</>
  }

  return <Navigate to="/login" replace state={{ from: location.pathname }} />
}
