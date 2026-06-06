/**
 * Desktop window tiling for draggable modals (.modal-header → .modal-content).
 * Ported from static/js/tileManager.js — snap zones + ghost preview.
 */

const EDGE_THRESHOLD_PX = 24
const TOP_FULL_STRIP_PX = 8
const DESKTOP_MIN = 769

type SnapRect = { left: number; top: number; width: number; height: number }
type SnapZone = { name: string; rect: SnapRect }

type Tracking = {
  content: HTMLElement
  startX: number
  startY: number
  willUnsnap: boolean
}

let ghost: HTMLDivElement | null = null
let activeZone: SnapZone | null = null
let tracking: Tracking | null = null

function isDesktop(): boolean {
  return window.innerWidth >= DESKTOP_MIN
}

function ensureGhost(): HTMLDivElement {
  if (ghost) return ghost
  ghost = document.createElement('div')
  ghost.id = 'tile-ghost'
  document.body.appendChild(ghost)
  return ghost
}

function hideGhost(): void {
  ghost?.classList.remove('visible')
}

function showGhost(rect: SnapRect): void {
  const g = ensureGhost()
  g.style.left = `${rect.left}px`
  g.style.top = `${rect.top}px`
  g.style.width = `${rect.width}px`
  g.style.height = `${rect.height}px`
  g.classList.add('visible')
}

function viewportSafeRect(): SnapRect & { right: number; bottom: number } {
  const sidebar = document.getElementById('sidebar')
  const rail = document.querySelector<HTMLElement>('.icon-rail, #icon-rail')
  let leftEdge = 0
  const sb = sidebar?.getBoundingClientRect()
  if (sb && sb.right > 0 && !sidebar?.classList.contains('hidden')) {
    leftEdge = Math.max(leftEdge, sb.right)
  }
  const rr = rail?.getBoundingClientRect()
  if (rr && rr.right > 0 && rr.width > 0) leftEdge = Math.max(leftEdge, rr.right)
  return {
    left: leftEdge + 4,
    top: 4,
    right: window.innerWidth - 4,
    bottom: window.innerHeight - 4,
    width: 0,
    height: 0,
  }
}

function zoneForPointer(x: number, y: number): SnapZone | null {
  const safe = viewportSafeRect()
  const W = safe.right - safe.left
  const H = safe.bottom - safe.top

  if (y <= 0) {
    return {
      name: 'fullscreen',
      rect: { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight },
    }
  }
  if (y <= safe.top + TOP_FULL_STRIP_PX) {
    return { name: 'maximize', rect: { left: safe.left, top: safe.top, width: W, height: H } }
  }
  if (x >= safe.right - EDGE_THRESHOLD_PX) {
    return {
      name: 'right-half',
      rect: { left: safe.left + W / 2, top: safe.top, width: W / 2, height: H },
    }
  }
  if (y >= safe.bottom - EDGE_THRESHOLD_PX) {
    return {
      name: 'bottom-half',
      rect: { left: safe.left, top: safe.top + H / 2, width: W, height: H / 2 },
    }
  }
  return null
}

function zoneForContent(content: HTMLElement, x: number, y: number): SnapZone | null {
  const modal = content.closest('.modal, .research-overlay')
  const zone = zoneForPointer(x, y)
  if (!zone) return null
  if (modal?.id === 'settings-modal' && zone.name !== 'right-half') return null
  if (
    modal &&
    (modal.id === 'cookbook-modal' || modal.id === 'theme-modal' || modal.id === 'memory-modal') &&
    zone.name !== 'fullscreen'
  ) {
    return null
  }
  return zone
}

function applySnap(content: HTMLElement, rect: SnapRect, zoneName: string): void {
  const fromRect = content.getBoundingClientRect()
  if (!content.dataset._tilePreSnap) {
    content.dataset._tilePreSnap = JSON.stringify({
      position: 'fixed',
      left: content.style.left || `${Math.round(fromRect.left)}px`,
      top: content.style.top || `${Math.round(fromRect.top)}px`,
      width: content.style.width,
      height: content.style.height,
      maxHeight: content.style.maxHeight,
      transform: content.style.transform,
    })
  }
  content.style.transition =
    'left 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)'
  content.style.setProperty('position', 'fixed', 'important')
  content.style.setProperty('left', `${rect.left}px`, 'important')
  content.style.setProperty('top', `${rect.top}px`, 'important')
  content.style.setProperty('width', `${rect.width}px`, 'important')
  content.style.setProperty('height', `${rect.height}px`, 'important')
  content.style.setProperty('max-height', `${rect.height}px`, 'important')
  content.style.setProperty('margin', '0', 'important')
  content.style.setProperty('transform', 'none', 'important')
  content.dataset._tileZone = zoneName
  window.setTimeout(() => {
    content.style.transition = ''
  }, 250)
}

function unsnap(content: HTMLElement): void {
  const pre = content.dataset._tilePreSnap
  if (!pre) return
  ;['position', 'left', 'top', 'width', 'height', 'max-height', 'margin', 'transform'].forEach(
    (p) => content.style.removeProperty(p),
  )
  try {
    const r = JSON.parse(pre) as Record<string, string>
    Object.assign(content.style, r)
  } catch {
    /* ignore */
  }
  if (!content.style.position) content.style.position = 'fixed'
  delete content.dataset._tilePreSnap
  delete content.dataset._tileZone
}

function findDragTarget(e: Event): HTMLElement | null {
  const target = e.target
  if (!(target instanceof Element)) return null
  const header = target.closest('.modal-header')
  if (!header) return null
  if (target.closest('button')) return null
  const modal = header.closest('.modal, .research-overlay')
  if (!modal) return null
  const content = modal.querySelector<HTMLElement>('.modal-content, .research-pane')
  return content
}

function rectForZone(name: string): SnapRect | null {
  const safe = viewportSafeRect()
  const W = safe.right - safe.left
  const H = safe.bottom - safe.top
  switch (name) {
    case 'fullscreen':
      return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
    case 'maximize':
      return { left: safe.left, top: safe.top, width: W, height: H }
    case 'right-half':
      return { left: safe.left + W / 2, top: safe.top, width: W / 2, height: H }
    case 'bottom-half':
      return { left: safe.left, top: safe.top + H / 2, width: W, height: H / 2 }
    default:
      return null
  }
}

function reclampAll(animate = false): void {
  document
    .querySelectorAll<HTMLElement>('.modal-content[data-_tile-zone], .research-pane[data-_tile-zone]')
    .forEach((c) => {
      const name = c.dataset._tileZone
      if (!name) return
      const r = rectForZone(name)
      if (!r) return
      if (animate) {
        c.style.transition =
          'left 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)'
        window.setTimeout(() => {
          c.style.transition = ''
        }, 250)
      }
      c.style.setProperty('left', `${r.left}px`, 'important')
      c.style.setProperty('top', `${r.top}px`, 'important')
      c.style.setProperty('width', `${r.width}px`, 'important')
      c.style.setProperty('height', `${r.height}px`, 'important')
      c.style.setProperty('max-height', `${r.height}px`, 'important')
    })
}

let reclampPending = false
function reclampAllThrottled(animate: boolean): void {
  if (reclampPending) return
  reclampPending = true
  requestAnimationFrame(() => {
    try {
      reclampAll(animate)
    } finally {
      reclampPending = false
    }
  })
}

function onPointerDown(e: PointerEvent): void {
  if (!isDesktop()) return
  const content = findDragTarget(e)
  if (!content) return
  tracking = {
    content,
    startX: e.clientX,
    startY: e.clientY,
    willUnsnap: !!content.dataset._tileZone,
  }
}

function onPointerMove(e: PointerEvent): void {
  if (!tracking || !isDesktop()) return
  const dx = e.clientX - tracking.startX
  const dy = e.clientY - tracking.startY
  if (Math.hypot(dx, dy) < 6) return
  if (tracking.willUnsnap) {
    unsnap(tracking.content)
    tracking.willUnsnap = false
  }
  const zone = zoneForContent(tracking.content, e.clientX, e.clientY)
  if (zone) {
    showGhost(zone.rect)
    activeZone = zone
  } else {
    hideGhost()
    activeZone = null
  }
}

function onPointerUp(): void {
  if (!tracking) return
  const t = tracking
  tracking = null
  hideGhost()
  if (activeZone && isDesktop()) {
    applySnap(t.content, activeZone.rect, activeZone.name)
  }
  activeZone = null
}

export function previewZoneAt(x: number, y: number, target: ParentNode | null = null): SnapZone | null {
  if (!isDesktop()) {
    hideGhost()
    activeZone = null
    return null
  }
  const content =
    target instanceof HTMLElement
      ? target.querySelector<HTMLElement>('.modal-content, .research-pane') ?? target
      : null
  const zone = content ? zoneForContent(content, x, y) : zoneForPointer(x, y)
  if (zone) {
    showGhost(zone.rect)
    activeZone = zone
  } else {
    hideGhost()
    activeZone = null
  }
  return zone
}

export function clearTilePreview(): void {
  hideGhost()
  activeZone = null
}

export function snapModalToZone(modal: ParentNode, zone: SnapZone): void {
  if (!modal || !zone) return
  const content =
    modal instanceof HTMLElement
      ? modal.querySelector<HTMLElement>('.modal-content, .research-pane') ?? modal
      : null
  if (!content) return
  if (modal instanceof HTMLElement && modal.id === 'settings-modal' && zone.name !== 'right-half') return
  applySnap(content, zone.rect, zone.name)
}

export function initTileManager(): () => void {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('pointermove', onPointerMove)
  document.addEventListener('pointerup', onPointerUp)

  const onResize = () => reclampAllThrottled(false)
  window.addEventListener('resize', onResize)

  const sidebar = document.getElementById('sidebar')
  let sidebarMo: MutationObserver | undefined
  if (sidebar) {
    sidebarMo = new MutationObserver(() => reclampAllThrottled(true))
    sidebarMo.observe(sidebar, { attributes: true, attributeFilter: ['class'] })
  }

  return () => {
    document.removeEventListener('pointerdown', onPointerDown)
    document.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('resize', onResize)
    sidebarMo?.disconnect()
    hideGhost()
    ghost?.remove()
    ghost = null
  }
}
