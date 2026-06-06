export const SKIP_LINK_TARGET_ID = 'main-content'
export const SKIP_LINK_LABEL = 'Skip to main content'

export function focusMainContent(): void {
  const main = document.getElementById(SKIP_LINK_TARGET_ID)
  if (!main) return
  if (!main.hasAttribute('tabindex')) {
    main.setAttribute('tabindex', '-1')
  }
  main.focus({ preventScroll: false })
}

export { routeDocumentTitle } from '@/lib/routeMeta'
