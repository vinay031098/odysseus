const PLAN_KEY = 'odysseus-plan'

interface StoredPlan {
  sid: string
  text: string
}

export function getStoredPlan(sessionId: string | null): string {
  if (!sessionId) return ''
  try {
    const raw = localStorage.getItem(PLAN_KEY)
    if (!raw) return ''
    const rec = JSON.parse(raw) as StoredPlan
    return rec.sid === sessionId && rec.text ? rec.text : ''
  } catch {
    return ''
  }
}

export function setStoredPlan(sessionId: string, text: string) {
  if (!text.trim()) return
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify({ sid: sessionId, text }))
  } catch {
    /* ignore */
  }
}

/** GitHub-style checklist line marks an agent plan proposal. */
export const CHECKLIST_RE = /^\s*[-*]\s+\[[ xX]\]\s+/m

export function looksLikePlan(text: string): boolean {
  return CHECKLIST_RE.test(text)
}

export const PLAN_APPROVE_MESSAGE =
  'Approved — execute the plan. The full approved checklist is pinned ' +
  'for you under "## ACTIVE PLAN"; do NOT go looking for it in tasks, notes, or ' +
  'memory. Work through it in order, and after each step call the update_plan tool ' +
  'with the full checklist and that step marked `- [x]`. Do the next unchecked item ' +
  'until all are done.'
