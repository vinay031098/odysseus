import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { GroupCharacter, GroupMode, GroupParticipant } from '@/api/types'
import type { ModelOption } from '@/api/types'
import { participantLabel } from '@/lib/groupChatHelpers'

interface GroupSetupProps {
  models: ModelOption[]
  characters: GroupCharacter[]
  mode: GroupMode
  onModeChange: (mode: GroupMode) => void
  participants: GroupParticipant[]
  onParticipantsChange: (next: GroupParticipant[]) => void
  onStart: () => void
  isStarting: boolean
}

function newParticipantId() {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export function GroupSetup({
  models,
  characters,
  mode,
  onModeChange,
  participants,
  onParticipantsChange,
  onStart,
  isStarting,
}: GroupSetupProps) {
  const [pickModel, setPickModel] = useState('')
  const [pickCharacter, setPickCharacter] = useState('')

  const onlineModels = useMemo(() => models.filter((m) => !m.offline), [models])

  const addParticipant = () => {
    const model = onlineModels.find((m) => m.id === pickModel)
    if (!model) return
    if (participants.length >= 8) return
    const character = characters.find((c) => c.id === pickCharacter)
    onParticipantsChange([
      ...participants,
      {
        id: newParticipantId(),
        modelId: model.id,
        modelLabel: model.label,
        url: model.url,
        endpointId: model.endpointId,
        character: character ?? undefined,
      },
    ])
    setPickModel('')
    setPickCharacter('')
  }

  const removeParticipant = (id: string) => {
    onParticipantsChange(participants.filter((p) => p.id !== id))
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Group chat</h1>
        <p className="mt-2 text-sm text-muted">
          Multi-model conversation — round-robin or parallel replies. Pick at least two models.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="group-mode">Mode</Label>
        <select
          id="group-mode"
          value={mode}
          onChange={(e) => onModeChange(e.target.value as GroupMode)}
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="round-robin">Round-robin (sequential)</option>
          <option value="parallel">Parallel (simultaneous)</option>
        </select>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-panel p-4">
        <div className="text-sm font-medium">Participants</div>
        {participants.length === 0 ? (
          <p className="text-xs text-muted">No participants yet.</p>
        ) : (
          <ul className="space-y-2">
            {participants.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  {participantLabel(p)}
                  <span className="ml-2 text-xs text-muted">{p.modelLabel}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${participantLabel(p)}`}
                  onClick={() => removeParticipant(p.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="group-model">Model</Label>
            <select
              id="group-model"
              value={pickModel}
              onChange={(e) => setPickModel(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">Select model…</option>
              {onlineModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="group-character">Character (optional)</Label>
            <select
              id="group-character"
              value={pickCharacter}
              onChange={(e) => setPickCharacter(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">None</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!pickModel || participants.length >= 8}
          onClick={addParticipant}
        >
          <Plus className="h-4 w-4" />
          Add participant
        </Button>
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={participants.length < 2 || isStarting}
        onClick={onStart}
      >
        {isStarting ? 'Starting…' : 'Start group chat'}
      </Button>
    </div>
  )
}
