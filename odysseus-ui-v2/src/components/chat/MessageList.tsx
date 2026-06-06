import { useEffect, useRef } from 'react'
import type { ChatMessage, StreamLiveState } from '@/api/types'
import { AskUserCard } from './AskUserCard'
import { MessageBubble, type MessageActions } from './MessageBubble'
import { StreamStatusBar } from './StreamStatusBar'

interface MessageListProps {
  messages: ChatMessage[]
  isStreaming: boolean
  isLoading?: boolean
  emptyState?: React.ReactNode
  sessionId: string | null
  streamLive?: StreamLiveState
  pendingPlanSessionId?: string | null
  pendingAskUser?: import('@/api/types').AskUserPayload | null
  ttsAutoPlay?: boolean
  onEditUser?: (index: number, text: string) => void
  onDelete?: (index: number) => void
  onRegenerate?: (aiIndex: number) => void
  onResend?: (userIndex: number) => void
  onFork?: (aiIndex: number) => void
  onSwitchVariant?: (aiIndex: number, variantIndex: number) => void
  onApprovePlan?: () => void
  onOpenPlanWindow?: () => void
  onAskUserSelect?: (answer: string) => void
  onAskUserDismiss?: () => void
}

export function MessageList({
  messages,
  isStreaming,
  isLoading,
  emptyState,
  sessionId,
  streamLive,
  pendingPlanSessionId,
  ttsAutoPlay = false,
  onEditUser,
  onDelete,
  onRegenerate,
  onResend,
  onFork,
  onSwitchVariant,
  onApprovePlan,
  onOpenPlanWindow,
  pendingAskUser,
  onAskUserSelect,
  onAskUserDismiss,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming, streamLive?.statusText, pendingAskUser])

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading conversation…
      </div>
    )
  }

  if (!messages.length && emptyState) {
    return <div className="flex flex-1 flex-col items-center justify-center p-8">{emptyState}</div>
  }

  const buildActions = (msg: ChatMessage, index: number): MessageActions | undefined => {
    if (isStreaming && index === messages.length - 1) return undefined
    const isUser = msg.role === 'user'
    return {
      onEdit: isUser && onEditUser ? (text) => onEditUser(index, text) : undefined,
      onDelete: onDelete ? () => onDelete(index) : undefined,
      onRegenerate: !isUser && onRegenerate ? () => onRegenerate(index) : undefined,
      onResend: isUser && onResend ? () => onResend(index) : undefined,
      onFork: !isUser && onFork && sessionId ? () => onFork(index) : undefined,
      onSwitchVariant:
        !isUser && onSwitchVariant && sessionId
          ? (variantIndex) => onSwitchVariant(index, variantIndex)
          : undefined,
      onApprovePlan,
      onOpenPlanWindow,
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {isStreaming && streamLive ? <StreamStatusBar live={streamLive} /> : null}
        {messages.map((msg, i) => (
          <MessageBubble
            key={`${i}-${msg.role}-${msg.content.slice(0, 24)}`}
            role={msg.role}
            content={msg.content}
            message={msg}
            isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
            ttsAutoPlay={ttsAutoPlay}
            streamThinking={
              isStreaming && i === messages.length - 1 ? streamLive?.thinking : undefined
            }
            showPlanApprove={
              Boolean(
                pendingPlanSessionId &&
                  sessionId === pendingPlanSessionId &&
                  i === messages.length - 1 &&
                  msg.role === 'assistant',
              )
            }
            actions={buildActions(msg, i)}
          />
        ))}
        {pendingAskUser && onAskUserSelect ? (
          <AskUserCard
            payload={pendingAskUser}
            onSelect={onAskUserSelect}
            onDismiss={onAskUserDismiss}
          />
        ) : null}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
