import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SettingsCard } from '@/features/settings/SettingsCard'
import { useAppSettings } from '@/hooks/useAppSettings'
import { DEFAULT_KEYBINDS, normalizeKeybind } from '@/lib/settings-fields'

export function ShortcutsTab() {
  const { isAdmin, settings, save, isSaving } = useAppSettings()
  const [binds, setBinds] = useState<Record<string, string>>({ ...DEFAULT_KEYBINDS })

  useEffect(() => {
    const kb = settings?.keybinds
    if (kb && typeof kb === 'object') {
      setBinds({ ...DEFAULT_KEYBINDS, ...(kb as Record<string, string>) })
    }
  }, [settings])

  async function handleSave() {
    if (!isAdmin) {
      toast.error('Admin only')
      return
    }
    const normalized = Object.fromEntries(
      Object.entries(binds).map(([k, v]) => [k, normalizeKeybind(v)]),
    )
    try {
      await save({ keybinds: normalized })
      toast.success('Shortcuts saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  return (
    <SettingsCard title="Keyboard shortcuts" description="Global keybindings (admin can edit).">
      <div className="space-y-3">
        {Object.entries(binds).map(([action, combo]) => (
          <div key={action} className="grid gap-2 sm:grid-cols-2 items-center">
            <Label className="text-muted capitalize">{action.replace(/_/g, ' ')}</Label>
            <Input
              value={combo}
              disabled={!isAdmin}
              onChange={(e) => setBinds((b) => ({ ...b, [action]: e.target.value }))}
            />
          </div>
        ))}
        {isAdmin && (
          <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
            Save shortcuts
          </Button>
        )}
      </div>
    </SettingsCard>
  )
}
