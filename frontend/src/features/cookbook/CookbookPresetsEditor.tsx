import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  deleteUserTemplate,
  saveUserTemplate,
} from '@/api/cookbook'
import type { CookbookRecipe } from '@/api/types'
import { useCookbook } from '@/hooks/useCookbook'
import { toast } from 'sonner'

interface CookbookPresetsEditorProps {
  selected: CookbookRecipe | null
  isAdmin: boolean
  onSelect: (id: string) => void
}

const emptyDraft = (): { name: string; prompt: string; temperature: string } => ({
  name: '',
  prompt: '',
  temperature: '1.0',
})

export function CookbookPresetsEditor({
  selected,
  isAdmin,
  onSelect,
}: CookbookPresetsEditorProps) {
  const queryClient = useQueryClient()
  const { refetch } = useCookbook()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(emptyDraft())

  const saveMutation = useMutation({
    mutationFn: saveUserTemplate,
    onSuccess: async (res) => {
      if (!res.success) throw new Error(res.message || 'Save failed')
      await queryClient.invalidateQueries({ queryKey: ['cookbook-recipes'] })
      await refetch()
      if (res.template?.id) onSelect(res.template.id)
      setEditing(false)
      setDraft(emptyDraft())
      toast.success('Template saved')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUserTemplate,
    onSuccess: async (res) => {
      if (!res.success) throw new Error(res.message || 'Delete failed')
      await queryClient.invalidateQueries({ queryKey: ['cookbook-recipes'] })
      await refetch()
      toast.success('Template deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function startCreate() {
    setDraft(emptyDraft())
    setEditing(true)
  }

  function startEdit(recipe: CookbookRecipe) {
    if (recipe.source !== 'template') {
      toast.message('Built-in presets are read-only — save a copy as a template')
      setDraft({
        name: `${recipe.name} (copy)`,
        prompt: recipe.prompt,
        temperature: String(recipe.temperature ?? 1),
      })
    } else {
      setDraft({
        name: recipe.name,
        prompt: recipe.prompt,
        temperature: String(recipe.temperature ?? 1),
      })
    }
    setEditing(true)
  }

  async function handleSave() {
    if (!draft.name.trim() || !draft.prompt.trim()) {
      toast.error('Name and prompt are required')
      return
    }
    const temp = parseFloat(draft.temperature)
    await saveMutation.mutateAsync({
      id: selected?.source === 'template' ? selected.id : '',
      name: draft.name.trim(),
      system_prompt: draft.prompt.trim(),
      temperature: Number.isFinite(temp) ? temp : 1,
      max_tokens: 0,
    })
  }

  async function handleDelete(recipe: CookbookRecipe) {
    if (recipe.source !== 'template') {
      toast.error('Only user templates can be deleted')
      return
    }
    if (!window.confirm(`Delete template "${recipe.name}"?`)) return
    await deleteMutation.mutateAsync(recipe.id)
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={startCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New template
          </Button>
          {selected && (
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => startEdit(selected)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
              {selected.source === 'template' && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => void handleDelete(selected)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {editing && isAdmin && (
        <div className="rounded-lg border border-border bg-background p-4 space-y-3">
          <h3 className="text-sm font-semibold">
            {selected?.source === 'template' ? 'Edit template' : 'New template'}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="preset-name">Name</Label>
              <Input
                id="preset-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="preset-temp">Temperature</Label>
              <Input
                id="preset-temp"
                value={draft.temperature}
                onChange={(e) => setDraft((d) => ({ ...d, temperature: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="preset-prompt">System prompt</Label>
            <textarea
              id="preset-prompt"
              className="min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={draft.prompt}
              onChange={(e) => setDraft((d) => ({ ...d, prompt: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => void handleSave()} disabled={saveMutation.isPending}>
              Save
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!isAdmin && (
        <p className="text-xs text-muted-foreground">
          Template editing requires an admin account. Presets remain readable below.
        </p>
      )}
    </div>
  )
}
