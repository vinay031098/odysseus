import type { ComparePaneState, CompareRunState } from '@/hooks/useCompare'

/** Neutral slot labels used during blind comparisons (parity with legacy compare). */
export const BLIND_SLOT_LEFT = 'Model A'
export const BLIND_SLOT_RIGHT = 'Model B'

/** Letter slot for blind multi-pane compare (A–H). */
export function blindSlotLabel(index: number): string {
  return `Model ${String.fromCharCode(65 + index)}`
}

export function modelDisplayName(model: { id: string; label?: string; name?: string }): string {
  return model.label ?? model.name ?? model.id.split('/').pop() ?? model.id
}

export function compareGridColumns(count: number): number {
  return Math.min(Math.max(count, 1), 4)
}

const IMAGE_MODEL_PREFIXES = [
  'dall-e',
  'gpt-image',
  'chatgpt-image',
  'stable-diffusion',
  'sdxl',
  'flux',
  'midjourney',
]

export function isImageModel(modelId: string): boolean {
  const lower = modelId.toLowerCase()
  return IMAGE_MODEL_PREFIXES.some((p) => lower.includes(p))
}

export function blindPaneLabels(): { left: string; right: string } {
  return { left: BLIND_SLOT_LEFT, right: BLIND_SLOT_RIGHT }
}

export function resolveComparePaneLabels(
  isBlind: boolean,
  response: { model_left: string | null; model_right: string | null },
): { left: string; right: string } {
  if (isBlind) return blindPaneLabels()
  return {
    left: response.model_left ?? BLIND_SLOT_LEFT,
    right: response.model_right ?? BLIND_SLOT_RIGHT,
  }
}

export interface ComparePaneExport {
  label: string
  content: string
}

export interface CompareExportInput {
  prompt: string
  isBlind: boolean
  compareMode?: string
  expectedAnswer?: string
  left: ComparePaneState
  right: ComparePaneState
  revealed?: { left: string; right: string } | null
}

export interface MultiCompareExportInput {
  prompt: string
  isBlind: boolean
  compareMode?: string
  expectedAnswer?: string
  panes: ComparePaneExport[]
  revealed?: string[] | null
}

function compareExportHeader(input: {
  prompt: string
  isBlind: boolean
  compareMode?: string
  expectedAnswer?: string
}): string {
  const date = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const mode = input.compareMode ?? 'chat'
  let md = '# Compare\n\n'
  md += `**When:** ${date}\n`
  md += `**Type:** ${mode}${input.isBlind ? ' (blind)' : ''}\n`
  md += `**Prompt:**\n\n\`\`\`\n${input.prompt || '(no prompt)'}\n\`\`\`\n\n`
  if (input.expectedAnswer) {
    md += `**Expected answer:** \`${input.expectedAnswer}\`\n\n`
  }
  return md
}

export function buildMultiPaneComparisonMarkdown(input: MultiCompareExportInput): string | null {
  const hasContent = input.prompt.trim() || input.panes.some((p) => p.content.trim())
  if (!hasContent) return null

  let md = compareExportHeader(input)
  input.panes.forEach((pane, i) => {
    const label = input.revealed?.[i] ?? pane.label
    const text = pane.content.trim()
    md += `## ${label}\n\n`
    md += text ? `${text}\n\n` : '_(no response)_\n\n'
    md += '---\n\n'
  })
  return md
}

export function buildComparisonMarkdown(input: CompareExportInput): string | null {
  const { prompt, isBlind, left, right, revealed } = input
  return buildMultiPaneComparisonMarkdown({
    prompt,
    isBlind,
    compareMode: input.compareMode,
    expectedAnswer: input.expectedAnswer,
    panes: [
      { label: left.label, content: left.content },
      { label: right.label, content: right.content },
    ],
    revealed: revealed ? [revealed.left, revealed.right] : null,
  })
}

export function downloadComparisonMarkdown(md: string, filename?: string) {
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? `compare-${ts}.md`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function copyComparisonMarkdown(md: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(md)
    return
  }
  const ta = document.createElement('textarea')
  ta.value = md
  ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  ta.remove()
}

export function printComparisonMarkdown(md: string) {
  const w = window.open('', '_blank')
  if (!w) return
  try {
    w.opener = null
  } catch {
    /* ignore */
  }
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html =
    '<!doctype html><meta charset="utf-8"><title>Compare export</title>' +
    '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
    'max-width:780px;margin:32px auto;padding:0 24px;line-height:1.55;color:#222}' +
    'pre{background:#f5f5f5;border-radius:6px;padding:10px;white-space:pre-wrap}' +
    'h1{margin-top:0}h2{border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:32px}' +
    'hr{border:none;border-top:1px solid #ccc;margin:24px 0}</style>' +
    `<body><pre style="background:none;padding:0">${escape(md)}</pre>` +
    '<script>window.onload=()=>setTimeout(()=>window.print(),100)</script>'
  w.document.write(html)
  w.document.close()
}

export function compareExportFromState(
  state: CompareRunState,
  prompt: string,
  compareMode?: string,
): CompareExportInput {
  return {
    prompt,
    isBlind: state.isBlind,
    compareMode,
    left: state.left,
    right: state.right,
    revealed: state.revealed,
  }
}

export function multiCompareExportInput(
  panes: Array<{ label: string; content: string }>,
  prompt: string,
  isBlind: boolean,
  revealed: string[] | null,
  compareMode?: string,
): MultiCompareExportInput {
  return { prompt, isBlind, compareMode, panes, revealed }
}
