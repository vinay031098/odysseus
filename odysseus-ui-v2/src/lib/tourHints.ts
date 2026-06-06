/** Tour hints — drag-to-snap pro tip and optional first-visit banners. */

const HINT_SEEN_KEY = 'odysseus-hint-drag-to-snap-seen'
const CHAT_FIRST_VISIT_KEY = 'odysseus-chat-first-visit-v1'

const SHOW_PANELS = new Set([
  'email-lib-modal',
  'calendar-modal',
  'compare-modal',
  'cookbook-modal',
  'gallery-modal',
  'doclib-modal',
  'library-modal',
  'memory-modal',
  'tasks-modal',
  'theme-modal',
])

const SHOW_PANEL_PREFIXES = ['email-window-']

let watcherInitialized = false
let dragHintShown = false

export function hasSeenTourHint(): boolean {
  try {
    return localStorage.getItem(HINT_SEEN_KEY) === '1'
  } catch {
    return true
  }
}

export function markTourHintSeen(): void {
  try {
    localStorage.setItem(HINT_SEEN_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function shouldShowChatFirstVisit(): boolean {
  try {
    return localStorage.getItem(CHAT_FIRST_VISIT_KEY) !== '1'
  } catch {
    return false
  }
}

export function markChatFirstVisitSeen(): void {
  try {
    localStorage.setItem(CHAT_FIRST_VISIT_KEY, '1')
  } catch {
    /* ignore */
  }
}

function panelShouldShowHint(id: string): boolean {
  if (!id) return false
  if (SHOW_PANELS.has(id)) return true
  return SHOW_PANEL_PREFIXES.some((p) => id.startsWith(p))
}

function isVisible(el: HTMLElement): boolean {
  if (!el || el.classList.contains('hidden')) return false
  if (el.style.display === 'none') return false
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

function placeHint(pop: HTMLElement, anchor: HTMLElement): void {
  const content = anchor.querySelector('.modal-content') ?? anchor
  const r = content.getBoundingClientRect()
  const pw = pop.offsetWidth || 260
  const ph = pop.offsetHeight || 200
  let left = r.right + 14
  let top = r.top
  if (left + pw > window.innerWidth - 8) {
    left = r.left - pw - 14
    if (left < 8) {
      left = Math.max(8, r.left + (r.width - pw) / 2)
      top = r.bottom + 14
      if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 14)
    }
  }
  pop.style.left = `${left}px`
  pop.style.top = `${top}px`
}

function dismissHint(pop: HTMLElement): void {
  pop.classList.add('tour-hint-out')
  setTimeout(() => pop.remove(), 280)
  markTourHintSeen()
}

function showDragSnapHint(anchor: HTMLElement): void {
  if (hasSeenTourHint() || dragHintShown) return
  if (document.body.classList.contains('tour-active')) return
  if (document.getElementById('tour-tooltip')) return
  if (window.innerWidth <= 768) return

  dragHintShown = true
  const pop = document.createElement('div')
  pop.className = 'tour-hint'
  pop.innerHTML = `
    <div class="tour-hint-visual" aria-hidden="true">
      <svg viewBox="0 0 100 60" width="160" height="96">
        <rect x="0.5" y="0.5" width="99" height="59" rx="3" fill="none" stroke="currentColor" stroke-opacity="0.18" />
        <rect class="th-zone" x="51" y="2" width="47" height="56" rx="2" fill="currentColor" opacity="0" />
        <g class="th-modal-group">
          <rect x="22" y="20" width="34" height="22" rx="2.5" fill="var(--color-background)" stroke="currentColor" stroke-width="1.2" />
          <rect x="22" y="20" width="34" height="5" rx="2.5" fill="currentColor" opacity="0.35" />
        </g>
        <path class="th-cursor" d="M0 0 L0 9 L2.5 7 L4.5 10 L6 9 L4 6 L7 6 Z" fill="currentColor" />
      </svg>
    </div>
    <div class="tour-hint-text"><b>Pro tip:</b> drag any window's title bar to a screen edge to snap it. Drag to the top for fullscreen.</div>
    <button class="tour-hint-dismiss" type="button">Got it</button>
  `
  document.body.appendChild(pop)
  pop.style.opacity = '0'
  requestAnimationFrame(() => {
    placeHint(pop, anchor)
    pop.style.opacity = ''
    pop.classList.add('tour-hint-in')
  })

  const dismiss = () => dismissHint(pop)
  pop.querySelector('.tour-hint-dismiss')?.addEventListener('click', dismiss)
  setTimeout(() => {
    if (pop.isConnected) dismiss()
  }, 14000)
}

function onPanelOpened(modal: HTMLElement): void {
  if (dragHintShown || hasSeenTourHint()) return
  const id = modal.id || modal.dataset.tourHintPanel || ''
  if (!panelShouldShowHint(id)) return
  setTimeout(() => {
    if (isVisible(modal)) showDragSnapHint(modal)
  }, 380)
}

function observeModal(modal: HTMLElement, observer: MutationObserver): void {
  if (modal.dataset.tourHintObserved === '1') return
  modal.dataset.tourHintObserved = '1'
  observer.observe(modal, {
    attributes: true,
    attributeOldValue: true,
    attributeFilter: ['class', 'style'],
  })
  if (isVisible(modal)) onPanelOpened(modal)
}

/** Watch legacy `.modal` elements and `[data-tour-hint-panel]` nodes. */
export function initTourHintWatcher(): void {
  if (watcherInitialized || hasSeenTourHint()) return
  watcherInitialized = true

  const observer = new MutationObserver((muts) => {
    if (hasSeenTourHint() || dragHintShown) return
    for (const m of muts) {
      if (m.attributeName !== 'class' && m.attributeName !== 'style') continue
      const el = m.target
      if (!(el instanceof HTMLElement)) continue
      const isModal = el.classList.contains('modal') || el.dataset.tourHintPanel
      if (!isModal) continue
      const old = m.oldValue ?? ''
      const wasHidden = !old || /\bhidden\b/.test(old) || /display:\s*none/.test(old)
      if (wasHidden && isVisible(el)) onPanelOpened(el)
    }
  })

  const boot = () => {
    document.querySelectorAll('.modal, [data-tour-hint-panel]').forEach((el) => {
      if (el instanceof HTMLElement) observeModal(el, observer)
    })
    const addObserver = new MutationObserver((muts) => {
      if (hasSeenTourHint() || dragHintShown) return
      for (const m of muts) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return
          if (node.classList.contains('modal') || node.dataset.tourHintPanel) {
            observeModal(node, observer)
          }
          node.querySelectorAll?.('.modal, [data-tour-hint-panel]').forEach((child) => {
            if (child instanceof HTMLElement) observeModal(child, observer)
          })
        })
      }
    })
    addObserver.observe(document.body, { childList: true, subtree: true })
  }

  setTimeout(boot, 50)
}

/** Show the drag-to-snap hint anchored to a panel element (v2 routes). */
export function maybeShowTourHint(anchor?: HTMLElement | null): void {
  if (!anchor || hasSeenTourHint() || dragHintShown) return
  if (window.innerWidth <= 768) return
  setTimeout(() => showDragSnapHint(anchor), 380)
}

/** @deprecated Use initTourHintWatcher */
export function maybeShowTourHintLegacy(): void {
  initTourHintWatcher()
}
