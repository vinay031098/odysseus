import { useEffect, useMemo, useState } from 'react'
import { Syringe, UserRound, X } from 'lucide-react'
import { BUILTIN_RECIPES } from '@/api/cookbook'
import type { UserTemplate } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CustomPresetConfig } from '@/lib/characterPresets'
import { cn } from '@/lib/utils'

interface CharacterPresetIndicatorProps {
  active: boolean
  label: string
  locked: boolean
  onOpen: () => void
  onDeactivate: () => void
}

export function CharacterPresetIndicator({
  active,
  label,
  locked,
  onOpen,
  onDeactivate,
}: CharacterPresetIndicatorProps) {
  if (!active) {
    return (
      <Button type="button" size="sm" variant="ghost" className="text-xs" onClick={onOpen}>
        Persona
      </Button>
    )
  }

  const isPersona = label !== 'Prompt'

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-xs text-primary',
      )}
      title={
        isPersona ? `Persona: ${label} — click to configure` : 'Custom settings active — click to configure'
      }
      onClick={onOpen}
    >
      {isPersona ? <UserRound className="h-3.5 w-3.5" /> : <Syringe className="h-3.5 w-3.5" />}
      <span className="max-w-[8rem] truncate">{label}</span>
      {!locked ? (
        <span
          role="button"
          tabIndex={0}
          className="ml-0.5 rounded hover:bg-primary/20"
          aria-label="Deactivate persona"
          onClick={(e) => {
            e.stopPropagation()
            onDeactivate()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
              onDeactivate()
            }
          }}
        >
          <X className="h-3 w-3" />
        </span>
      ) : null}
    </button>
  )
}

interface CharacterPresetDialogProps {
  open: boolean
  onClose: () => void
  initial: CustomPresetConfig
  userTemplates: UserTemplate[]
  onSave: (config: CustomPresetConfig) => Promise<void>
}

export function CharacterPresetDialog({
  open,
  onClose,
  initial,
  userTemplates,
  onSave,
}: CharacterPresetDialogProps) {
  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setDraft(initial)
  }, [open, initial])

  const templateOptions = useMemo(() => {
    const seen = new Set<string>()
    const items: { name: string; prompt: string; temperature?: number }[] = []
    for (const recipe of [...BUILTIN_RECIPES, ...userTemplates.map((t) => ({
      name: t.name,
      prompt: t.system_prompt,
      temperature: t.temperature,
    }))]) {
      const key = recipe.name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      items.push(recipe)
    }
    return items.sort((a, b) => a.name.localeCompare(b.name))
  }, [userTemplates])

  if (!open) return null

  const applyTemplate = (name: string) => {
    const tmpl = templateOptions.find((t) => t.name === name)
    if (!tmpl) return
    setDraft((prev) => ({
      ...prev,
      character_name: name,
      system_prompt: tmpl.prompt,
      temperature: tmpl.temperature ?? prev.temperature,
      enabled: true,
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({ ...draft, enabled: true })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-panel p-4 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="character-preset-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="character-preset-title" className="text-sm font-semibold">
            Character / prompt preset
          </h2>
          <button type="button" className="rounded p-1 hover:bg-muted" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="char-template">Template</Label>
            <select
              id="char-template"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={draft.character_name || ''}
              onChange={(e) => applyTemplate(e.target.value)}
            >
              <option value="">Custom…</option>
              {templateOptions.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="char-name">Character name</Label>
            <Input
              id="char-name"
              className="mt-1"
              value={draft.character_name}
              onChange={(e) => setDraft((d) => ({ ...d, character_name: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="char-temp">Temperature ({draft.temperature.toFixed(1)})</Label>
            <input
              id="char-temp"
              type="range"
              min={0}
              max={2}
              step={0.1}
              className="mt-1 w-full"
              value={draft.temperature}
              onChange={(e) => setDraft((d) => ({ ...d, temperature: Number(e.target.value) }))}
            />
          </div>
          <div>
            <Label htmlFor="char-prompt">System prompt</Label>
            <textarea
              id="char-prompt"
              className="mt-1 min-h-[120px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={draft.system_prompt}
              onChange={(e) => setDraft((d) => ({ ...d, system_prompt: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void handleSave()}>
            {saving ? 'Saving…' : 'Apply'}
          </Button>
        </div>
      </div>
    </div>
  )
}
