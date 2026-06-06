import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SettingsCard } from '@/features/settings/SettingsCard'
import { useAuth } from '@/hooks/useAuth'
import { useFeatures } from '@/hooks/useAppSettings'
import {
  isSensitiveBlurPrefEnabled,
  setSensitiveBlurPref,
  SENSITIVE_BLUR_CHANGE_EVENT,
} from '@/lib/censorContent'

export function PrivacyTab() {
  const { user } = useAuth()
  const { features } = useFeatures()
  const [sensitiveBlur, setSensitiveBlur] = useState(isSensitiveBlurPrefEnabled)

  useEffect(() => {
    setSensitiveBlur(isSensitiveBlurPrefEnabled())
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ enabled?: boolean }>).detail
      if (detail && typeof detail.enabled === 'boolean') {
        setSensitiveBlur(detail.enabled)
      }
    }
    window.addEventListener(SENSITIVE_BLUR_CHANGE_EVENT, onChange)
    return () => window.removeEventListener(SENSITIVE_BLUR_CHANGE_EVENT, onChange)
  }, [])

  const filterAvailable = features?.sensitive_filter !== false

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-panel p-4">
        <h3 className="text-sm font-medium">Authentication</h3>
        <dl className="mt-3 grid gap-3 text-sm">
          <div>
            <dt className="text-muted">Status</dt>
            <dd className="font-medium">
              {user?.authenticated ? 'Signed in' : 'Not signed in'}
            </dd>
          </div>
          {user?.username && (
            <div>
              <dt className="text-muted">Account</dt>
              <dd className="font-medium">{user.username}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted">Auth system</dt>
            <dd className="font-medium">
              {user?.auth_enabled === false ? 'Disabled (single-user mode)' : 'Enabled'}
            </dd>
          </div>
        </dl>
      </div>

      <SettingsCard
        title="Sensitive blur"
        description="Blur emails, tokens, and secrets in AI output. Stored locally in this browser."
      >
        {filterAvailable ? (
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Enable sensitive information blur</span>
            <input
              type="checkbox"
              checked={sensitiveBlur}
              onChange={(e) => {
                setSensitiveBlur(e.target.checked)
                setSensitiveBlurPref(e.target.checked)
              }}
            />
          </label>
        ) : (
          <p className="text-sm text-muted">
            Sensitive blur is disabled by an administrator (feature flag off).
          </p>
        )}
      </SettingsCard>

      <div className="rounded-lg border border-border bg-panel p-4 text-sm">
        <p className="text-muted">
          Passwords are stored securely on the server. To change yours, go to the{' '}
          <Link to="/settings?tab=account" className="text-primary underline-offset-4 hover:underline">
            Account
          </Link>{' '}
          tab.
        </p>
      </div>
    </div>
  )
}
