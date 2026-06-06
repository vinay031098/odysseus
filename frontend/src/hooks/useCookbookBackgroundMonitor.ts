import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { CookbookState } from '@/api/cookbookServe'
import { saveCookbookState } from '@/api/cookbookServe'
import { fetchModelEndpoints } from '@/api/settings'
import { cookbookServeKeys } from '@/hooks/useCookbookServe'
import { selfHealStaleTasks } from '@/lib/cookbookDownloadQueue'
import { applyServeReachability, fetchLocalEndpointProbes } from '@/lib/cookbookServeMonitor'

const BG_MONITOR_INTERVAL_MS = 5000
const SELF_HEAL_THROTTLE_MS = 4000

/**
 * Background monitor: stale-download tmux self-heal + local serve reachability probes.
 * Mirrors legacy `_startBackgroundMonitor` in cookbookRunning.js.
 */
export function useCookbookBackgroundMonitor(enabled = true) {
  const queryClient = useQueryClient()
  const oneShotRef = useRef(false)
  const lastSelfHealRef = useRef(0)
  const runningRef = useRef(false)

  useEffect(() => {
    if (!enabled) return

    const runCycle = async (opts?: { oneShot?: boolean }) => {
      if (runningRef.current) return
      runningRef.current = true
      try {
        const state = queryClient.getQueryData<CookbookState>(cookbookServeKeys.state)
        if (!state) return

        let tasks = [...(state.tasks ?? [])]
        let changed = false

        const now = Date.now()
        const allowSelfHeal =
          opts?.oneShot && !oneShotRef.current
            ? true
            : !opts?.oneShot && now - lastSelfHealRef.current >= SELF_HEAL_THROTTLE_MS

        if (allowSelfHeal) {
          if (opts?.oneShot) {
            if (oneShotRef.current) return
            oneShotRef.current = true
          } else {
            lastSelfHealRef.current = now
          }
          const healed = await selfHealStaleTasks(tasks)
          if (healed.flipped > 0) {
            tasks = healed.tasks
            changed = true
          }
        }

        const runningServes = tasks.filter((t) => t.type === 'serve' && t.status === 'running')
        if (runningServes.length) {
          try {
            const [endpoints, probes] = await Promise.all([
              fetchModelEndpoints(),
              fetchLocalEndpointProbes(),
            ])
            const reach = applyServeReachability(tasks, endpoints, probes)
            if (reach.changed) {
              tasks = reach.tasks
              changed = true
            }
          } catch {
            /* probe blip */
          }
        }

        if (changed) {
          await saveCookbookState({ ...state, tasks })
          void queryClient.invalidateQueries({ queryKey: cookbookServeKeys.state })
          void queryClient.invalidateQueries({ queryKey: cookbookServeKeys.tasks })
        }
      } finally {
        runningRef.current = false
      }
    }

    void runCycle({ oneShot: true })

    const id = window.setInterval(() => {
      void runCycle()
    }, BG_MONITOR_INTERVAL_MS)

    return () => window.clearInterval(id)
  }, [enabled, queryClient])
}
