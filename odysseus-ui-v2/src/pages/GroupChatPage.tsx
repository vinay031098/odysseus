import { useMemo, useState } from 'react'
import { Square } from 'lucide-react'
import { BUILTIN_RECIPES, fetchUserTemplates, templatesToRecipes } from '@/api/cookbook'
import { Button } from '@/components/ui/button'
import { ChatComposer } from '@/components/chat/ChatComposer'
import { GroupMessageList } from '@/features/group-chat/GroupMessageList'
import { GroupSetup } from '@/features/group-chat/GroupSetup'
import { useGroupChat } from '@/hooks/useGroupChat'
import { useModels } from '@/hooks/useModels'
import { useQuery } from '@tanstack/react-query'
import type { GroupCharacter } from '@/api/types'

export function GroupChatPage() {
  const group = useGroupChat()
  const { modelOptions, isLoading: modelsLoading } = useModels()
  const { data: templates = [] } = useQuery({
    queryKey: ['group-chat', 'characters'],
    queryFn: fetchUserTemplates,
  })

  const characters = useMemo((): GroupCharacter[] => {
    const fromTemplates = templatesToRecipes(templates).map((t) => ({
      id: t.id,
      name: t.name,
      prompt: t.prompt,
    }))
    const fromBuiltin = BUILTIN_RECIPES.map((r) => ({
      id: r.id,
      name: r.name,
      prompt: r.prompt,
    }))
    return [...fromTemplates, ...fromBuiltin]
  }, [templates])

  const [draft, setDraft] = useState('')

  if (!group.active) {
    return (
      <GroupSetup
        models={modelOptions}
        characters={characters}
        mode={group.mode}
        onModeChange={group.setMode}
        participants={group.participants}
        onParticipantsChange={group.setParticipants}
        isStarting={group.isStreaming || modelsLoading}
        onStart={() => void group.start(group.participants, group.mode)}
      />
    )
  }

  return (
    <div className="flex h-full min-h-[480px] flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h1 className="text-sm font-semibold">Group chat</h1>
          <p className="text-xs text-muted capitalize">{group.mode.replace('-', ' ')}</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={group.stop}>
          <Square className="h-4 w-4" />
          End group
        </Button>
      </div>

      <GroupMessageList turns={group.turns} isStreaming={group.isStreaming} />

      <div className="border-t border-border p-3">
        <ChatComposer
          onSend={(msg) => {
            setDraft('')
            void group.sendMessage(msg)
          }}
          onStop={group.abortStreaming}
          isStreaming={group.isStreaming}
          disabled={group.isStreaming}
          initialValue={draft}
          placeholder="Message the group…"
          useRag={false}
          onUseRagChange={() => {}}
          incognito={false}
          onIncognitoChange={() => {}}
        />
      </div>
    </div>
  )
}
