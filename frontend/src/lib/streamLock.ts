/** Web Lock API — keep tab alive during long streams (legacy chat.js parity). */

let releaseLock: (() => void) | null = null

export function acquireStreamLock(sessionId: string): void {
  releaseStreamLock()
  if (!navigator.locks) return
  void navigator.locks
    .request(`odysseus-stream-${sessionId}`, { mode: 'exclusive', ifAvailable: true }, (lock) => {
      if (!lock) return
      return new Promise<void>((resolve) => {
        releaseLock = resolve
      })
    })
    .catch(() => {
      /* best effort */
    })
}

export function releaseStreamLock(): void {
  releaseLock?.()
  releaseLock = null
}
