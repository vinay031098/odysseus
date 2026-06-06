import { useMemo, useState } from 'react'
import { Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CookbookServePreset, CookbookState } from '@/api/cookbookServe'
import { useServePresetsMutations } from '@/hooks/useCookbookServe'
import {
  MAX_SERVE_PRESETS_PER_MODEL,
  normalizeServeCmd,
  presetDisplayLabel,
  presetHost,
  presetsForModel,
} from '@/lib/cookbookServeHelpers'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export interface ServePresetCurrentConfig {
  repo: string
  port: string
  host: string
  cmd: string
  gpus?: string | null
}

interface CookbookServePresetsPanelProps {
  state: CookbookState
  currentConfig: ServePresetCurrentConfig
  filterRepo?: string
  onLoad: (preset: CookbookServePreset) => void
  className?: string
}

function presetKey(preset: CookbookServePreset): string {
  return [
    preset.model,
    preset.label,
    preset.cmd,
    presetHost(preset),
    String(preset.port ?? ''),
  ].join('\0')
}

export function CookbookServePresetsPanel({
  state,
  currentConfig,
  filterRepo,
  onLoad,
  className,
}: CookbookServePresetsPanelProps) {
  const { savePresets } = useServePresetsMutations()
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [draft, setDraft] = useState<CookbookServePreset | null>(null)
  const [saveLabel, setSaveLabel] = useState('')
  const [saveOpen, setSaveOpen] = useState(false)

  const allPresets = useMemo(() => state.presets ?? [], [state.presets])

  const visiblePresets = useMemo(() => {
    const repo = filterRepo?.trim()
    if (!repo) return allPresets
    return presetsForModel(allPresets, repo)
  }, [allPresets, filterRepo])

  async function persistPresets(nextPresets: CookbookServePreset[]) {
    await savePresets.mutateAsync({ state, presets: nextPresets })
  }

  function startEdit(preset: CookbookServePreset) {
    setEditingKey(presetKey(preset))
    setDraft({ ...preset })
  }

  function cancelEdit() {
    setEditingKey(null)
    setDraft(null)
  }

  async function handleDelete(preset: CookbookServePreset) {
    const label = presetDisplayLabel(preset)
    if (!window.confirm(`Delete saved config "${label}"?`)) return
    const key = presetKey(preset)
    const next = allPresets.filter((p) => presetKey(p) !== key)
    try {
      await persistPresets(next)
      if (editingKey === key) cancelEdit()
      toast.success(`Deleted "${label}"`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  async function handleSaveEdit() {
    if (!draft) return
    const label = draft.label?.trim()
    const model = draft.model?.trim()
    const cmd = draft.cmd?.trim()
    if (!label || !model || !cmd) {
      toast.error('Label, model, and command are required')
      return
    }
    const key = editingKey
    if (!key) return
    const next = allPresets.map((p) =>
      presetKey(p) === key
        ? {
            ...draft,
            name: draft.name?.trim() || model.split('/').pop() || model,
            label,
            model,
            cmd,
            remoteHost: presetHost(draft),
            port: String(draft.port ?? draft.fields?.port ?? '8000'),
          }
        : p,
    )
    try {
      await persistPresets(next)
      cancelEdit()
      toast.success('Preset updated')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    }
  }

  async function handleSaveCurrent() {
    const repo = currentConfig.repo.trim()
    const cmd = currentConfig.cmd.trim()
    if (!repo || !cmd) {
      toast.error('Set a model and command before saving')
      return
    }
    const label = saveLabel.trim()
    if (!label) {
      toast.error('Enter a name for this config')
      return
    }
    const modelSlots = presetsForModel(allPresets, repo)
    const normCmd = normalizeServeCmd(cmd)
    const duplicate = modelSlots.find((p) => normalizeServeCmd(p.cmd || '') === normCmd)
    if (duplicate) {
      toast.message(`Already saved as "${presetDisplayLabel(duplicate)}"`)
      return
    }
    if (modelSlots.length >= MAX_SERVE_PRESETS_PER_MODEL) {
      toast.error(`Max ${MAX_SERVE_PRESETS_PER_MODEL} saves per model`)
      return
    }
    const shortName = repo.split('/').pop() || repo
    const port = currentConfig.port.trim() || '8000'
    const fields: Record<string, string | boolean> = {
      port,
      backend: 'vllm',
    }
    if (currentConfig.gpus?.trim()) fields.gpus = currentConfig.gpus.trim()
    const preset: CookbookServePreset = {
      name: shortName,
      model: repo,
      label,
      cmd,
      remoteHost: currentConfig.host.trim(),
      port,
      backend: 'vllm',
      fields,
    }
    try {
      await persistPresets([...allPresets, preset])
      setSaveLabel('')
      setSaveOpen(false)
      toast.success(`Saved "${label}"`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    }
  }

  return (
    <section className={cn('rounded-lg border border-border bg-background p-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Serve presets</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Saved launch configs sync via cookbook state. Up to{' '}
            {MAX_SERVE_PRESETS_PER_MODEL} per model.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!currentConfig.repo.trim() || !currentConfig.cmd.trim()}
          onClick={() => setSaveOpen((v) => !v)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Save current
        </Button>
      </div>

      {saveOpen ? (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-border bg-panel/30 p-3">
          <div className="min-w-[200px] flex-1 space-y-1">
            <Label htmlFor="serve-preset-label">Config name</Label>
            <Input
              id="serve-preset-label"
              placeholder="e.g. LoRA, 8-bit, fast"
              value={saveLabel}
              onChange={(e) => setSaveLabel(e.target.value)}
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={savePresets.isPending}
            onClick={() => void handleSaveCurrent()}
          >
            Save
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setSaveOpen(false)}>
            Cancel
          </Button>
        </div>
      ) : null}

      {!visiblePresets.length ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {filterRepo?.trim()
            ? `No saved configs for ${filterRepo} yet.`
            : 'No saved serve configs yet.'}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {visiblePresets.map((preset, index) => {
            const key = presetKey(preset)
            const isEditing = editingKey === key && draft
            const label = presetDisplayLabel(preset, index)
            return (
              <li
                key={key}
                className="rounded-md border border-border bg-panel/20 px-3 py-2"
              >
                {isEditing && draft ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor={`preset-label-${key}`}>Label</Label>
                        <Input
                          id={`preset-label-${key}`}
                          value={draft.label ?? ''}
                          onChange={(e) =>
                            setDraft((d) => (d ? { ...d, label: e.target.value } : d))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`preset-model-${key}`}>Model repo</Label>
                        <Input
                          id={`preset-model-${key}`}
                          value={draft.model}
                          onChange={(e) =>
                            setDraft((d) => (d ? { ...d, model: e.target.value } : d))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`preset-host-${key}`}>Host</Label>
                        <Input
                          id={`preset-host-${key}`}
                          placeholder="empty = local"
                          value={presetHost(draft)}
                          onChange={(e) =>
                            setDraft((d) =>
                              d ? { ...d, remoteHost: e.target.value, host: e.target.value } : d,
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`preset-port-${key}`}>Port</Label>
                        <Input
                          id={`preset-port-${key}`}
                          value={String(draft.port ?? draft.fields?.port ?? '8000')}
                          onChange={(e) => setDraft((d) => (d ? { ...d, port: e.target.value } : d))}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`preset-cmd-${key}`}>Launch command</Label>
                      <textarea
                        id={`preset-cmd-${key}`}
                        className="min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs"
                        value={draft.cmd ?? ''}
                        onChange={(e) =>
                          setDraft((d) => (d ? { ...d, cmd: e.target.value } : d))
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={savePresets.isPending}
                        onClick={() => void handleSaveEdit()}
                      >
                        Save
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{label}</p>
                        {preset.confirmedWorking ? (
                          <span
                            className="inline-flex text-emerald-600 dark:text-emerald-400"
                            title="Confirmed working"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {preset.model} · {presetHost(preset) || 'local'} · port{' '}
                        {String(preset.port ?? preset.fields?.port ?? '8000')}
                      </p>
                      {preset.cmd ? (
                        <pre className="mt-1 max-h-12 overflow-hidden text-xs text-muted-foreground">
                          {preset.cmd}
                        </pre>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button type="button" size="sm" variant="secondary" onClick={() => onLoad(preset)}>
                        Load
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => startEdit(preset)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => void handleDelete(preset)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {filterRepo?.trim() && allPresets.length > visiblePresets.length ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Showing {visiblePresets.length} preset(s) for this model.{' '}
          {allPresets.length - visiblePresets.length} other saved config(s) hidden.
        </p>
      ) : null}
    </section>
  )
}
