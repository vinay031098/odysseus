import { useCallback, useEffect, useRef } from 'react'
import { Bold, Italic, Link, List, ListOrdered, Underline } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type RichTextEditorProps = {
  id?: string
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
}

export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder = 'Write your message…',
  className,
  minHeight = '12rem',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const lastValue = useRef(value)

  useEffect(() => {
    const el = editorRef.current
    if (!el || el.innerHTML === value) return
    if (lastValue.current !== value) {
      el.innerHTML = value || ''
      lastValue.current = value
    }
  }, [value])

  const emitChange = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    const html = el.innerHTML
    lastValue.current = html
    onChange(html)
  }, [onChange])

  const exec = (command: string, arg?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, arg)
    emitChange()
  }

  const insertLink = () => {
    const url = window.prompt('Link URL')
    if (!url) return
    exec('createLink', url)
  }

  return (
    <div className={cn('rounded-md border border-border bg-panel', className)}>
      <div
        className="flex flex-wrap gap-0.5 border-b border-border px-2 py-1"
        role="toolbar"
        aria-label="Formatting"
      >
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => exec('bold')} aria-label="Bold">
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => exec('italic')} aria-label="Italic">
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => exec('underline')} aria-label="Underline">
          <Underline className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={insertLink} aria-label="Insert link">
          <Link className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => exec('insertUnorderedList')} aria-label="Bullet list">
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => exec('insertOrderedList')} aria-label="Numbered list">
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div
        id={id}
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        data-placeholder={placeholder}
        className="email-rich-editor min-h-[12rem] px-3 py-2 text-sm text-foreground focus-visible:outline-none"
        style={{ minHeight }}
        onInput={emitChange}
        onBlur={emitChange}
        suppressContentEditableWarning
      />
    </div>
  )
}
