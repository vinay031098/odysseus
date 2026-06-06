import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PenSquare, Search } from 'lucide-react'
import { EmailAccountPicker } from '@/features/email/EmailAccountPicker'
import { EmailComposer, type ComposeInitial } from '@/features/email/EmailComposer'
import { EmailDetail } from '@/features/email/EmailDetail'
import { EmailFolderList } from '@/features/email/EmailFolderList'
import { EmailList } from '@/features/email/EmailList'
import { ScheduledEmailList } from '@/features/email/ScheduledEmailList'
import { WritingStylePanel } from '@/features/email/WritingStylePanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  pickDefaultAccountId,
  pickInitialFolder,
  useEmailAccounts,
  useEmailAi,
  useEmailFolders,
  useEmailList,
  useEmailMessage,
  useEmailMutations,
  useScheduledEmails,
} from '@/hooks/useEmail'
import {
  formatAddress,
  isScheduledFolder,
  replyReferences,
  replySubject,
  SCHEDULED_FOLDER,
} from '@/lib/emailHelpers'

type ListFilter = 'all' | 'unread'

export function EmailPage() {
  const { data: accounts = [], isLoading: accountsLoading } = useEmailAccounts()
  const [accountId, setAccountId] = useState<string | null>(null)

  const defaultAccountId = pickDefaultAccountId(accounts)
  const effectiveAccountId = accountId ?? defaultAccountId
  const activeAccount = useMemo(
    () => accounts.find((a) => a.id === effectiveAccountId),
    [accounts, effectiveAccountId],
  )
  const hasAccounts = accounts.some((a) => a.enabled)

  const [folder, setFolder] = useState('INBOX')
  const [filter, setFilter] = useState<ListFilter>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeInitial, setComposeInitial] = useState<ComposeInitial | undefined>()

  const scheduledView = isScheduledFolder(folder)

  const { data: folders = [], isLoading: foldersLoading } = useEmailFolders(
    accountId,
    hasAccounts && !scheduledView,
  )

  useEffect(() => {
    if (folders.length > 0 && !scheduledView) {
      setFolder((prev) =>
        isScheduledFolder(prev) ? prev : folders.includes(prev) ? prev : pickInitialFolder(folders),
      )
    }
  }, [folders, scheduledView])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(t)
  }, [search])

  const listQuery = useEmailList(
    {
      accountId,
      folder,
      filter,
      search: debouncedSearch,
    },
    hasAccounts && !scheduledView,
  )

  const scheduledQuery = useScheduledEmails(hasAccounts && scheduledView)

  const emails = useMemo(
    () => listQuery.data?.emails ?? [],
    [listQuery.data?.emails],
  )
  const listError = listQuery.data?.error

  const selectedIndex = useMemo(
    () => (selectedUid ? emails.findIndex((e) => e.uid === selectedUid) : -1),
    [emails, selectedUid],
  )

  const mineAddresses = useMemo(
    () =>
      accounts
        .filter((a) => a.enabled)
        .flatMap((a) => [a.from_address, a.imap_user].filter(Boolean) as string[]),
    [accounts],
  )

  const navigatePrev = () => {
    if (selectedIndex > 0) setSelectedUid(emails[selectedIndex - 1].uid)
  }

  const navigateNext = () => {
    if (selectedIndex >= 0 && selectedIndex < emails.length - 1) {
      setSelectedUid(emails[selectedIndex + 1].uid)
    }
  }

  const messageQuery = useEmailMessage(selectedUid, folder, accountId)
  const mutations = useEmailMutations(folder, accountId, selectedUid)
  const ai = useEmailAi(folder, accountId)

  const openCompose = (initial?: ComposeInitial) => {
    setComposeInitial(initial)
    setComposeOpen(true)
  }

  const handleReply = () => {
    const msg = messageQuery.data
    if (!msg) return
    openCompose({
      to: formatAddress(msg.from_name, msg.from_address),
      subject: replySubject(msg.subject),
      body: `\n\n---\n${msg.body}`,
      in_reply_to: msg.message_id,
      references: replyReferences(msg.message_id, msg.references),
    })
  }

  const handleAiReplyReady = (body: string) => {
    const msg = messageQuery.data
    if (!msg) return
    openCompose({
      to: formatAddress(msg.from_name, msg.from_address),
      subject: replySubject(msg.subject),
      body,
      in_reply_to: msg.message_id,
      references: replyReferences(msg.message_id, msg.references),
    })
  }

  const handleSummarize = async () => {
    const msg = messageQuery.data
    if (!msg) return null
    const res = await ai.summarize.mutateAsync({
      body: msg.body,
      subject: msg.subject,
      from: formatAddress(msg.from_name, msg.from_address),
      uid: msg.uid,
      folder,
      message_id: msg.message_id,
      account_id: accountId ?? undefined,
    })
    return res.success && res.summary ? res.summary : null
  }

  const handleAiReplyGenerate = async (mode: 'fast' | 'full') => {
    const msg = messageQuery.data
    if (!msg) return null
    const res = await ai.aiReply.mutateAsync({
      to: msg.from_address,
      subject: replySubject(msg.subject),
      original_body: msg.body,
      message_id: msg.message_id,
      uid: msg.uid,
      folder,
      fast: mode === 'fast',
    })
    return res.success && res.reply ? res.reply : null
  }

  const handleDelete = () => {
    if (!selectedUid) return
    const isTrash =
      folder.toLowerCase().includes('trash') || folder.toLowerCase().includes('deleted')
    if (isTrash) {
      mutations.removePermanent.mutate(selectedUid, {
        onSuccess: () => setSelectedUid(null),
      })
    } else {
      mutations.remove.mutate(selectedUid, {
        onSuccess: () => setSelectedUid(null),
      })
    }
  }

  const handleAccountSelect = (id: string | null) => {
    setAccountId(id)
    setSelectedUid(null)
    if (isScheduledFolder(folder)) {
      setFolder('INBOX')
    }
  }

  const handleFolderSelect = (f: string) => {
    setFolder(f)
    setSelectedUid(null)
  }

  const handleCancelScheduled = (id: string, subject: string) => {
    if (!window.confirm(`Cancel scheduled email "${subject}"?`)) return
    ai.cancelScheduled.mutate(id)
  }

  if (accountsLoading) {
    return <PageState message="Loading email…" />
  }

  if (!hasAccounts) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <h2 className="text-lg font-semibold">No email account configured</h2>
        <p className="max-w-md text-sm text-muted">
          Add an IMAP/SMTP account in Settings → Email to read and send mail from this
          workspace.
        </p>
        <Button asChild variant="secondary">
          <Link to="/settings?tab=email">Open Email settings</Link>
        </Button>
      </div>
    )
  }

  const folderOptions = [...folders, SCHEDULED_FOLDER]

  return (
    <div className="flex h-full min-h-[480px] flex-col">
      <EmailAccountPicker
        accounts={accounts}
        selectedId={accountId}
        onSelect={handleAccountSelect}
      />
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <div className="relative min-w-0 flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search mail…"
            className="pl-9"
            disabled={scheduledView}
          />
        </div>
        {!scheduledView && (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={filter === 'all' ? 'secondary' : 'ghost'}
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filter === 'unread' ? 'secondary' : 'ghost'}
              onClick={() => setFilter('unread')}
            >
              Unread
            </Button>
          </div>
        )}
        {activeAccount && (
          <span className="hidden text-xs text-muted sm:inline" title={activeAccount.from_address}>
            {activeAccount.from_address}
          </span>
        )}
        <Button size="sm" onClick={() => openCompose()}>
          <PenSquare className="h-4 w-4" />
          Compose
        </Button>
      </div>

      <WritingStylePanel />

      <div className="flex min-h-0 flex-1">
        <div className="hidden w-44 shrink-0 border-r border-border md:block">
          <EmailFolderList
            folders={folders}
            selected={folder}
            onSelect={handleFolderSelect}
            isLoading={foldersLoading}
          />
        </div>

        <div className="flex w-full max-w-sm shrink-0 flex-col border-r border-border lg:max-w-md">
          <div className="border-b border-border px-3 py-2 md:hidden">
            <select
              value={folder}
              onChange={(e) => handleFolderSelect(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-panel px-2 text-sm"
            >
              {folderOptions.map((f) => (
                <option key={f} value={f}>
                  {f === SCHEDULED_FOLDER ? 'Scheduled' : f}
                </option>
              ))}
            </select>
          </div>
          {scheduledView ? (
            <ScheduledEmailList
              items={scheduledQuery.data ?? []}
              isLoading={scheduledQuery.isLoading}
              onCancel={handleCancelScheduled}
              isCancelling={ai.cancelScheduled.isPending}
            />
          ) : (
            <EmailList
              emails={emails}
              selectedUid={selectedUid}
              onSelect={setSelectedUid}
              onArchive={(uid) =>
                mutations.archive.mutate(uid, {
                  onSuccess: () => {
                    if (selectedUid === uid) setSelectedUid(null)
                  },
                })
              }
              isLoading={listQuery.isLoading}
              errorMessage={listError}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {scheduledView ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Scheduled sends appear in the list. Select Compose to write new mail.
            </div>
          ) : (
            <EmailDetail
              message={messageQuery.data}
              folder={folder}
              accountId={accountId ?? defaultAccountId}
              mineAddresses={mineAddresses}
              isLoading={!!selectedUid && messageQuery.isLoading}
              onReply={handleReply}
              onAiReply={handleAiReplyReady}
              onSummarize={handleSummarize}
              summarizePending={ai.summarize.isPending}
              onAiReplyGenerate={handleAiReplyGenerate}
              aiReplyPending={ai.aiReply.isPending}
              onMarkRead={() => selectedUid && mutations.markRead.mutate(selectedUid)}
              onMarkUnread={() => selectedUid && mutations.markUnread.mutate(selectedUid)}
              onArchive={() =>
                selectedUid &&
                mutations.archive.mutate(selectedUid, { onSuccess: () => setSelectedUid(null) })
              }
              onDelete={handleDelete}
              onNavigatePrev={selectedIndex > 0 ? navigatePrev : undefined}
              onNavigateNext={
                selectedIndex >= 0 && selectedIndex < emails.length - 1
                  ? navigateNext
                  : undefined
              }
            />
          )}
        </div>
      </div>

      <EmailComposer
        open={composeOpen}
        accountId={accountId ?? defaultAccountId}
        initial={composeInitial}
        onClose={() => setComposeOpen(false)}
        onSend={async (payload) => {
          await mutations.send.mutateAsync(payload)
        }}
        onSaveDraft={async (payload) => {
          await mutations.saveDraft.mutateAsync(payload)
        }}
        onUpload={async (file) => {
          const res = await mutations.uploadAttachment.mutateAsync(file)
          if (!res.success || !res.token) return null
          return { token: res.token, filename: res.filename ?? file.name }
        }}
        isSending={mutations.send.isPending}
      />
    </div>
  )
}

function PageState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-sm text-muted">{message}</div>
  )
}
