import { describe, expect, it } from 'vitest'
import { isBulkCancelVisible } from './bulkCancelEsc'

describe('isBulkCancelVisible', () => {
  it('returns false for hidden buttons', () => {
    const btn = document.createElement('button')
    btn.id = 'gallery-bulk-cancel'
    btn.style.display = 'none'
    document.body.appendChild(btn)
    expect(isBulkCancelVisible(btn)).toBe(false)
    btn.remove()
  })

  it('returns true for visible buttons', () => {
    const btn = document.createElement('button')
    btn.id = 'skills-bulk-cancel'
    btn.getClientRects = () => [{ width: 10, height: 10 }] as unknown as DOMRectList
    document.body.appendChild(btn)
    expect(isBulkCancelVisible(btn)).toBe(true)
    btn.remove()
  })
})
