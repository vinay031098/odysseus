import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAgentMutations } from '@/hooks/useAgents'

interface SkillImportPanelProps {
  onImported?: (name: string) => void
}

export function SkillImportPanel({ onImported }: SkillImportPanelProps) {
  const { importUrl, create } = useAgentMutations()
  const [url, setUrl] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [whenToUse, setWhenToUse] = useState('')

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    const res = await importUrl.mutateAsync(trimmed)
    setUrl('')
    if (res.skill?.name) onImported?.(res.skill.name)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const desc = description.trim() || name.trim()
    if (!desc) return
    const res = await create.mutateAsync({
      name: name.trim() || undefined,
      description: desc,
      when_to_use: whenToUse.trim() || undefined,
      status: 'draft',
    })
    setName('')
    setDescription('')
    setWhenToUse('')
    setShowAdd(false)
    if (res.skill?.name) onImported?.(res.skill.name)
  }

  return (
    <div className="space-y-3 border-b border-border px-4 py-3">
      <form onSubmit={(e) => void handleImport(e)} className="space-y-2">
        <Label htmlFor="skill-import-url" className="text-xs">
          Import from URL
        </Label>
        <div className="flex gap-2">
          <Input
            id="skill-import-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="GitHub or skills.sh URL"
            className="h-8 text-xs"
            disabled={importUrl.isPending}
          />
          <Button type="submit" size="sm" disabled={importUrl.isPending || !url.trim()}>
            Import
          </Button>
        </div>
      </form>

      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setShowAdd((v) => !v)}
        >
          {showAdd ? 'Cancel' : 'Add skill'}
        </Button>
        {showAdd ? (
          <form onSubmit={(e) => void handleAdd(e)} className="mt-2 space-y-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              className="h-8 text-xs"
            />
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="h-8 text-xs"
              required
            />
            <Input
              value={whenToUse}
              onChange={(e) => setWhenToUse(e.target.value)}
              placeholder="When to use (optional)"
              className="h-8 text-xs"
            />
            <Button type="submit" size="sm" disabled={create.isPending}>
              Create draft
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  )
}
