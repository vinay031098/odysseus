import { describe, expect, it, vi } from 'vitest'
import * as galleryApi from './gallery'

vi.mock('./client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    postForm: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from './client'

describe('gallery API', () => {
  it('builds library query params', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ items: [], total: 0, tags: [], models: [] })
    await galleryApi.fetchGalleryLibrary({
      search: 'beach',
      favorites: true,
      sort: 'shuffle',
      seed: 42,
      limit: 24,
    })
    expect(api.get).toHaveBeenCalledWith(
      '/api/gallery/library?search=beach&favorites=true&sort=shuffle&seed=42&limit=24',
    )
  })

  it('uploads via multipart form', async () => {
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
    vi.mocked(api.postForm).mockResolvedValueOnce({ ok: true, id: '1' })
    await galleryApi.uploadGalleryImage(file, 'album-1')
    const form = vi.mocked(api.postForm).mock.calls[0][1] as FormData
    expect(form.get('album_id')).toBe('album-1')
    expect(form.get('file')).toBe(file)
  })

  it('posts rename and rotate endpoints', async () => {
    vi.mocked(api.post).mockResolvedValue({ ok: true })
    await galleryApi.renameGalleryImage('img-1', 'Sunset')
    expect(api.post).toHaveBeenCalledWith('/api/gallery/img-1/rename', { name: 'Sunset' })
    await galleryApi.rotateGalleryImage('img-1', 90)
    expect(api.post).toHaveBeenCalledWith('/api/gallery/img-1/rotate', { angle: 90 })
  })
})
