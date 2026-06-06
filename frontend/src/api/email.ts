import { api } from './client'
import { buildEmailQueryParams } from '@/lib/emailHelpers'
import type {
  AiReplyPayload,
  AiReplyResult,
  ComposeUploadResult,
  EmailAccount,
  EmailListResponse,
  EmailMessage,
  EmailMutationResult,
  EmailSearchResponse,
  ScheduledEmail,
  SendEmailPayload,
  SummarizeEmailPayload,
  SummarizeEmailResult,
} from './email-types'

type AccountScope = { accountId?: string | null }

export async function fetchEmailAccounts(): Promise<EmailAccount[]> {
  const res = await api.get<{ accounts: EmailAccount[] }>('/api/email/accounts')
  return res.accounts ?? []
}

export async function fetchEmailFolders({ accountId }: AccountScope = {}): Promise<string[]> {
  const qs = buildEmailQueryParams({ account_id: accountId })
  const res = await api.get<{ folders: string[]; error?: string }>(`/api/email/folders${qs}`)
  return res.folders ?? []
}

export type ListEmailsParams = AccountScope & {
  folder?: string
  limit?: number
  offset?: number
  filter?: 'all' | 'unread' | 'unanswered'
}

export async function fetchEmailList(params: ListEmailsParams = {}): Promise<EmailListResponse> {
  const qs = buildEmailQueryParams({
    folder: params.folder ?? 'INBOX',
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
    filter: params.filter ?? 'all',
    account_id: params.accountId,
  })
  return api.get<EmailListResponse>(`/api/email/list${qs}`)
}

export type SearchEmailsParams = AccountScope & {
  q: string
  folder?: string
  limit?: number
}

export async function searchEmails(params: SearchEmailsParams): Promise<EmailSearchResponse> {
  const qs = buildEmailQueryParams({
    q: params.q,
    folder: params.folder ?? 'INBOX',
    limit: params.limit ?? 50,
    account_id: params.accountId,
  })
  return api.get<EmailSearchResponse>(`/api/email/search${qs}`)
}

export type ReadEmailParams = AccountScope & {
  uid: string
  folder?: string
  markSeen?: boolean
}

export async function fetchEmailMessage(params: ReadEmailParams): Promise<EmailMessage> {
  const qs = buildEmailQueryParams({
    folder: params.folder ?? 'INBOX',
    account_id: params.accountId,
    mark_seen: params.markSeen ?? true,
  })
  return api.get<EmailMessage>(`/api/email/read/${encodeURIComponent(params.uid)}${qs}`)
}

function folderScopedPath(
  action: string,
  uid: string,
  folder: string,
  accountId?: string | null,
): string {
  const qs = buildEmailQueryParams({ folder, account_id: accountId })
  return `/api/email/${action}/${encodeURIComponent(uid)}${qs}`
}

export async function markEmailRead(uid: string, folder: string, accountId?: string | null) {
  return api.post<EmailMutationResult>(folderScopedPath('mark-read', uid, folder, accountId))
}

export async function markEmailUnread(uid: string, folder: string, accountId?: string | null) {
  return api.post<EmailMutationResult>(folderScopedPath('mark-unread', uid, folder, accountId))
}

export async function archiveEmail(uid: string, folder: string, accountId?: string | null) {
  return api.post<EmailMutationResult>(folderScopedPath('archive', uid, folder, accountId))
}

export async function deleteEmail(uid: string, folder: string, accountId?: string | null) {
  return api.delete<EmailMutationResult>(folderScopedPath('delete', uid, folder, accountId))
}

export async function deleteEmailPermanent(uid: string, folder: string, accountId?: string | null) {
  return api.delete<EmailMutationResult>(
    folderScopedPath('delete-permanent', uid, folder, accountId),
  )
}

export async function sendEmail(payload: SendEmailPayload): Promise<EmailMutationResult> {
  return api.post<EmailMutationResult>('/api/email/send', payload)
}

export async function saveEmailDraft(payload: SendEmailPayload): Promise<EmailMutationResult> {
  return api.post<EmailMutationResult>('/api/email/draft', payload)
}

export async function uploadComposeAttachment(file: File): Promise<ComposeUploadResult> {
  const form = new FormData()
  form.append('file', file)
  return api.postForm<ComposeUploadResult>('/api/email/compose-upload', form)
}

export async function deleteComposeAttachment(token: string): Promise<EmailMutationResult> {
  return api.delete<EmailMutationResult>(
    `/api/email/compose-upload/${encodeURIComponent(token)}`,
  )
}

export async function summarizeEmail(
  payload: SummarizeEmailPayload,
): Promise<SummarizeEmailResult> {
  return api.post<SummarizeEmailResult>('/api/email/summarize', payload)
}

export async function aiReplyEmail(payload: AiReplyPayload): Promise<AiReplyResult> {
  return api.post<AiReplyResult>('/api/email/ai-reply', payload)
}

export async function fetchScheduledEmails(): Promise<ScheduledEmail[]> {
  const res = await api.get<{ scheduled: ScheduledEmail[]; error?: string }>(
    '/api/email/scheduled',
  )
  return res.scheduled ?? []
}

export async function cancelScheduledEmail(id: string): Promise<EmailMutationResult> {
  return api.delete<EmailMutationResult>(`/api/email/scheduled/${encodeURIComponent(id)}`)
}

export async function fetchWritingStyle(): Promise<{ style: string }> {
  return api.get<{ style: string }>('/api/email/style')
}

export async function updateWritingStyle(style: string): Promise<{ success: boolean }> {
  return api.put<{ success: boolean }>('/api/email/style', { style })
}

export async function extractWritingStyle(
  sampleCount = 15,
): Promise<{ success: boolean; style?: string; error?: string }> {
  return api.post<{ success: boolean; style?: string; error?: string }>(
    '/api/email/extract-style',
    { sample_count: sampleCount },
  )
}

export function attachmentDownloadUrl(
  uid: string,
  index: number,
  folder: string,
  accountId?: string | null,
): string {
  const qs = buildEmailQueryParams({ folder, account_id: accountId })
  return `/api/email/attachment/${encodeURIComponent(uid)}/${index}${qs}`
}
