import { describe, expect, it } from 'vitest'
import { ApiError } from './client'

describe('ApiError', () => {
  it('stores status and message', () => {
    const err = new ApiError('Unauthorized', 401, { detail: 'nope' })
    expect(err.message).toBe('Unauthorized')
    expect(err.status).toBe(401)
    expect(err.name).toBe('ApiError')
  })
})
