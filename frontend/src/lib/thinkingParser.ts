const THINKING_OPEN = /<(?:redacted_)?thinking(?:\s[^>]*)?>/i
const THINKING_CLOSE = /<\/(?:redacted_)?thinking>/i

export interface ParsedThinking {
  thinking: string
  content: string
  closed: boolean
}

/** Split assistant text into optional thinking block and visible reply. */
export function parseThinkingContent(text: string): ParsedThinking {
  const openMatch = text.match(THINKING_OPEN)
  if (!openMatch || openMatch.index === undefined) {
    return { thinking: '', content: text, closed: true }
  }
  const afterOpen = text.slice(openMatch.index + openMatch[0].length)
  const closeMatch = afterOpen.match(THINKING_CLOSE)
  if (!closeMatch || closeMatch.index === undefined) {
    return {
      thinking: afterOpen,
      content: '',
      closed: false,
    }
  }
  const thinking = afterOpen.slice(0, closeMatch.index).trim()
  const content = afterOpen.slice(closeMatch.index + closeMatch[0].length).trim()
  return { thinking, content, closed: true }
}

export function stripThinkingTags(text: string): string {
  return parseThinkingContent(text).content || text.replace(THINKING_OPEN, '').replace(THINKING_CLOSE, '')
}
