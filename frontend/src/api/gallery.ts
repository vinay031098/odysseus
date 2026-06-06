import { api } from './client'

export type GallerySort = 'recent' | 'oldest' | 'shuffle'

export type GalleryImage = {
  id: string
  filename: string
  url: string
  prompt: string | null
  model: string | null
  size: string | null
  quality: string | null
  tags: string
  ai_tags: string
  user_tags: string
  session_id: string | null
  session_name: string | null
  album_id: string | null
  is_active: boolean
  favorite: boolean
  taken_at: string | null
  camera: string | null
  gps: { lat: number; lng: number } | null
  width: number | null
  height: number | null
  file_size: number | null
  created_at: string | null
  updated_at: string | null
}

export type GalleryAlbum = {
  id: string
  name: string
  description: string
  cover_url: string | null
  count: number
  created_at: string | null
}

export type GalleryLibraryResponse = {
  items: GalleryImage[]
  total: number
  total_tagged: number
  tags: string[]
  models: string[]
}

export type GalleryLibraryParams = {
  search?: string
  tag?: string
  model?: string
  album?: string
  favorites?: boolean
  sort?: GallerySort
  seed?: number
  offset?: number
  limit?: number
}

export type GalleryUploadResponse = {
  ok: boolean
  duplicate?: boolean
  filename?: string
  id?: string
  message?: string
  exif_warning?: string
}

export type GalleryPatchPayload = {
  tags?: string
  favorite?: boolean
  album_id?: string | null
}

export type GalleryAiImageResponse = {
  image?: string
  error?: string
}

export type GalleryInpaintPayload = {
  image: string
  mask: string
  prompt?: string
  strength?: number
}

function libraryQuery(params: GalleryLibraryParams = {}): string {
  const qs = new URLSearchParams()
  if (params.search) qs.set('search', params.search)
  if (params.tag) qs.set('tag', params.tag)
  if (params.model) qs.set('model', params.model)
  if (params.album) qs.set('album', params.album)
  if (params.favorites) qs.set('favorites', 'true')
  if (params.sort) qs.set('sort', params.sort)
  if (params.seed != null) qs.set('seed', String(params.seed))
  if (params.offset != null) qs.set('offset', String(params.offset))
  if (params.limit != null) qs.set('limit', String(params.limit))
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export async function fetchGalleryLibrary(
  params: GalleryLibraryParams = {},
): Promise<GalleryLibraryResponse> {
  return api.get<GalleryLibraryResponse>(`/api/gallery/library${libraryQuery(params)}`)
}

export async function fetchGalleryAlbums(): Promise<GalleryAlbum[]> {
  const data = await api.get<{ albums: GalleryAlbum[] }>('/api/gallery/albums')
  return data.albums ?? []
}

export async function createGalleryAlbum(name: string): Promise<{ id: string; name: string }> {
  const data = await api.post<{ ok: boolean; id: string; name: string }>('/api/gallery/albums', {
    name,
  })
  return { id: data.id, name: data.name }
}

export async function deleteGalleryAlbum(id: string): Promise<void> {
  await api.delete(`/api/gallery/albums/${encodeURIComponent(id)}`)
}

export async function fetchGalleryImage(id: string): Promise<GalleryImage> {
  return api.get<GalleryImage>(`/api/gallery/${encodeURIComponent(id)}`)
}

export async function uploadGalleryImage(
  file: File,
  albumId?: string | null,
): Promise<GalleryUploadResponse> {
  const form = new FormData()
  form.append('file', file)
  if (albumId) form.append('album_id', albumId)
  return api.postForm<GalleryUploadResponse>('/api/gallery/upload', form)
}

export async function deleteGalleryImage(id: string): Promise<void> {
  await api.delete(`/api/gallery/${encodeURIComponent(id)}`)
}

export async function patchGalleryImage(
  id: string,
  payload: GalleryPatchPayload,
): Promise<GalleryImage> {
  return api.patch<GalleryImage>(`/api/gallery/${encodeURIComponent(id)}`, payload)
}

export async function toggleGalleryFavorite(id: string): Promise<{ favorite: boolean }> {
  const data = await api.post<{ ok: boolean; favorite: boolean }>(
    `/api/gallery/${encodeURIComponent(id)}/favorite`,
  )
  return { favorite: data.favorite }
}

export async function aiTagGalleryImage(
  id: string,
): Promise<{ ok?: boolean; ai_tags?: string; error?: string }> {
  return api.post(`/api/gallery/${encodeURIComponent(id)}/ai-tag`)
}

export async function clearGalleryAiTags(imageId?: string): Promise<{ cleared: number }> {
  const qs = imageId ? `?image_id=${encodeURIComponent(imageId)}` : ''
  const data = await api.post<{ ok: boolean; cleared: number }>(
    `/api/gallery/clear-ai-tags${qs}`,
  )
  return { cleared: data.cleared }
}

export async function renameGalleryImage(id: string, name: string): Promise<{ ok: boolean; name: string }> {
  return api.post(`/api/gallery/${encodeURIComponent(id)}/rename`, { name })
}

export async function rotateGalleryImage(
  id: string,
  angle: 90 | -90 | 180 | 270,
): Promise<{ ok: boolean; width?: number; height?: number }> {
  return api.post(`/api/gallery/${encodeURIComponent(id)}/rotate`, { angle })
}

export async function replaceGalleryImage(id: string, blob: Blob): Promise<{ ok: boolean }> {
  const form = new FormData()
  form.append('image', blob, 'edited.png')
  return api.postForm(`/api/gallery/${encodeURIComponent(id)}/replace`, form)
}

export async function galleryAiUpscale(blob: Blob, scale = 2): Promise<GalleryAiImageResponse> {
  const form = new FormData()
  form.append('image', blob, 'image.png')
  form.append('scale', String(scale))
  return api.postForm('/api/gallery/ai-upscale', form)
}

export async function galleryStyleTransfer(
  blob: Blob,
  prompt: string,
  strength = 0.55,
): Promise<GalleryAiImageResponse> {
  const form = new FormData()
  form.append('image', blob, 'image.png')
  form.append('prompt', prompt)
  form.append('strength', String(strength))
  return api.postForm('/api/gallery/style-transfer', form)
}

export async function galleryInpaint(payload: GalleryInpaintPayload): Promise<GalleryAiImageResponse> {
  return api.post('/api/image/inpaint', payload)
}

export async function galleryRemoveBackground(
  imageB64: string,
  hintMaskB64?: string,
): Promise<GalleryAiImageResponse> {
  const body: { image: string; hint_mask?: string } = { image: imageB64 }
  if (hintMaskB64) body.hint_mask = hintMaskB64
  return api.post('/api/image/remove-bg', body)
}

export async function downloadGalleryZip(ids: string[]): Promise<Blob> {
  const res = await fetch('/api/gallery/download-zip', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Zip download failed')
  }
  return res.blob()
}
