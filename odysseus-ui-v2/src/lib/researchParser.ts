import type { ResearchProgress, ResearchStreamEvent } from '@/api/types'

export function parseResearchStreamData(data: string): ResearchStreamEvent | null {
  if (!data.trim()) return null
  try {
    return JSON.parse(data) as ResearchStreamEvent
  } catch {
    return null
  }
}

export function formatResearchPhase(
  progress: ResearchProgress | null | undefined,
  maxRounds?: number,
): string {
  if (!progress?.phase) return 'Starting…'
  const round = progress.round
    ? maxRounds
      ? `Round ${progress.round}/${maxRounds}: `
      : `Round ${progress.round}: `
    : ''

  switch (progress.phase) {
    case 'probing':
      return 'Probing model…'
    case 'planning':
      return 'Planning research strategy…'
    case 'searching':
      return `${round}Searching (${progress.queries ?? 0} queries)`
    case 'reading':
      return `${round}Reading ${progress.total_sources ?? 0} sources`
    case 'analyzing':
      return `${round}Analyzing ${progress.total_findings ?? 0} findings`
    case 'writing':
      return `Writing report — ${progress.total_sources ?? 0} sources`
    default:
      return progress.phase
  }
}

export function isResearchTerminal(event: ResearchStreamEvent): boolean {
  return Boolean(event.final) || event.status === 'not_found'
}

export function researchStatusLabel(status: string): string {
  switch (status) {
    case 'running':
      return 'Running'
    case 'done':
      return 'Complete'
    case 'cancelled':
      return 'Cancelled'
    case 'error':
      return 'Failed'
    default:
      return status
  }
}
