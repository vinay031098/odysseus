import type { ResearchJob } from '@/hooks/useResearch'
import type { ResearchResultPeek } from '@/api/types'

export function buildResearchCopyText(job: ResearchJob, result: ResearchResultPeek): string {
  let text = `# ${job.query}\n\n${result.result}`
  const findings = result.raw_findings as Array<{
    title?: string
    url?: string
    summary?: string
  }> | undefined
  if (findings?.length) {
    text += '\n\n---\n## Raw Findings\n'
    for (const f of findings) {
      text += `\n### ${f.title || 'Untitled'}\nSource: ${f.url || ''}\n${f.summary || ''}\n`
    }
  }
  if (result.sources?.length) {
    const srcList = result.sources
      .map((s) => `- [${s.title || s.url}](${s.url})`)
      .join('\n')
    text += `\n\n---\n## Sources\n${srcList}`
  }
  return text
}

export async function copyResearchReport(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fallback below */
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.readOnly = false
  ta.style.cssText =
    'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;font-size:16px;'
  document.body.appendChild(ta)
  ta.focus()
  ta.select()
  try {
    ta.setSelectionRange(0, text.length)
  } catch {
    /* ignore */
  }
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    ta.remove()
  }
}
