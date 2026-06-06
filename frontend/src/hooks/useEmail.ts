import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as emailApi from '@/api/email'
import type { ListEmailsParams } from '@/api/email'
import type { SendEmailPayload } from '@/api/email-types'
import { defaultFolder } from '@/lib/emailHelpers'

export const emailAccountsKey = ['email', 'accounts'] as const

export function emailFoldersKey(accountId: string | null | undefined) {
  return ['email', 'folders', accountId ?? 'default'] as const
}

export function emailListKey(params: ListEmailsParams & { search?: string }) {
  return [
    'email',
    'list',
    params.accountId ?? 'default',
    params.folder ?? 'INBOX',
    params.filter ?? 'all',
    params.search ?? '',
  ] as const
}

export function emailReadKey(uid: string | null, folder: string, accountId?: string | null) {
  return ['email', 'read', accountId ?? 'default', folder, uid] as const
}

export function useEmailAccounts() {
  return useQuery({
    queryKey: emailAccountsKey,
    queryFn: emailApi.fetchEmailAccounts,
  })
}

export function useEmailFolders(accountId: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: emailFoldersKey(accountId),
    queryFn: () => emailApi.fetchEmailFolders({ accountId }),
    enabled,
  })
}

export function useEmailList(
  params: ListEmailsParams & { search?: string },
  enabled: boolean,
) {
  const search = (params.search ?? '').trim()
  return useQuery({
    queryKey: emailListKey(params),
    queryFn: async () => {
      if (search.length >= 2) {
        return emailApi.searchEmails({
          q: search,
          folder: params.folder,
          accountId: params.accountId,
        })
      }
      return emailApi.fetchEmailList(params)
    },
    enabled,
  })
}

export function useEmailMessage(
  uid: string | null,
  folder: string,
  accountId?: string | null,
) {
  return useQuery({
    queryKey: emailReadKey(uid, folder, accountId),
    queryFn: () =>
      emailApi.fetchEmailMessage({
        uid: uid!,
        folder,
        accountId,
      }),
    enabled: !!uid,
  })
}

export function useEmailMutations(
  folder: string,
  accountId?: string | null,
  selectedUid?: string | null,
) {
  const qc = useQueryClient()

  const invalidateList = () => {
    void qc.invalidateQueries({ queryKey: ['email', 'list'] })
  }

  const invalidateRead = () => {
    if (selectedUid) {
      void qc.invalidateQueries({
        queryKey: emailReadKey(selectedUid, folder, accountId),
      })
    }
  }

  const markRead = useMutation({
    mutationFn: (uid: string) => emailApi.markEmailRead(uid, folder, accountId),
    onSuccess: () => {
      invalidateList()
      invalidateRead()
    },
    onError: () => toast.error('Could not mark as read'),
  })

  const markUnread = useMutation({
    mutationFn: (uid: string) => emailApi.markEmailUnread(uid, folder, accountId),
    onSuccess: () => {
      invalidateList()
      invalidateRead()
    },
    onError: () => toast.error('Could not mark as unread'),
  })

  const archive = useMutation({
    mutationFn: (uid: string) => emailApi.archiveEmail(uid, folder, accountId),
    onSuccess: () => {
      invalidateList()
      toast.success('Archived')
    },
    onError: () => toast.error('Could not archive'),
  })

  const remove = useMutation({
    mutationFn: (uid: string) => emailApi.deleteEmail(uid, folder, accountId),
    onSuccess: () => {
      invalidateList()
      toast.success('Moved to trash')
    },
    onError: () => toast.error('Could not delete'),
  })

  const removePermanent = useMutation({
    mutationFn: (uid: string) => emailApi.deleteEmailPermanent(uid, folder, accountId),
    onSuccess: () => {
      invalidateList()
      toast.success('Deleted permanently')
    },
    onError: () => toast.error('Could not delete'),
  })

  const send = useMutation({
    mutationFn: (payload: SendEmailPayload) => emailApi.sendEmail(payload),
    onSuccess: (res) => {
      if (res.success === false) {
        toast.error(res.error ?? 'Could not send email')
        return
      }
      invalidateList()
      toast.success(res.message ?? 'Email sent')
    },
    onError: () => toast.error('Could not send email'),
  })

  const saveDraft = useMutation({
    mutationFn: (payload: SendEmailPayload) => emailApi.saveEmailDraft(payload),
    onSuccess: (res) => {
      if (res.success === false) {
        toast.error(res.error ?? 'Could not save draft')
        return
      }
      invalidateList()
      toast.success('Draft saved')
    },
    onError: () => toast.error('Could not save draft'),
  })

  const uploadAttachment = useMutation({
    mutationFn: (file: File) => emailApi.uploadComposeAttachment(file),
    onError: () => toast.error('Could not upload attachment'),
  })

  return {
    markRead,
    markUnread,
    archive,
    remove,
    removePermanent,
    send,
    saveDraft,
    uploadAttachment,
  }
}

export function pickDefaultAccountId(
  accounts: { id: string; is_default: boolean; enabled: boolean }[],
): string | null {
  const enabled = accounts.filter((a) => a.enabled)
  if (enabled.length === 0) return null
  return enabled.find((a) => a.is_default)?.id ?? enabled[0].id
}

export function pickInitialFolder(folders: string[] | undefined): string {
  return defaultFolder(folders ?? [])
}

export const scheduledEmailsKey = ['email', 'scheduled'] as const

export function useScheduledEmails(enabled = true) {
  return useQuery({
    queryKey: scheduledEmailsKey,
    queryFn: emailApi.fetchScheduledEmails,
    enabled,
  })
}

export function useEmailAi(folder: string, accountId?: string | null) {
  const qc = useQueryClient()

  const summarize = useMutation({
    mutationFn: emailApi.summarizeEmail,
    onSuccess: (res, vars) => {
      if (res.success && vars.uid) {
        void qc.invalidateQueries({
          queryKey: emailReadKey(vars.uid, vars.folder ?? folder, accountId),
        })
        void qc.invalidateQueries({ queryKey: ['email', 'list'] })
      }
    },
    onError: () => toast.error('Could not summarize email'),
  })

  const aiReply = useMutation({
    mutationFn: emailApi.aiReplyEmail,
    onError: () => toast.error('Could not generate AI reply'),
  })

  const cancelScheduled = useMutation({
    mutationFn: emailApi.cancelScheduledEmail,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: scheduledEmailsKey })
      toast.success('Scheduled send cancelled')
    },
    onError: () => toast.error('Could not cancel scheduled send'),
  })

  return { summarize, aiReply, cancelScheduled }
}
