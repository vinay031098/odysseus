import { useMemo, useState } from 'react'
import { GitBranch, Pencil, RefreshCw, Trash2, X } from 'lucide-react'
import { MarkdownMessage } from '@/components/chat/MarkdownMessage'
import { MessageSources } from '@/components/chat/MessageSources'
import { PlanApproveBar } from '@/components/chat/PlanWindow'
import { ThinkingBlock } from '@/components/chat/ThinkingBlock'
import { TtsButton } from '@/components/chat/VoiceTtsButtons'
import { VariantNav } from '@/components/chat/VariantNav'
import { parseThinkingContent } from '@/lib/thinkingParser'
import { cn } from '@/lib/utils'
import type { ChatMessage, WebSource } from '@/api/types'

export interface MessageActions {
  onEdit?: (newText: string) => void
  onDelete?: () => void
  onRegenerate?: () => void
  onResend?: () => void
  onFork?: () => void
  onSwitchVariant?: (index: number) => void
  onApprovePlan?: () => void
  onOpenPlanWindow?: () => void
}

interface MessageBubbleProps {
  role: string
  content: string
  message?: ChatMessage
  isStreaming?: boolean
  ttsAutoPlay?: boolean
  showPlanApprove?: boolean
  streamThinking?: string
  actions?: MessageActions
}

export function MessageBubble({
  role,
  content,
  message,
  isStreaming,
  ttsAutoPlay = false,
  showPlanApprove,
  streamThinking,
  actions,
}: MessageBubbleProps) {
  const isUser = role === 'user'
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(content)

  const parsed = useMemo(() => parseThinkingContent(content), [content])
  const thinkingText =
    streamThinking ||
    (typeof message?.metadata?.thinking === 'string' ? message.metadata.thinking : '') ||
    parsed.thinking
  const visibleContent = parsed.content || (parsed.thinking ? '' : content)

  const webSources = message?.metadata?.web_sources as WebSource[] | undefined
  const researchSources = message?.metadata?.research_sources as WebSource[] | undefined
  const ragSources = message?.metadata?.rag_sources
  const ttsText = visibleContent || (isStreaming ? content : '')

  const actionBar = actions && !isStreaming && (
    <div className="mt-2 flex flex-wrap items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      {isUser && actions.onEdit && (
        <button
          type="button"
          className="rounded px-1.5 py-0.5 text-xs hover:bg-background/20"
          title="Edit"
          onClick={() => {
            setEditText(content)
            setEditing(true)
          }}
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}
      {isUser && actions.onResend && (
        <button
          type="button"
          className="rounded px-1.5 py-0.5 text-xs hover:bg-background/20"
          title="Resend"
          onClick={actions.onResend}
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      )}
      {!isUser && actions.onRegenerate && (
        <button
          type="button"
          className="rounded px-1.5 py-0.5 text-xs hover:bg-muted"
          title="Regenerate"
          onClick={actions.onRegenerate}
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      )}
      {!isUser && actions.onFork && (
        <button
          type="button"
          className="rounded px-1.5 py-0.5 text-xs hover:bg-muted"
          title="Fork conversation"
          onClick={actions.onFork}
        >
          <GitBranch className="h-3 w-3" />
        </button>
      )}
      {actions.onDelete && (
        <button
          type="button"
          className="rounded px-1.5 py-0.5 text-xs hover:bg-muted"
          title="Delete"
          onClick={actions.onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  )

  return (
    <div className={cn('group flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          isUser
            ? 'theme-user-bubble max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed'
            : 'theme-ai-bubble max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-relaxed',
        )}
      >
        {editing && isUser ? (
          <div className="space-y-2">
            <textarea
              className="w-full resize-none rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
              rows={Math.max(2, editText.split('\n').length)}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded bg-background/20 px-2 py-0.5 text-xs"
                onClick={() => {
                  actions?.onEdit?.(editText)
                  setEditing(false)
                }}
              >
                Send
              </button>
              <button
                type="button"
                className="rounded px-2 py-0.5 text-xs opacity-80"
                onClick={() => setEditing(false)}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <>
            <MessageSources
              webSources={webSources}
              researchSources={researchSources}
              ragSources={ragSources}
            />
            {thinkingText ? (
              <ThinkingBlock thinking={thinkingText} isStreaming={isStreaming && !parsed.closed} />
            ) : null}
            {visibleContent ? (
              <MarkdownMessage content={visibleContent} censor enableCodeRunner />
            ) : isStreaming ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
              </span>
            ) : null}
            {!isUser && ttsText ? (
              <div
                className={cn(
                  'mt-2 flex flex-wrap items-center gap-1',
                  !isStreaming && 'opacity-0 transition-opacity group-hover:opacity-100',
                  isStreaming && 'sr-only',
                )}
              >
                <TtsButton text={ttsText} autoPlay={ttsAutoPlay} isStreaming={isStreaming} />
              </div>
            ) : null}
            {message && actions?.onSwitchVariant ? (
              <VariantNav message={message} onSwitch={actions.onSwitchVariant} />
            ) : null}
            {showPlanApprove && actions?.onApprovePlan && actions?.onOpenPlanWindow ? (
              <PlanApproveBar
                onApprove={actions.onApprovePlan}
                onOpenWindow={actions.onOpenPlanWindow}
              />
            ) : null}
          </>
        )}
        {actionBar}
      </div>
    </div>
  )
}
