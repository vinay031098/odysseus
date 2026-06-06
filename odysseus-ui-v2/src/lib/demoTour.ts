const TOUR_STYLE_ID = 'odysseus-demo-tour-styles'

export interface DemoTourStep {
  text: string
  selector?: string
  navigate?: string
}

const TOUR_STEPS: DemoTourStep[] = [
  {
    text: 'Welcome to Odysseus! This quick tour highlights the main areas. Use **Next** to continue or **Skip** to exit.',
  },
  {
    text: 'The **icon rail** on the left jumps between Chat, Compare, Research, Gallery, and more.',
    selector: '#icon-rail',
    navigate: '/chat',
  },
  {
    text: 'Type messages here and use **/** for slash commands — try `/help`, `/toggle web`, or `/compare`.',
    selector: '#main-content textarea',
    navigate: '/chat',
  },
  {
    text: '**Compare** runs the same prompt across multiple models side-by-side. Vote and track wins on the scoreboard.',
    selector: 'a[href="/compare"]',
    navigate: '/compare',
  },
  {
    text: '**Deep Research** performs multi-step web research with queued batch jobs.',
    selector: 'a[href="/research"]',
    navigate: '/research',
  },
  {
    text: 'Add model endpoints and tune appearance in **Settings**. Try `/setup` for a quick start.',
    selector: 'a[href="/settings"]',
    navigate: '/settings',
  },
  {
    text: "You're set! Start a chat, run a comparison, or type `/help` anytime. Happy exploring.",
    navigate: '/chat',
  },
]

function ensureTourStyles() {
  if (document.getElementById(TOUR_STYLE_ID)) return
  const s = document.createElement('style')
  s.id = TOUR_STYLE_ID
  s.textContent = `
    body.odysseus-tour-active { overflow: visible !important; }
    .odysseus-tour-highlight {
      outline: 2px solid hsl(var(--destructive, 0 84% 60%)) !important;
      outline-offset: 3px;
      border-radius: 6px;
      position: relative;
      z-index: 10000;
    }
    #odysseus-tour-tooltip {
      position: fixed; z-index: 10002; max-width: 300px;
      background: hsl(var(--background)); color: hsl(var(--foreground));
      border: 1px solid hsl(var(--border)); border-radius: 8px;
      padding: 12px 14px; font-size: 0.82rem; line-height: 1.5;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      opacity: 0; transform: translateY(6px);
      transition: opacity 0.25s ease, transform 0.25s ease;
    }
    #odysseus-tour-tooltip.tour-visible { opacity: 1; transform: translateY(0); }
    #odysseus-tour-tooltip .tour-nav {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 10px; gap: 8px;
    }
    #odysseus-tour-tooltip button {
      background: none; border: 1px solid hsl(var(--border));
      color: inherit; border-radius: 6px; padding: 4px 10px;
      font-size: 0.75rem; cursor: pointer;
    }
    #odysseus-tour-tooltip button:hover { background: hsl(var(--muted) / 0.3); }
    #odysseus-tour-tooltip .tour-step-label {
      font-size: 0.7rem; opacity: 0.6;
    }
  `
  document.head.appendChild(s)
}

function clearTourUi() {
  document.querySelectorAll('.odysseus-tour-highlight').forEach((el) => {
    el.classList.remove('odysseus-tour-highlight')
  })
  document.getElementById('odysseus-tour-tooltip')?.remove()
  document.body.classList.remove('odysseus-tour-active')
}

function positionTooltip(tooltip: HTMLElement, target: Element | null) {
  const pad = 10
  if (!target) {
    tooltip.style.top = '50%'
    tooltip.style.left = '50%'
    tooltip.style.transform = 'translate(-50%, -50%)'
    return
  }
  tooltip.style.transform = ''
  const rect = target.getBoundingClientRect()
  let top = rect.bottom + pad
  const left = Math.min(rect.left, window.innerWidth - 320)
  if (top + tooltip.offsetHeight > window.innerHeight - pad) {
    top = Math.max(pad, rect.top - tooltip.offsetHeight - pad)
  }
  tooltip.style.top = `${Math.round(top)}px`
  tooltip.style.left = `${Math.round(Math.max(pad, left))}px`
}

function showStep(
  index: number,
  navigate: (path: string) => void,
  onDone: () => void,
) {
  clearTourUi()
  ensureTourStyles()
  document.body.classList.add('odysseus-tour-active')

  const step = TOUR_STEPS[index]
  if (!step) {
    onDone()
    return
  }

  if (step.navigate) navigate(step.navigate)

  window.setTimeout(() => {
    let target: Element | null = null
    if (step.selector) {
      target = document.querySelector(step.selector)
      target?.classList.add('odysseus-tour-highlight')
      target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }

    const tooltip = document.createElement('div')
    tooltip.id = 'odysseus-tour-tooltip'
    tooltip.innerHTML = `
      <p>${step.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>
      <div class="tour-nav">
        <span class="tour-step-label">${index + 1} / ${TOUR_STEPS.length}</span>
        <div style="display:flex;gap:6px">
          ${index > 0 ? '<button type="button" data-tour="back">Back</button>' : ''}
          <button type="button" data-tour="skip">Skip</button>
          <button type="button" data-tour="next">${index >= TOUR_STEPS.length - 1 ? 'Done' : 'Next'}</button>
        </div>
      </div>
    `
    document.body.appendChild(tooltip)
    requestAnimationFrame(() => tooltip.classList.add('tour-visible'))
    positionTooltip(tooltip, target)

    tooltip.querySelector('[data-tour="skip"]')?.addEventListener('click', () => {
      clearTourUi()
      onDone()
    })
    tooltip.querySelector('[data-tour="back"]')?.addEventListener('click', () => {
      showStep(index - 1, navigate, onDone)
    })
    tooltip.querySelector('[data-tour="next"]')?.addEventListener('click', () => {
      if (index >= TOUR_STEPS.length - 1) {
        clearTourUi()
        onDone()
      } else {
        showStep(index + 1, navigate, onDone)
      }
    })
  }, step.navigate ? 280 : 0)
}

/** Start the interactive product tour overlay (v2 parity with legacy /demo). */
export function startDemoTour(navigate: (path: string) => void): void {
  if (typeof document === 'undefined') return
  showStep(0, navigate, () => {})
}

export function tourStepCount(): number {
  return TOUR_STEPS.length
}
