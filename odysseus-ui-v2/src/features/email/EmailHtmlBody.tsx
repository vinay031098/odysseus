import { useMemo } from 'react'
import type { EmailMessage } from '@/api/email-types'
import {
  hasThreadBubbleLayout,
  isHtmlEmailBody,
  renderEmailBodyHtml,
} from '@/lib/emailBodyRender'
import { MarkdownMessage } from '@/components/chat/MarkdownMessage'
import { cn } from '@/lib/utils'

type EmailHtmlBodyProps = {
  message: Pick<
    EmailMessage,
    | 'body'
    | 'body_html'
    | 'thread_turns'
    | 'boundaries'
    | 'sender_signature'
    | 'from_address'
    | 'from_name'
    | 'date'
    | 'folder'
  >
  bubblesDisabled?: boolean
  mineAddresses?: string[]
  className?: string
}

export function EmailHtmlBody({
  message,
  bubblesDisabled = false,
  mineAddresses,
  className,
}: EmailHtmlBodyProps) {
  const body = (message.body || '').trim()
  const useMarkdown = body.includes('```') || /^#{1,6}\s/m.test(body)
  const bubbleLayout =
    !bubblesDisabled && hasThreadBubbleLayout(message)
  const useHtml =
    isHtmlEmailBody(message) ||
    !!message.body_html ||
    !!message.thread_turns?.length ||
    bubbleLayout

  const html = useMemo(() => {
    if (!useHtml || useMarkdown) return ''
    try {
      return renderEmailBodyHtml(message, { bubblesDisabled, mineAddresses })
    } catch {
      return ''
    }
  }, [message, useHtml, useMarkdown, bubblesDisabled, mineAddresses])

  if (!body && !message.body_html) {
    return <p className="text-sm text-muted italic">No message body.</p>
  }

  if (useMarkdown) {
    return <MarkdownMessage content={body} />
  }

  if (useHtml && html) {
    return (
      <div
        className={cn(
          'email-reader-body html-body text-sm leading-relaxed',
          bubbleLayout && 'email-reader-bubbles',
          className,
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  return <div className={cn('whitespace-pre-wrap text-sm leading-relaxed', className)}>{body}</div>
}
