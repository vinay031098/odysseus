import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  aiReplyEmail,
  cancelScheduledEmail,
  fetchScheduledEmails,
  summarizeEmail,
} from './email'

const post = vi.fn()
const get = vi.fn()
const del = vi.fn()

vi.mock('./client', () => ({
  api: {
    post: (...args: unknown[]) => post(...args),
    get: (...args: unknown[]) => get(...args),
    delete: (...args: unknown[]) => del(...args),
  },
}))

describe('email wave 11 APIs', () => {
  beforeEach(() => {
    post.mockReset()
    get.mockReset()
    del.mockReset()
  })

  it('summarizeEmail posts to /api/email/summarize', async () => {
    post.mockResolvedValue({ success: true, summary: '- point' })
    const payload = { body: 'hello', subject: 'Hi', uid: '1' }
    const res = await summarizeEmail(payload)
    expect(post).toHaveBeenCalledWith('/api/email/summarize', payload)
    expect(res.summary).toBe('- point')
  })

  it('aiReplyEmail posts to /api/email/ai-reply', async () => {
    post.mockResolvedValue({ success: true, reply: 'Thanks!' })
    const payload = {
      to: 'a@b.com',
      subject: 'Re: Hi',
      original_body: 'hello',
      fast: true,
    }
    await aiReplyEmail(payload)
    expect(post).toHaveBeenCalledWith('/api/email/ai-reply', payload)
  })

  it('fetchScheduledEmails reads scheduled queue', async () => {
    get.mockResolvedValue({ scheduled: [{ id: 's1', to: 'x@y.com', subject: 'Later', send_at: '2026-01-01', status: 'pending' }] })
    const rows = await fetchScheduledEmails()
    expect(get).toHaveBeenCalledWith('/api/email/scheduled')
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('s1')
  })

  it('cancelScheduledEmail deletes by id', async () => {
    del.mockResolvedValue({ success: true })
    await cancelScheduledEmail('s1')
    expect(del).toHaveBeenCalledWith('/api/email/scheduled/s1')
  })
})
