import { describe, expect, it } from 'vitest'
import { routeDocumentTitle, SKIP_LINK_TARGET_ID } from './a11y'

describe('a11y helpers', () => {
  it('maps known routes to document titles', () => {
    expect(routeDocumentTitle('/library')).toBe('Documents · Odysseus')
    expect(routeDocumentTitle('/agents')).toBe('Agents · Odysseus')
    expect(routeDocumentTitle('/group-chat')).toBe('Group chat · Odysseus')
    expect(routeDocumentTitle('/chat/abc')).toBe('Chat · Odysseus')
  })

  it('exports stable skip link target id', () => {
    expect(SKIP_LINK_TARGET_ID).toBe('main-content')
  })
})
