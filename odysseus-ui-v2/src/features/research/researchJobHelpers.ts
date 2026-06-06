import type { ResearchProgress } from '@/api/types'

/** Progress bar cap — auto mode uses 8 rounds as heuristic (legacy panel.js). */
export function researchProgressPercent(
  progress: ResearchProgress | null | undefined,
  maxRounds: number,
): number {
  const round = progress?.round ?? 0
  const barCap = maxRounds > 0 ? maxRounds : 8
  if (!round) return 0
  return Math.min(100, Math.round((round / barCap) * 100))
}

export function researchFailedNoSources(sourceCount: number | undefined): boolean {
  return sourceCount === 0
}
