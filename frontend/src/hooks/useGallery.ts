import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as galleryApi from '@/api/gallery'
import type { GalleryLibraryParams, GalleryPatchPayload } from '@/api/gallery'

export const galleryLibraryKey = (params: GalleryLibraryParams) =>
  ['gallery', 'library', params] as const

export const galleryAlbumsKey = ['gallery', 'albums'] as const

export function useGalleryLibrary(params: GalleryLibraryParams) {
  return useQuery({
    queryKey: galleryLibraryKey(params),
    queryFn: () => galleryApi.fetchGalleryLibrary(params),
  })
}

export function useGalleryAlbums() {
  return useQuery({
    queryKey: galleryAlbumsKey,
    queryFn: () => galleryApi.fetchGalleryAlbums(),
  })
}

export function useGalleryMutations() {
  const qc = useQueryClient()

  const invalidateLibrary = () =>
    void qc.invalidateQueries({ queryKey: ['gallery', 'library'] })

  const invalidateAlbums = () =>
    void qc.invalidateQueries({ queryKey: galleryAlbumsKey })

  const upload = useMutation({
    mutationFn: ({ file, albumId }: { file: File; albumId?: string | null }) =>
      galleryApi.uploadGalleryImage(file, albumId),
    onSuccess: (data) => {
      if (data.duplicate) {
        toast.info('Duplicate photo skipped')
      } else if (data.ok) {
        toast.success('Photo uploaded')
      } else {
        toast.error(data.message ?? 'Upload failed')
      }
      invalidateLibrary()
      invalidateAlbums()
    },
    onError: () => toast.error('Upload failed'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => galleryApi.deleteGalleryImage(id),
    onSuccess: () => {
      invalidateLibrary()
      invalidateAlbums()
      toast.success('Photo deleted')
    },
    onError: () => toast.error('Could not delete photo'),
  })

  const toggleFavorite = useMutation({
    mutationFn: (id: string) => galleryApi.toggleGalleryFavorite(id),
    onSuccess: () => invalidateLibrary(),
    onError: () => toast.error('Could not update favorite'),
  })

  const patch = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: GalleryPatchPayload }) =>
      galleryApi.patchGalleryImage(id, payload),
    onSuccess: () => invalidateLibrary(),
    onError: () => toast.error('Could not update photo'),
  })

  const aiTag = useMutation({
    mutationFn: (id: string) => galleryApi.aiTagGalleryImage(id),
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success('AI tags added')
      invalidateLibrary()
    },
    onError: () => toast.error('AI tagging failed'),
  })

  const clearAiTags = useMutation({
    mutationFn: (imageId?: string) => galleryApi.clearGalleryAiTags(imageId),
    onSuccess: () => {
      toast.success('AI tags cleared')
      invalidateLibrary()
    },
    onError: () => toast.error('Could not clear AI tags'),
  })

  const createAlbum = useMutation({
    mutationFn: (name: string) => galleryApi.createGalleryAlbum(name),
    onSuccess: () => {
      invalidateAlbums()
      toast.success('Album created')
    },
    onError: () => toast.error('Could not create album'),
  })

  const deleteAlbum = useMutation({
    mutationFn: (id: string) => galleryApi.deleteGalleryAlbum(id),
    onSuccess: () => {
      invalidateAlbums()
      invalidateLibrary()
      toast.success('Album deleted')
    },
    onError: () => toast.error('Could not delete album'),
  })

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      galleryApi.renameGalleryImage(id, name),
    onSuccess: () => {
      invalidateLibrary()
      toast.success('Renamed')
    },
    onError: () => toast.error('Could not rename'),
  })

  const rotate = useMutation({
    mutationFn: ({ id, angle }: { id: string; angle: 90 | -90 | 180 | 270 }) =>
      galleryApi.rotateGalleryImage(id, angle),
    onSuccess: () => {
      invalidateLibrary()
      toast.success('Rotated')
    },
    onError: () => toast.error('Could not rotate'),
  })

  const bulkRemove = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await galleryApi.deleteGalleryImage(id)
      }
    },
    onSuccess: () => {
      invalidateLibrary()
      invalidateAlbums()
      toast.success('Photos deleted')
    },
    onError: () => toast.error('Some deletes failed'),
  })

  const bulkFavorite = useMutation({
    mutationFn: async (ids: string[]) => {
      let n = 0
      for (const id of ids) {
        await galleryApi.patchGalleryImage(id, { favorite: true })
        n++
      }
      return n
    },
    onSuccess: (n) => {
      invalidateLibrary()
      toast.success(`Favorited ${n} photo${n === 1 ? '' : 's'}`)
    },
    onError: () => toast.error('Could not favorite photos'),
  })

  const bulkTag = useMutation({
    mutationFn: async ({
      ids,
      tag,
      existingTagsFor,
    }: {
      ids: string[]
      tag: string
      existingTagsFor?: (id: string) => string
    }) => {
      let n = 0
      for (const id of ids) {
        const raw = existingTagsFor?.(id) ?? ''
        const existing = raw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
        if (existing.includes(tag)) continue
        const merged = [...existing, tag].join(', ')
        await galleryApi.patchGalleryImage(id, { tags: merged })
        n++
      }
      return { n, tag }
    },
    onSuccess: ({ n, tag }) => {
      invalidateLibrary()
      toast.success(`Tagged ${n} photo${n === 1 ? '' : 's'} “${tag}”`)
    },
    onError: () => toast.error('Could not tag photos'),
  })

  const bulkUpload = useMutation({
    mutationFn: async (items: { file: File; albumId?: string | null }[]) => {
      let ok = 0
      let dupes = 0
      for (const { file, albumId } of items) {
        const res = await galleryApi.uploadGalleryImage(file, albumId)
        if (res.duplicate) dupes++
        else if (res.ok) ok++
      }
      return { ok, dupes, total: items.length }
    },
    onSuccess: ({ ok, dupes }) => {
      invalidateLibrary()
      invalidateAlbums()
      const msg =
        `${ok} imported` + (dupes ? `, ${dupes} duplicates skipped` : '')
      toast.success(msg)
    },
    onError: () => toast.error('Upload failed'),
  })

  const replace = useMutation({
    mutationFn: ({ id, blob }: { id: string; blob: Blob }) =>
      galleryApi.replaceGalleryImage(id, blob),
    onSuccess: () => {
      invalidateLibrary()
      toast.success('Photo updated')
    },
    onError: () => toast.error('Could not save photo'),
  })

  return {
    upload,
    remove,
    toggleFavorite,
    patch,
    aiTag,
    clearAiTags,
    createAlbum,
    deleteAlbum,
    rename,
    rotate,
    bulkRemove,
    bulkFavorite,
    bulkTag,
    bulkUpload,
    replace,
  }
}
