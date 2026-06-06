import { describe, expect, it } from 'vitest'

describe('lazy route modules', () => {
  it('resolves heavy page chunks', async () => {
    const loaders = [
      () => import('@/pages/ChatPage'),
      () => import('@/pages/EmailPage'),
      () => import('@/pages/AgentsPage'),
      () => import('@/pages/GroupChatPage'),
      () => import('@/pages/ResearchPage'),
      () => import('@/pages/GalleryPage'),
      () => import('@/pages/LibraryPage'),
    ]
    for (const load of loaders) {
      const mod = await load()
      expect(mod).toBeTypeOf('object')
    }
  }, 120_000)
})
