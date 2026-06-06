import { describe, expect, it, vi, afterEach } from 'vitest'
import { uploadUrl } from '@/api/chat'

describe('chat api helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds upload URL for attachment preview', () => {
    expect(uploadUrl('file_abc123')).toBe('/api/upload/file_abc123')
  })
})
