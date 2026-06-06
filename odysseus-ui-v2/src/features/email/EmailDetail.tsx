import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  Loader2,
  Mail,
  MailOpen,
  MessageSquare,
  Paperclip,
  Reply,
  Sparkles,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { addContact } from '@/api/contacts'
import type { EmailMessage } from '@/api/email-types'
import { attachmentDownloadUrl } from '@/api/email'
import { Button } from '@/components/ui/button'
import { EmailHtmlBody } from '@/features/email/EmailHtmlBody'
import { useEmailBubblesPref } from '@/hooks/useEmailBubblesPref'
import { useEmailReaderSwipe } from '@/hooks/useEmailReaderSwipe'
import { hasThreadBubbleLayout } from '@/lib/emailBodyRender'
import { cleanAiReplyText } from '@/lib/emailHelpers'

type AiReplyMode = 'fast' | 'full'

type EmailDetailProps = {
  message: EmailMessage | null | undefined
  folder: string
  accountId: string | null
  mineAddresses?: string[]
  isLoading?: boolean
  onReply: () => void
  onAiReply: (body: string) => void
  onSummarize: () => Promise<string | null>
  summarizePending?: boolean
  onAiReplyGenerate: (mode: AiReplyMode) => Promise<string | null>
  aiReplyPending?: boolean
  onMarkRead: () => void
  onMarkUnread: () => void
  onArchive: () => void
  onDelete: () => void
  onNavigatePrev?: () => void
  onNavigateNext?: () => void
}

export function EmailDetail({
  message,
  folder,
  accountId,
  mineAddresses,
  isLoading,
  onReply,
  onAiReply,
  onSummarize,
  summarizePending,
  onAiReplyGenerate,
  aiReplyPending,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onDelete,
  onNavigatePrev,
  onNavigateNext,
}: EmailDetailProps) {
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryText, setSummaryText] = useState<string | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [aiMenuOpen, setAiMenuOpen] = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const readerRef = useRef<HTMLDivElement>(null)
  const { bubblesDisabled, toggleBubbles } = useEmailBubblesPref()

  const showBubbleToggle = useMemo(
    () => !!message && hasThreadBubbleLayout(message),
    [message],
  )

  useEmailReaderSwipe(readerRef, {
    enabled: !!message,
    onPrev: onNavigatePrev,
    onNext: onNavigateNext,
  })

  useEffect(() => {
    setSummaryOpen(false)
    setSummaryText(null)
    setSummaryError(null)
    setAiMenuOpen(false)
  }, [message?.uid])

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-sm text-muted">Loading message…</div>
  }

  if (!message) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        Select a message to read
      </div>
    )
  }

  if (message.error) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-destructive">
        {message.error}
      </div>
    )
  }

  const cachedSummary = message.cached_summary?.trim()
  const cachedAiReply = message.cached_ai_reply?.trim()
  const displaySummary = summaryText ?? cachedSummary ?? null

  function toggleSummary() {
    setSummaryOpen((open) => !open)
  }

  async function generateSummary() {
    setSummaryError(null)
    const result = await onSummarize()
    if (result) {
      setSummaryText(result)
    } else {
      setSummaryError('Failed to summarize')
    }
  }

  async function runAiReply(mode: AiReplyMode) {
    setAiMenuOpen(false)
    if (cachedAiReply) {
      onAiReply(cleanAiReplyText(cachedAiReply))
      return
    }
    const result = await onAiReplyGenerate(mode)
    if (result) {
      onAiReply(cleanAiReplyText(result))
    }
  }

  function handleAiReplyClick() {
    if (cachedAiReply) {
      void runAiReply('full')
      return
    }
    setAiMenuOpen((v) => !v)
  }

  async function saveSenderToContacts() {
    if (!message) return
    const email = (message.from_address || '').trim()
    if (!email) {
      toast.error('No sender address')
      return
    }
    const name = (message.from_name || '').trim() || email.split('@')[0]
    setSavingContact(true)
    try {
      const result = await addContact({ name, email })
      if (result.success && result.message === 'Already exists') {
        toast.message('Already in contacts')
      } else if (result.success) {
        toast.success('Saved to contacts')
      } else {
        toast.error(result.error || 'Failed to save contact')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save contact')
    } finally {
      setSavingContact(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <h2 className="text-lg font-semibold leading-snug">{message.subject || '(no subject)'}</h2>
        <div className="mt-2 space-y-1 text-sm text-muted">
          <p>
            <span className="text-foreground font-medium">From:</span>{' '}
            {message.from_name || message.from_address}
            {message.from_address && message.from_name !== message.from_address && (
              <span className="text-muted"> &lt;{message.from_address}&gt;</span>
            )}
          </p>
          {message.to && (
            <p>
              <span className="text-foreground font-medium">To:</span> {message.to}
            </p>
          )}
          {message.cc && (
            <p>
              <span className="text-foreground font-medium">Cc:</span> {message.cc}
            </p>
          )}
          {message.date && (
            <p className="text-xs">{new Date(message.date).toLocaleString()}</p>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={onReply}>
            <Reply className="h-4 w-4" />
            Reply
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void saveSenderToContacts()}
            disabled={savingContact}
            title="Save sender to contacts"
          >
            {savingContact ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Save contact
          </Button>
          <div className="relative">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAiReplyClick}
              disabled={aiReplyPending}
              aria-expanded={aiMenuOpen}
              aria-haspopup="menu"
            >
              {aiReplyPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              AI reply
              {cachedAiReply && (
                <span className="ml-1 text-[10px] text-primary">cached</span>
              )}
            </Button>
            {aiMenuOpen && !cachedAiReply && (
              <div
                role="menu"
                className="absolute left-0 top-full z-10 mt-1 flex gap-1 rounded-md border border-border bg-panel p-1 shadow-md"
              >
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  role="menuitem"
                  onClick={() => void runAiReply('fast')}
                >
                  Fast
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  role="menuitem"
                  onClick={() => void runAiReply('full')}
                >
                  Full
                </Button>
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant={summaryOpen ? 'secondary' : 'ghost'}
            onClick={toggleSummary}
            disabled={summarizePending}
          >
            {summarizePending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Summary
          </Button>
          {showBubbleToggle && (
            <Button
              size="sm"
              variant={bubblesDisabled ? 'ghost' : 'secondary'}
              onClick={toggleBubbles}
              title={
                bubblesDisabled
                  ? 'Show threaded chat bubbles'
                  : 'Show plain thread folds'
              }
            >
              <MessageSquare className="h-4 w-4" />
              {bubblesDisabled ? 'Bubbles off' : 'Bubbles'}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onMarkRead} title="Mark read">
            <MailOpen className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onMarkUnread} title="Mark unread">
            <Mail className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onArchive}>
            <Archive className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div ref={readerRef} className="flex-1 overflow-y-auto p-4">
        {summaryOpen && (
          <div className="mb-4 rounded-md border border-border bg-panel/50 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              Summary
            </div>
            {summarizePending ? (
              <p className="text-sm text-muted">Generating summary…</p>
            ) : summaryError ? (
              <p className="text-sm text-destructive">{summaryError}</p>
            ) : displaySummary ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{displaySummary}</div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <span>No AI summary yet.</span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void generateSummary()}
                  disabled={summarizePending}
                >
                  Generate now
                </Button>
              </div>
            )}
          </div>
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-4 rounded-md border border-border bg-panel/50 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Paperclip className="h-4 w-4" />
              Attachments
            </div>
            <ul className="space-y-1">
              {message.attachments.map((att) => (
                <li key={att.index}>
                  <a
                    href={attachmentDownloadUrl(message.uid, att.index, folder, accountId)}
                    className="text-sm text-primary underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {att.filename || `Attachment ${att.index + 1}`}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <EmailHtmlBody
          message={{ ...message, folder }}
          bubblesDisabled={bubblesDisabled}
          mineAddresses={mineAddresses}
        />
      </div>
    </div>
  )
}
