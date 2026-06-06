import { MessageBubble } from '@/components/chat/MessageBubble'
import type { GroupTurn } from '@/api/types'

interface GroupMessageListProps {
  turns: GroupTurn[]
  isStreaming: boolean
}

export function GroupMessageList({ turns, isStreaming }: GroupMessageListProps) {
  if (turns.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted">
        Send a message to start the group conversation.
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-4" role="log" aria-live="polite">
      {turns.map((turn) => (
        <div key={turn.id} className="space-y-3">
          <MessageBubble role="user" content={turn.userMessage} />
          <div className="space-y-3 pl-2 border-l-2 border-border">
            {turn.responses.map((r) => (
              <div key={r.participantId}>
                <div className="mb-1 text-xs font-medium text-primary">{r.label}</div>
                <MessageBubble
                  role="assistant"
                  content={r.content}
                  isStreaming={r.isStreaming && isStreaming}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
