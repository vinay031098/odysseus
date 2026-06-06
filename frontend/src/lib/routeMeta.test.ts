import { describe, expect, it } from 'vitest'
import { normalizeRoutePath, resolveRouteMeta, routeDocumentTitle } from './routeMeta'

describe('routeMeta', () => {
  it('normalizes chat session paths', () => {
    expect(normalizeRoutePath('/chat/abc-123')).toBe('/chat')
  })

  it('maps tool routes to titles', () => {
    expect(routeDocumentTitle('/email')).toBe('Email · Odysseus')
    expect(routeDocumentTitle('/gallery')).toBe('Gallery · Odysseus')
    expect(routeDocumentTitle('/compare')).toBe('Compare · Odysseus')
  })

  it('includes favicon shapes for major tools', () => {
    expect(resolveRouteMeta('/calendar').faviconShape).toBeTruthy()
    expect(resolveRouteMeta('/chat').faviconShape).toBeUndefined()
    expect(resolveRouteMeta('/chat').title).toBe('Chat · Odysseus')
  })
})
