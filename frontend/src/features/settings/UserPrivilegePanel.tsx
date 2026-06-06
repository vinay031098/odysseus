import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AuthUser } from '@/api/users'
import type { UserPrivileges } from '@/api/types'
import { useModels } from '@/hooks/useModels'
import { useUsers } from '@/hooks/useUsers'
import { PRIVILEGE_KEYS, PRIVILEGE_LABELS } from '@/lib/user-privileges'

interface UserPrivilegePanelProps {
  user: AuthUser
}

function readPriv(privileges: UserPrivileges | undefined, key: string): boolean {
  return privileges?.[key] === true
}

export function UserPrivilegePanel({ user }: UserPrivilegePanelProps) {
  const { setPrivileges } = useUsers(true)
  const { modelOptions } = useModels()
  const [open, setOpen] = useState(false)
  const [maxMessages, setMaxMessages] = useState(
    String((user.privileges?.max_messages_per_day as number | undefined) ?? 0),
  )

  const allModels = useMemo(
    () =>
      modelOptions
        .filter((m) => !m.offline)
        .map((m) => ({ id: m.id, label: m.label, endpoint: m.endpointName ?? '' })),
    [modelOptions],
  )

  const allowedModels = Array.isArray(user.privileges?.allowed_models)
    ? (user.privileges!.allowed_models as string[])
    : []
  const restricted = user.privileges?.allowed_models_restricted === true
  const allowedSet = new Set(allowedModels)

  async function patch(priv: Partial<UserPrivileges>) {
    try {
      await setPrivileges.mutateAsync({ username: user.username, privileges: priv })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update privilege')
    }
  }

  async function saveModels(nextChecked: string[], nextRestricted: boolean) {
    await patch({
      allowed_models: nextRestricted ? nextChecked : [],
      allowed_models_restricted: nextRestricted,
    })
  }

  function toggleModel(modelId: string, checked: boolean) {
    let checkedIds: string[]
    if (!restricted) {
      checkedIds = allModels.map((m) => m.id)
    } else {
      checkedIds = [...allowedSet]
    }
    if (checked) {
      if (!checkedIds.includes(modelId)) checkedIds.push(modelId)
    } else {
      checkedIds = checkedIds.filter((id) => id !== modelId)
    }
    const nextRestricted = checkedIds.length !== allModels.length
    void saveModels(nextRestricted ? checkedIds : [], nextRestricted)
  }

  const modelsHint = !restricted
    ? 'All models allowed (no restrictions)'
    : allowedSet.size === 0
      ? 'No models allowed'
      : `${allowedSet.size} model(s) allowed`

  return (
    <div className="mt-2 border-t border-border pt-2">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left text-sm"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-muted">Manage privileges</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="mt-3 space-y-4 text-sm">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Features</p>
            <ul className="mt-2 space-y-2">
              {PRIVILEGE_KEYS.map((key) => (
                <li key={key} className="flex items-center justify-between gap-2">
                  <span>{PRIVILEGE_LABELS[key]}</span>
                  <input
                    type="checkbox"
                    checked={readPriv(user.privileges, key)}
                    onChange={(e) => void patch({ [key]: e.target.checked })}
                  />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Limits</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div>
                <Label htmlFor={`max-msg-${user.username}`}>Daily message limit</Label>
                <p className="text-xs text-muted">0 = no limit</p>
              </div>
              <Input
                id={`max-msg-${user.username}`}
                type="number"
                min={0}
                className="w-20 text-center"
                value={maxMessages}
                onChange={(e) => setMaxMessages(e.target.value)}
                onBlur={() =>
                  void patch({ max_messages_per_day: Number(maxMessages) || 0 })
                }
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span>Allowed models</span>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  className="text-muted underline-offset-2 hover:underline"
                  onClick={() => void saveModels(allModels.map((m) => m.id), false)}
                >
                  All
                </button>
                <button
                  type="button"
                  className="text-muted underline-offset-2 hover:underline"
                  onClick={() => void saveModels([], true)}
                >
                  None
                </button>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted">{modelsHint}</p>
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded border border-border p-2">
              {allModels.length === 0 ? (
                <p className="text-xs text-muted">No models available</p>
              ) : (
                allModels.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!restricted || allowedSet.has(m.id)}
                      onChange={(e) => toggleModel(m.id, e.target.checked)}
                    />
                    <span className="truncate">{m.label}</span>
                    <span className="ml-auto truncate text-muted">{m.endpoint}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
