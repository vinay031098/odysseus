import { useEffect, useRef, useState } from 'react'
import { Eye, Pencil } from 'lucide-react'
import { MarkdownMessage } from '@/components/chat/MarkdownMessage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { highlightCode, highlightLanguageClass } from '@/lib/codeHighlight'
import { shouldRenderMarkdown } from '@/lib/documentHelpers'

type MarkdownEditorProps = {
  title: string
  content: string
  language: string | null
  onSave: (title: string, content: string) => void
  isSaving?: boolean
  previewContent?: string | null
}

export function MarkdownEditor({
  title: initialTitle,
  content: initialContent,
  language,
  onSave,
  isSaving,
  previewContent,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const saveTimer = useRef<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    setTitle(initialTitle)
    setContent(initialContent)
  }, [initialTitle, initialContent])

  const scheduleSave = (nextTitle: string, nextContent: string) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      if (nextTitle !== initialTitle || nextContent !== initialContent) {
        onSave(nextTitle, nextContent)
      }
    }, 1500)
  }

  const showMarkdown = shouldRenderMarkdown(language)
  const showCodeHighlight = !showMarkdown
  const displayContent = previewContent ?? content

  const syncScroll = () => {
    const ta = textareaRef.current
    const pre = preRef.current
    if (!ta || !pre) return
    pre.scrollTop = ta.scrollTop
    pre.scrollLeft = ta.scrollLeft
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="doc-edit-title" className="sr-only">
            Title
          </Label>
          <Input
            id="doc-edit-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              scheduleSave(e.target.value, content)
            }}
            onBlur={() => {
              if (title !== initialTitle || content !== initialContent) onSave(title, content)
            }}
            placeholder="Document title"
            disabled={isSaving}
            className="h-8 text-sm font-medium"
          />
        </div>
        {showMarkdown ? (
          <div className="flex shrink-0 gap-1">
            <Button
              size="sm"
              variant={mode === 'edit' ? 'default' : 'outline'}
              onClick={() => setMode('edit')}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              variant={mode === 'preview' ? 'default' : 'outline'}
              onClick={() => setMode('preview')}
            >
              <Eye className="mr-1 h-3.5 w-3.5" />
              Preview
            </Button>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {mode === 'preview' && showMarkdown ? (
          <MarkdownMessage content={displayContent} />
        ) : showCodeHighlight ? (
          <div className="relative h-full min-h-[320px]">
            <pre
              ref={preRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-auto whitespace-pre-wrap break-words rounded-md border border-transparent px-3 py-2 font-mono text-sm leading-relaxed"
            >
              <code
                className={`hljs ${highlightLanguageClass(language)}`}
                dangerouslySetInnerHTML={{
                  __html: highlightCode(displayContent, language || 'text'),
                }}
              />
            </pre>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                scheduleSave(title, e.target.value)
              }}
              onScroll={syncScroll}
              onBlur={() => {
                if (title !== initialTitle || content !== initialContent) onSave(title, content)
              }}
              disabled={isSaving || Boolean(previewContent)}
              spellCheck={false}
              className="relative h-full min-h-[320px] w-full resize-none rounded-md border border-border bg-transparent px-3 py-2 font-mono text-sm leading-relaxed text-foreground caret-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label="Document content"
            />
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              scheduleSave(title, e.target.value)
            }}
            onBlur={() => {
              if (title !== initialTitle || content !== initialContent) onSave(title, content)
            }}
            disabled={isSaving || Boolean(previewContent)}
            className="h-full min-h-[320px] w-full resize-none rounded-md border border-border bg-background px-3 py-2 font-mono text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label="Document content"
          />
        )}
      </div>
    </div>
  )
}
