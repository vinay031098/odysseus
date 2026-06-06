import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { Copy, Play } from 'lucide-react'
import {
  ensureCensorClickHandler,
  isSensitiveBlurPrefEnabled,
  observeCensorRoot,
  processCensorElement,
  SENSITIVE_BLUR_CHANGE_EVENT,
} from '@/lib/censorContent'
import { isRunnableLanguage, isServerShellLanguage, runCodeBlock } from '@/lib/codeRunner'
import { cn } from '@/lib/utils'

interface MarkdownMessageProps {
  content: string
  className?: string
  censor?: boolean
  enableCodeRunner?: boolean
}

function CodeBlock({
  className,
  children,
  enableCodeRunner,
}: {
  className?: string
  children?: React.ReactNode
  enableCodeRunner?: boolean
}) {
  const [output, setOutput] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [isError, setIsError] = useState(false)
  const [viaServer, setViaServer] = useState(false)
  const match = /language-(\w+)/.exec(className ?? '')
  const lang = match?.[1] ?? ''
  const code = String(children ?? '').replace(/\n$/, '')
  const canRun = enableCodeRunner && code.trim() && isRunnableLanguage(lang)
  const serverHint =
    lang.toLowerCase() === 'python' || lang.toLowerCase() === 'py'
      ? 'Runs in-browser via Pyodide when available; falls back to server shell.'
      : isServerShellLanguage(lang)
        ? 'Runs on the server shell.'
        : null

  const run = async () => {
    setRunning(true)
    setIsError(false)
    setViaServer(false)
    const normalized = lang.toLowerCase()
    const loadingMessage =
      normalized === 'python' || normalized === 'py'
        ? 'Loading Python runtime (first run ~10 MB)…'
        : isServerShellLanguage(lang)
          ? 'Running on server…'
          : 'Running…'
    setOutput(loadingMessage)
    try {
      const result = await runCodeBlock(code, lang)
      const errLike = /failed|error|timed out|blocked/i.test(result.output)
      setIsError(errLike)
      setViaServer(Boolean(result.viaServer))
      setOutput(result.output)
    } catch (err) {
      setIsError(true)
      setOutput(err instanceof Error ? err.message : 'Run failed')
    } finally {
      setRunning(false)
    }
  }

  const copyOutput = async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="my-2">
      <div className="relative">
        {canRun ? (
          <button
            type="button"
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-background/80 px-2 py-0.5 text-xs hover:bg-background disabled:opacity-50"
            onClick={() => void run()}
            disabled={running}
            title={serverHint ?? undefined}
          >
            <Play className="h-3 w-3" />
            Run
          </button>
        ) : null}
        <pre className="theme-code-block overflow-x-auto rounded-md p-3">
          <code className={className}>{children}</code>
        </pre>
      </div>
      {output !== null ? (
        <div className="relative mt-1">
          {viaServer ? (
            <p className="mb-1 text-[11px] text-muted">Ran on server shell (Pyodide unavailable).</p>
          ) : null}
          {output ? (
            <button
              type="button"
              className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-background/80 px-2 py-0.5 text-xs hover:bg-background"
              onClick={() => void copyOutput()}
            >
              <Copy className="h-3 w-3" />
              Copy
            </button>
          ) : null}
          <pre
            className={cn(
              'overflow-x-auto rounded-md border border-border bg-muted/40 p-2 text-xs',
              isError && 'border-destructive/40 text-destructive',
            )}
          >
            {output}
          </pre>
        </div>
      ) : null}
    </div>
  )
}

export function MarkdownMessage({
  content,
  className,
  censor = false,
  enableCodeRunner = false,
}: MarkdownMessageProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [blurPref, setBlurPref] = useState(isSensitiveBlurPrefEnabled)

  useEffect(() => {
    ensureCensorClickHandler()
  }, [])

  useEffect(() => {
    if (!censor) return
    setBlurPref(isSensitiveBlurPrefEnabled())
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ enabled?: boolean }>).detail
      if (detail && typeof detail.enabled === 'boolean') setBlurPref(detail.enabled)
    }
    window.addEventListener(SENSITIVE_BLUR_CHANGE_EVENT, onChange)
    return () => window.removeEventListener(SENSITIVE_BLUR_CHANGE_EVENT, onChange)
  }, [censor])

  useEffect(() => {
    if (!censor || !blurPref) return
    const root = rootRef.current
    if (!root) return
    return observeCensorRoot(root, true, () => processCensorElement(root))
  }, [censor, blurPref, content])

  return (
    <div
      ref={rootRef}
      className={cn(
        'max-w-none text-sm leading-relaxed',
        '[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
        '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
        '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_code]:rounded [&_code]:bg-background [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs',
        '[&_a]:text-primary [&_a]:underline',
        '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: ({ className: codeClass, children }) => {
            const isBlock = Boolean(codeClass)
            if (isBlock) {
              return (
                <CodeBlock className={codeClass} enableCodeRunner={enableCodeRunner}>
                  {children}
                </CodeBlock>
              )
            }
            return (
              <code className="rounded bg-background px-1 py-0.5 text-xs">{children}</code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
