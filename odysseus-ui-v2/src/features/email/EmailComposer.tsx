import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { SendEmailPayload } from '@/api/email-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RecipientField } from '@/features/email/RecipientField'
import { RichTextEditor } from '@/features/email/RichTextEditor'
import { htmlToPlainText } from '@/lib/emailSanitize'

export type ComposeInitial = {
  to?: string
  cc?: string
  subject?: string
  body?: string
  body_html?: string
  in_reply_to?: string
  references?: string
}

type StagedAttachment = {
  token: string
  filename: string
}

type EmailComposerProps = {
  open: boolean
  accountId: string | null
  initial?: ComposeInitial
  onClose: () => void
  onSend: (payload: SendEmailPayload) => Promise<void>
  onSaveDraft: (payload: SendEmailPayload) => Promise<void>
  onUpload: (file: File) => Promise<{ token: string; filename: string } | null>
  isSending?: boolean
}

function initialBodyHtml(initial?: ComposeInitial): string {
  if (initial?.body_html) return initial.body_html
  if (!initial?.body) return ''
  const text = initial.body
  if (/<[a-z][\s\S]*>/i.test(text)) return text
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped.replace(/\n/g, '<br>')
}

export function EmailComposer({
  open,
  accountId,
  initial,
  onClose,
  onSend,
  onSaveDraft,
  onUpload,
  isSending,
}: EmailComposerProps) {
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [replyMeta, setReplyMeta] = useState<{ in_reply_to?: string; references?: string }>({})
  const [attachments, setAttachments] = useState<StagedAttachment[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!open) return
    setTo(initial?.to ?? '')
    setCc(initial?.cc ?? '')
    setSubject(initial?.subject ?? '')
    setBodyHtml(initialBodyHtml(initial))
    setReplyMeta({
      in_reply_to: initial?.in_reply_to,
      references: initial?.references,
    })
    setAttachments([])
  }, [open, initial])

  if (!open) return null

  const buildPayload = (): SendEmailPayload => {
    const plain = htmlToPlainText(bodyHtml)
    return {
      to: to.trim(),
      cc: cc.trim() || undefined,
      subject: subject.trim(),
      body: plain,
      body_html: bodyHtml.trim() || undefined,
      in_reply_to: replyMeta.in_reply_to,
      references: replyMeta.references,
      attachments: attachments.map((a) => a.token),
      account_id: accountId ?? undefined,
      wait_for_delivery: true,
    }
  }

  const handleSend = async () => {
    if (!to.trim()) return
    await onSend(buildPayload())
    onClose()
  }

  const handleDraft = async () => {
    await onSaveDraft(buildPayload())
    onClose()
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const res = await onUpload(file)
      if (res) {
        setAttachments((prev) => [...prev, { token: res.token, filename: res.filename }])
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-background shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="compose-title"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 id="compose-title" className="font-semibold">
            Compose
          </h3>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <RecipientField
            id="compose-to"
            label="To"
            value={to}
            onChange={setTo}
            placeholder="recipient@example.com"
            required
          />
          <RecipientField
            id="compose-cc"
            label="Cc"
            value={cc}
            onChange={setCc}
            placeholder="Optional"
          />
          <div className="space-y-1">
            <Label htmlFor="compose-subject">Subject</Label>
            <Input
              id="compose-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="compose-body">Message</Label>
            <RichTextEditor
              id="compose-body"
              value={bodyHtml}
              onChange={setBodyHtml}
              placeholder="Write your message…"
            />
          </div>
          <div>
            <Label htmlFor="compose-attach" className="mb-1 block">
              Attachments
            </Label>
            <Input
              id="compose-attach"
              type="file"
              onChange={(e) => void handleFile(e)}
              disabled={uploading}
            />
            {attachments.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {attachments.map((a) => (
                  <li key={a.token}>{a.filename}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <Button type="button" variant="secondary" onClick={() => void handleDraft()} disabled={isSending}>
            Save draft
          </Button>
          <Button type="button" onClick={() => void handleSend()} disabled={isSending || !to.trim()}>
            {isSending ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  )
}
