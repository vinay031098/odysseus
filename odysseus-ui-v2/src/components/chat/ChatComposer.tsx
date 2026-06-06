import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bot,
  EyeOff,
  Globe,
  MessageSquare,
  Paperclip,
  Send,
  Square,
  Terminal,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { uploadFiles } from '@/api/chat'
import type { UploadedFile } from '@/api/types'
import { Button } from '@/components/ui/button'
import { EmojiPickerButton } from '@/components/chat/EmojiPickerButton'
import { SlashCommandMenu } from '@/components/chat/SlashCommandMenu'
import { VoiceInputButton, TtsAutoPlayToggle } from '@/components/chat/VoiceTtsButtons'
import { WorkspaceIndicator } from '@/components/chat/WorkspaceIndicator'
import { useSkillsIndex } from '@/hooks/useAgents'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import type { ChatMode } from '@/lib/chatToggles'
import {
  buildSlashCommandItems,
  filterSlashCommands,
  slashQueryFromComposer,
  type SlashCommandItem,
} from '@/lib/slashCommands'
import { cn } from '@/lib/utils'

const MAX_FILES = 10

export interface ComposerSendOptions {
  attachments: string[]
  useRag: boolean
  incognito: boolean
  mode: ChatMode
  useWeb: boolean
  allowBash: boolean
  planMode: boolean
}

interface ChatComposerProps {
  onSend: (message: string, options: ComposerSendOptions) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
  placeholder?: string
  initialValue?: string
  focusRef?: React.MutableRefObject<(() => void) | null>
  useRag?: boolean
  onUseRagChange?: (value: boolean) => void
  incognito?: boolean
  onIncognitoChange?: (value: boolean) => void
  mode?: ChatMode
  onModeChange?: (mode: ChatMode) => void
  useWeb?: boolean
  onUseWebChange?: (value: boolean) => void
  allowBash?: boolean
  onAllowBashChange?: (value: boolean) => void
  planMode?: boolean
  onPlanModeChange?: (value: boolean) => void
  ttsAutoPlay?: boolean
  onTtsAutoPlayChange?: (value: boolean) => void
}

export function ChatComposer({
  onSend,
  onStop,
  isStreaming,
  disabled,
  placeholder = 'Message Odysseus…',
  initialValue,
  focusRef,
  useRag = true,
  onUseRagChange,
  incognito = false,
  onIncognitoChange,
  mode = 'chat',
  onModeChange,
  useWeb = false,
  onUseWebChange,
  allowBash = false,
  onAllowBashChange,
  planMode = false,
  onPlanModeChange,
  ttsAutoPlay = false,
  onTtsAutoPlayChange,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [slashQuery, setSlashQuery] = useState<string | null>(null)
  const [slashIndex, setSlashIndex] = useState(0)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploaded, setUploaded] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const { data: skills = [] } = useSkillsIndex()

  const insertAtCursor = useCallback((text: string) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    el.value = `${el.value.slice(0, start)}${text}${el.value.slice(end)}`
    el.selectionStart = el.selectionEnd = start + text.length
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.focus()
  }, [])

  const addFiles = useCallback((files: FileList | File[]) => {
    setPendingFiles((prev) => {
      const next = [...prev]
      for (const f of Array.from(files)) {
        if (next.length >= MAX_FILES) break
        next.push(f)
      }
      return next
    })
  }, [])

  const voice = useVoiceInput(
    (text) => insertAtCursor(`${text} `),
    (file) => addFiles([file]),
  )

  const slashItems = buildSlashCommandItems(skills)
  const filteredSlash =
    slashQuery !== null ? filterSlashCommands(slashItems, slashQuery) : []
  const showSlashMenu = slashQuery !== null

  const resize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [])

  useEffect(() => {
    resize()
  }, [resize])

  useEffect(() => {
    const el = textareaRef.current
    if (!el || initialValue === undefined) return
    el.value = initialValue
    resize()
    el.focus()
    const len = el.value.length
    el.setSelectionRange(len, len)
  }, [initialValue, resize])

  useEffect(() => {
    if (!focusRef) return
    focusRef.current = () => {
      textareaRef.current?.focus()
    }
    return () => {
      focusRef.current = null
    }
  }, [focusRef])

  const submit = async () => {
    const el = textareaRef.current
    if (!el) return
    const text = el.value
    if (!text.trim() && !pendingFiles.length && !uploaded.length) return

    let attachmentIds = uploaded.map((f) => f.id)
    if (pendingFiles.length) {
      setUploading(true)
      try {
        const result = await uploadFiles(pendingFiles)
        attachmentIds = [...attachmentIds, ...result.files.map((f) => f.id)]
        setUploaded((prev) => [...prev, ...result.files])
        setPendingFiles([])
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed')
        return
      } finally {
        setUploading(false)
      }
    }

    onSend(text, {
      attachments: attachmentIds,
      useRag,
      incognito,
      mode,
      useWeb,
      allowBash,
      planMode,
    })
    el.value = ''
    setSlashQuery(null)
    setUploaded([])
    resize()
  }

  const applySlash = (item: SlashCommandItem) => {
    const el = textareaRef.current
    if (!el) return
    el.value = item.insert
    setSlashQuery(null)
    el.focus()
    resize()
  }

  const hasAttachments = pendingFiles.length > 0 || uploaded.length > 0
  const togglesDisabled = disabled || isStreaming || voice.isRecording

  return (
    <div className="relative border-t border-border bg-background p-4">
      {showSlashMenu ? (
        <div className="absolute bottom-full left-4 right-4 mx-auto mb-1 max-w-3xl">
          <SlashCommandMenu
            items={filteredSlash}
            activeIndex={slashIndex}
            onSelect={applySlash}
            onHover={setSlashIndex}
            query={slashQuery ?? undefined}
          />
        </div>
      ) : null}
      <div className="mx-auto max-w-3xl space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {onModeChange ? (
            <div className="inline-flex rounded-md border border-border p-0.5">
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1 rounded px-2 py-1',
                  mode === 'chat' && 'bg-muted text-foreground',
                )}
                onClick={() => onModeChange('chat')}
                disabled={togglesDisabled}
              >
                <MessageSquare className="h-3 w-3" />
                Chat
              </button>
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1 rounded px-2 py-1',
                  mode === 'agent' && 'bg-muted text-foreground',
                )}
                onClick={() => onModeChange('agent')}
                disabled={togglesDisabled}
              >
                <Bot className="h-3 w-3" />
                Agent
              </button>
            </div>
          ) : null}
          {onUseWebChange ? (
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                className="rounded border-border"
                checked={useWeb}
                onChange={(e) => onUseWebChange(e.target.checked)}
                disabled={togglesDisabled}
              />
              <Globe className="h-3 w-3" />
              Web
            </label>
          ) : null}
          {onAllowBashChange && mode === 'agent' ? (
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                className="rounded border-border"
                checked={allowBash}
                onChange={(e) => onAllowBashChange(e.target.checked)}
                disabled={togglesDisabled}
              />
              <Terminal className="h-3 w-3" />
              Shell
            </label>
          ) : null}
          {onPlanModeChange && mode === 'agent' ? (
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                className="rounded border-border"
                checked={planMode}
                onChange={(e) => onPlanModeChange(e.target.checked)}
                disabled={togglesDisabled}
              />
              Plan
            </label>
          ) : null}
          {onUseRagChange ? (
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                className="rounded border-border"
                checked={useRag}
                onChange={(e) => onUseRagChange(e.target.checked)}
                disabled={togglesDisabled}
              />
              RAG
            </label>
          ) : null}
          {onIncognitoChange ? (
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                className="rounded border-border"
                checked={incognito}
                onChange={(e) => onIncognitoChange(e.target.checked)}
                disabled={togglesDisabled}
              />
              <EyeOff className="h-3 w-3" />
              Incognito
            </label>
          ) : null}
          <WorkspaceIndicator />
        </div>
        {hasAttachments && (
          <div className="flex flex-wrap gap-2">
            {pendingFiles.map((f, i) => (
              <span
                key={`pending-${f.name}-${i}`}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs"
              >
                {f.name}
                <button
                  type="button"
                  onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))}
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {uploaded.map((f) => (
              <span
                key={f.id}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs"
              >
                {f.name}
                <button
                  type="button"
                  onClick={() => setUploaded((p) => p.filter((x) => x.id !== f.id))}
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || isStreaming || uploading || voice.isRecording}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach files"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <EmojiPickerButton
            disabled={disabled || isStreaming || uploading}
            onInsert={(emoji) => insertAtCursor(emoji)}
          />
          <VoiceInputButton
            disabled={disabled || isStreaming || uploading}
            isRecording={voice.isRecording}
            onToggle={() => void voice.start()}
          />
          {onTtsAutoPlayChange ? (
            <TtsAutoPlayToggle
              enabled={ttsAutoPlay}
              disabled={disabled || isStreaming || uploading || voice.isRecording}
              onChange={onTtsAutoPlayChange}
            />
          ) : null}
          <textarea
            ref={textareaRef}
            rows={1}
            className={cn(
              'flex-1 resize-none rounded-lg border border-border bg-muted/40 px-4 py-3',
              'text-sm leading-relaxed placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring',
            )}
            placeholder={placeholder}
            disabled={disabled || isStreaming || uploading}
            onInput={() => {
              resize()
              const el = textareaRef.current
              if (!el) return
              const val = el.value
              const query = slashQueryFromComposer(val, el.selectionStart ?? val.length)
              if (query !== null) {
                setSlashQuery(query)
                setSlashIndex(0)
              } else {
                setSlashQuery(null)
              }
            }}
            onKeyDown={(e) => {
              if (showSlashMenu) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setSlashIndex((i) => Math.min(i + 1, filteredSlash.length - 1))
                  return
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setSlashIndex((i) => Math.max(i - 1, 0))
                  return
                }
                if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
                  const val = textareaRef.current?.value.trim() ?? ''
                  const exactHit = filteredSlash.find(
                    (it) => it.label === val || it.insert.trim() === val,
                  )
                  if (e.key === 'Enter' && exactHit) {
                    setSlashQuery(null)
                    return
                  }
                  e.preventDefault()
                  const item = filteredSlash[slashIndex]
                  if (item) applySlash(item)
                  return
                }
                if (e.key === 'Escape') {
                  setSlashQuery(null)
                  return
                }
              }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (!isStreaming && !uploading && !voice.isRecording) void submit()
              }
            }}
            onPaste={(e) => {
              const items = e.clipboardData?.files
              if (items?.length) {
                e.preventDefault()
                addFiles(items)
              }
            }}
          />
          {isStreaming ? (
            <Button type="button" variant="destructive" size="icon" onClick={onStop} aria-label="Stop">
              <Square className="h-4 w-4 fill-current" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              className="theme-send-btn"
              onClick={() => void submit()}
              disabled={disabled || uploading || voice.isRecording}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
