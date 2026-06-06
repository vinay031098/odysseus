export interface ShellStreamEvent {
  data?: string
  exit_code?: number
}

export async function consumeShellStream(
  command: string,
  opts: {
    timeout?: number
    use_pty?: boolean
    use_tmux?: boolean
    signal?: AbortSignal
    onData?: (line: string) => void
  } = {},
): Promise<{ output: string; exitCode: number | null }> {
  const payload: Record<string, unknown> = { command }
  if (opts.timeout !== undefined) payload.timeout = opts.timeout
  if (opts.use_pty) payload.use_pty = true
  if (opts.use_tmux) payload.use_tmux = true

  const res = await fetch('/api/shell/stream', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: opts.signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response stream')

  const decoder = new TextDecoder()
  let buf = ''
  let fullOutput = ''
  let exitCode: number | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })

    let idx
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const chunk = buf.slice(0, idx)
      buf = buf.slice(idx + 2)
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        try {
          const ev = JSON.parse(line.slice(6)) as ShellStreamEvent
          if (ev.data !== undefined) {
            fullOutput += (fullOutput ? '\n' : '') + ev.data
            opts.onData?.(ev.data)
          }
          if (ev.exit_code !== undefined) exitCode = ev.exit_code
        } catch {
          /* ignore malformed SSE chunks */
        }
      }
    }
  }

  return { output: fullOutput, exitCode }
}
