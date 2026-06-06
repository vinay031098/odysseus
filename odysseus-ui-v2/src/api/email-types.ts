export type EmailAccount = {
  id: string
  name: string
  is_default: boolean
  enabled: boolean
  imap_host: string
  imap_port: number
  imap_user: string
  smtp_host: string
  smtp_port: number
  smtp_user: string
  from_address: string
  has_imap_password: boolean
  has_smtp_password: boolean
}

export type EmailListItem = {
  uid: string
  message_id?: string
  subject: string
  from_name: string
  from_address: string
  to?: string
  cc?: string
  date: string
  date_display?: string
  date_epoch: number
  size?: number
  is_read: boolean
  is_answered?: boolean
  is_flagged?: boolean
  has_attachments?: boolean
  cached_summary?: string
  cached_ai_reply?: string
}

export type EmailAttachmentMeta = {
  index: number
  filename: string
  content_type?: string
  size?: number
}

export type EmailThreadTurn = {
  level: number
  body_html: string
  meta?: string
}

export type EmailBoundaries = {
  sig_start: number
  quote_start: number
}

export type EmailMessage = {
  uid: string
  folder?: string
  message_id: string
  subject: string
  from_name: string
  from_address: string
  to: string
  cc?: string
  date: string
  in_reply_to?: string
  references?: string
  body: string
  body_html?: string
  thread_turns?: EmailThreadTurn[]
  boundaries?: EmailBoundaries | null
  sender_signature?: string | null
  attachments?: EmailAttachmentMeta[]
  cached_summary?: string
  cached_ai_reply?: string
  account_id?: string
  error?: string
}

export type ScheduledEmail = {
  id: string
  to: string
  cc?: string
  subject: string
  send_at: string
  created_at?: string
  status: 'pending' | 'failed' | 'sent'
  error?: string
}

export type SummarizeEmailPayload = {
  body: string
  subject?: string
  from?: string
  uid?: string
  folder?: string
  message_id?: string
  account_id?: string
}

export type SummarizeEmailResult = {
  success: boolean
  summary?: string
  model_used?: string
  error?: string
}

export type AiReplyPayload = {
  to: string
  subject: string
  original_body: string
  model?: string
  session_id?: string
  message_id?: string
  uid?: string
  folder?: string
  fast?: boolean
}

export type AiReplyResult = {
  success: boolean
  reply?: string
  model_used?: string
  cached?: boolean
  error?: string
}

export type EmailListResponse = {
  emails: EmailListItem[]
  total: number
  folder?: string
  offset?: number
  error?: string
}

export type EmailSearchResponse = {
  emails: EmailListItem[]
  total: number
  query?: string
  error?: string
}

export type SendEmailPayload = {
  to: string
  cc?: string
  bcc?: string
  subject: string
  body: string
  body_html?: string
  in_reply_to?: string
  references?: string
  attachments?: string[]
  account_id?: string
  wait_for_delivery?: boolean
}

export type ComposeUploadResult = {
  success: boolean
  token?: string
  filename?: string
  size?: number
  error?: string
}

export type EmailMutationResult = {
  success?: boolean
  ok?: boolean
  error?: string
  message?: string
  queued?: boolean
}
