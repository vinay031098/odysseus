import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Search, Upload, CheckSquare } from 'lucide-react'
import { toast } from 'sonner'
import type { GalleryImage, GallerySort } from '@/api/gallery'
import * as galleryApi from '@/api/gallery'
import { fetchEditorDraft } from '@/api/editorDrafts'
import { parseFolderDrop, folderNameFromFiles } from '@/features/editor/folderDrop'
import { BLANK_CANVAS_PRESETS } from '@/features/editor/types'
import { emptyCanvasProject } from '@/lib/canvasHelpers'
import { AlbumSidebar, type AlbumFilter } from '@/features/gallery/AlbumSidebar'
import { EditorDraftsStrip } from '@/features/gallery/EditorDraftsStrip'
import { GalleryBulkBar } from '@/features/gallery/GalleryBulkBar'
import { GalleryEditor } from '@/features/gallery/GalleryEditor'
import { GalleryGrid } from '@/features/gallery/GalleryGrid'
import { ImageDetail } from '@/features/gallery/ImageDetail'
import { TagFilterChips } from '@/features/gallery/TagFilterChips'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useEditorDraftMutations, useEditorDrafts } from '@/hooks/useEditorDrafts'
import { useGalleryAlbums, useGalleryLibrary, useGalleryMutations } from '@/hooks/useGallery'
import { isMediaFile, isVideoUrl } from '@/lib/galleryHelpers'
import {
  applyGalleryManualOrder,
  galleryOrderScope,
  loadGalleryManualOrder,
  saveGalleryManualOrder,
} from '@/lib/galleryManualOrder'

const PAGE_SIZE = 48

export function GalleryPage() {
  const qc = useQueryClient()
  const [albumFilter, setAlbumFilter] = useState<AlbumFilter>('all')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sort, setSort] = useState<GallerySort>('recent')
  const [shuffleSeed] = useState(() => Math.floor(Math.random() * 2 ** 31))
  const [offset, setOffset] = useState(0)
  const [accumulated, setAccumulated] = useState<GalleryImage[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null)
  const [editorDraftState, setEditorDraftState] = useState<{
    imageDataUrl?: string
    maskDataUrl?: string
    draftId?: string
    sourceImageId?: string | null
    blankProject?: ReturnType<typeof emptyCanvasProject>
  } | null>(null)
  const [draftSelectMode, setDraftSelectMode] = useState(false)
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const { data: drafts = [], isLoading: draftsLoading } = useEditorDrafts()
  const draftMutations = useEditorDraftMutations()

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(t)
  }, [search])

  const tagParam = activeTags.length ? activeTags.join(',') : undefined

  const libraryParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      tag: tagParam,
      album: albumFilter !== 'all' && albumFilter !== 'favorites' ? albumFilter : undefined,
      favorites: albumFilter === 'favorites' ? true : undefined,
      sort,
      seed: sort === 'shuffle' ? shuffleSeed : undefined,
      offset,
      limit: PAGE_SIZE,
    }),
    [albumFilter, debouncedSearch, offset, shuffleSeed, sort, tagParam],
  )

  const { data: library, isLoading, isFetching } = useGalleryLibrary(libraryParams)
  const { data: albums = [] } = useGalleryAlbums()
  const mutations = useGalleryMutations()

  useEffect(() => {
    setOffset(0)
    setAccumulated([])
    setSelectedId(null)
    setSelectedIds(new Set())
    setSelectMode(false)
  }, [albumFilter, debouncedSearch, sort, shuffleSeed, tagParam])

  const orderScope = galleryOrderScope(
    albumFilter !== 'all' && albumFilter !== 'favorites' ? albumFilter : undefined,
    sort,
  )

  useEffect(() => {
    if (!library?.items) return
    const applyOrder = (list: GalleryImage[]) =>
      sort === 'recent'
        ? applyGalleryManualOrder(list, loadGalleryManualOrder(orderScope))
        : list
    if (offset === 0) {
      setAccumulated(applyOrder(library.items))
    } else {
      setAccumulated((prev) => {
        const ids = new Set(prev.map((i) => i.id))
        const next = [...prev]
        for (const item of library.items) {
          if (!ids.has(item.id)) next.push(item)
        }
        return applyOrder(next)
      })
    }
  }, [library?.items, offset, orderScope, sort])

  const selected = useMemo(
    () => accumulated.find((i) => i.id === selectedId) ?? null,
    [accumulated, selectedId],
  )

  const total = library?.total ?? 0
  const hasMore = accumulated.length < total
  const availableTags = library?.tags ?? []

  const activeAlbumId =
    albumFilter !== 'all' && albumFilter !== 'favorites' ? albumFilter : null

  const uploadFiles = async (files: File[]) => {
    const media = files.filter(isMediaFile)
    if (!media.length) return
    setUploading(true)
    try {
      for (const file of media) {
        await mutations.upload.mutateAsync({ file, albumId: activeAlbumId })
      }
      if (sort !== 'recent') setSort('recent')
    } finally {
      setUploading(false)
    }
  }

  const handleCreateAlbum = () => {
    const name = window.prompt('Album name')
    if (!name?.trim()) return
    void mutations.createAlbum.mutateAsync(name.trim())
  }

  const handleDeleteAlbum = (id: string) => {
    const album = albums.find((a) => a.id === id)
    if (!window.confirm(`Delete album "${album?.name ?? 'this album'}"? Photos are kept.`)) return
    if (albumFilter === id) setAlbumFilter('all')
    mutations.deleteAlbum.mutate(id)
  }

  const toggleTagFilter = (tag: string) => {
    setActiveTags((prev) => {
      const lower = tag.toLowerCase()
      if (prev.some((t) => t.toLowerCase() === lower)) return prev
      return [...prev, tag]
    })
  }

  const clearTagFilter = (tag: string) => {
    setActiveTags((prev) => prev.filter((t) => t.toLowerCase() !== tag.toLowerCase()))
  }

  const toggleBulkSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  const handleBulkDelete = async () => {
    const ids = [...selectedIds]
    if (!ids.length) return
    if (!window.confirm(`Delete ${ids.length} photo${ids.length > 1 ? 's' : ''}?`)) return
    setBulkBusy(true)
    try {
      await mutations.bulkRemove.mutateAsync(ids)
      setAccumulated((prev) => prev.filter((i) => !ids.includes(i.id)))
      if (selectedId && ids.includes(selectedId)) setSelectedId(null)
      exitSelectMode()
    } finally {
      setBulkBusy(false)
    }
  }

  const handleBulkFavorite = async () => {
    const ids = [...selectedIds]
    if (!ids.length) return
    setBulkBusy(true)
    try {
      await mutations.bulkFavorite.mutateAsync(ids)
      setAccumulated((prev) =>
        prev.map((i) => (ids.includes(i.id) ? { ...i, favorite: true } : i)),
      )
      exitSelectMode()
    } finally {
      setBulkBusy(false)
    }
  }

  const handleBulkTag = async () => {
    const ids = [...selectedIds]
    if (!ids.length) return
    const tag = (window.prompt('Add tag to selected photos:') || '')
      .trim()
      .replace(/^#+/, '')
      .trim()
    if (!tag) return
    setBulkBusy(true)
    try {
      await mutations.bulkTag.mutateAsync({
        ids,
        tag,
        existingTagsFor: (id) => {
          const item = accumulated.find((i) => i.id === id)
          return item?.user_tags || item?.tags || ''
        },
      })
      setAccumulated((prev) =>
        prev.map((i) => {
          if (!ids.includes(i.id)) return i
          const existing = (i.user_tags || i.tags || '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
          if (existing.includes(tag)) return i
          const merged = [...existing, tag].join(', ')
          return { ...i, tags: merged, user_tags: merged }
        }),
      )
      exitSelectMode()
    } finally {
      setBulkBusy(false)
    }
  }

  const handleBulkDownload = async () => {
    const ids = [...selectedIds]
    if (!ids.length) return
    setBulkBusy(true)
    try {
      if (ids.length > 5) {
        const blob = await galleryApi.downloadGalleryZip(ids)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'gallery-photos.zip'
        a.click()
        URL.revokeObjectURL(url)
        toast.success(`Downloaded ${ids.length} photos (zip)`)
      } else {
        for (const id of ids) {
          const item = accumulated.find((i) => i.id === id)
          if (!item) continue
          const a = document.createElement('a')
          a.href = item.url
          a.download = item.filename
          a.click()
          await new Promise((r) => setTimeout(r, 250))
        }
        toast.success(`Downloading ${ids.length} photo${ids.length === 1 ? '' : 's'}`)
      }
      exitSelectMode()
    } catch {
      toast.error('Download failed')
    } finally {
      setBulkBusy(false)
    }
  }

  const openEditor = (image: GalleryImage) => {
    if (isVideoUrl(image.url)) return
    setEditingImage(image)
    setEditorDraftState(null)
  }

  const openBlankCanvas = (w = 1024, h = 1024) => {
    const project = emptyCanvasProject(w, h)
    const stub: GalleryImage = {
      id: '__blank__',
      filename: 'blank-canvas.png',
      url: '',
      prompt: 'Blank canvas',
      model: null,
      size: null,
      quality: null,
      tags: '',
      ai_tags: '',
      user_tags: '',
      session_id: null,
      session_name: null,
      album_id: null,
      is_active: true,
      favorite: false,
      taken_at: null,
      camera: null,
      gps: null,
      width: w,
      height: h,
      file_size: null,
      created_at: null,
      updated_at: null,
    }
    setEditingImage(stub)
    setEditorDraftState({ blankProject: project, sourceImageId: null })
  }

  const handleNewCanvas = () => {
    const presetList = BLANK_CANVAS_PRESETS.map((p, i) => `${i + 1}. ${p.label}`).join('\n')
    const choice = window.prompt(
      `Canvas size (enter 1-${BLANK_CANVAS_PRESETS.length} or custom WxH):\n${presetList}`,
      '1',
    )
    if (!choice) return
    const trimmed = choice.trim()
    const presetIdx = Number(trimmed) - 1
    if (presetIdx >= 0 && presetIdx < BLANK_CANVAS_PRESETS.length) {
      const p = BLANK_CANVAS_PRESETS[presetIdx]
      openBlankCanvas(p.w, p.h)
      return
    }
    const match = trimmed.match(/^(\d+)\s*[x×]\s*(\d+)$/i)
    if (match) {
      openBlankCanvas(Number(match[1]), Number(match[2]))
      return
    }
    openBlankCanvas()
  }

  const handleFolderDrop = async (dt: DataTransfer) => {
    setUploading(true)
    try {
      const { items, folderUriOnly } = await parseFolderDrop(
        dt,
        activeAlbumId,
        (name) => albums.find((a) => a.name === name),
        async (name) => {
          const data = await mutations.createAlbum.mutateAsync(name)
          return { id: data.id }
        },
      )
      if (folderUriOnly) {
        toast.error(
          'Browsers can’t read folders dropped from native file managers. Use “Upload album” in the sidebar instead.',
        )
        return
      }
      if (!items.length) {
        toast.message('No images found in that drop')
        return
      }
      await mutations.bulkUpload.mutateAsync(items)
      if (sort !== 'recent') setSort('recent')
    } finally {
      setUploading(false)
    }
  }

  const handleUploadAlbumFolder = () => {
    folderInputRef.current?.click()
  }

  const handleFolderInputChange = async (files: File[]) => {
    const media = files.filter(isMediaFile)
    if (!media.length) {
      toast.message('No images or videos in that folder')
      return
    }
    let folderName = folderNameFromFiles(media)
    if (!folderName) {
      folderName = window.prompt('Album name for these photos:')?.trim() || ''
      if (!folderName) return
    }
    let album = albums.find((a) => a.name === folderName)
    if (!album) {
      const created = await mutations.createAlbum.mutateAsync(folderName)
      album = { id: created.id, name: created.name, description: '', cover_url: null, count: 0, created_at: null }
    }
    setUploading(true)
    try {
      await mutations.bulkUpload.mutateAsync(
        media.map((file) => ({ file, albumId: album!.id })),
      )
      if (sort !== 'recent') setSort('recent')
    } finally {
      setUploading(false)
    }
  }

  const openDraft = async (draftId: string) => {
    try {
      const draft = await fetchEditorDraft(draftId)
      const source = draft.source_image_id
        ? accumulated.find((i) => i.id === draft.source_image_id)
        : null
      const stub: GalleryImage = source ?? {
        id: draft.source_image_id ?? draft.id,
        filename: `${draft.name}.png`,
        url: draft.payload.imageDataUrl ?? '',
        prompt: draft.name,
        model: null,
        size: null,
        quality: null,
        tags: '',
        ai_tags: '',
        user_tags: '',
        session_id: null,
        session_name: null,
        album_id: null,
        is_active: true,
        favorite: false,
        taken_at: null,
        camera: null,
        gps: null,
        width: draft.width,
        height: draft.height,
        file_size: null,
        created_at: draft.created_at,
        updated_at: draft.updated_at,
      }
      setEditingImage(stub)
      setEditorDraftState({
        imageDataUrl: draft.payload.imageDataUrl as string | undefined,
        maskDataUrl: draft.payload.maskDataUrl as string | undefined,
        draftId: draft.id,
        sourceImageId: draft.source_image_id,
      })
    } catch {
      toast.error('Could not open draft')
    }
  }

  const handleSaveDraft = (payload: {
    imageDataUrl: string
    maskDataUrl: string
    thumbnail: string
    width: number
    height: number
  }) => {
    if (!editingImage) return
    void draftMutations.save.mutateAsync({
      id: editorDraftState?.draftId,
      name: editingImage.prompt ?? editingImage.filename,
      source_image_id: editorDraftState?.sourceImageId ?? editingImage.id,
      width: payload.width,
      height: payload.height,
      payload: {
        imageDataUrl: payload.imageDataUrl,
        maskDataUrl: payload.maskDataUrl,
      },
      thumbnail: payload.thumbnail,
    })
  }

  const deleteSelectedDrafts = async () => {
    const ids = [...selectedDraftIds]
    for (const id of ids) {
      await draftMutations.remove.mutateAsync(id)
    }
    setSelectedDraftIds(new Set())
    setDraftSelectMode(false)
  }

  return (
    <div className="flex h-full min-h-[480px]">
      <div className="w-full max-w-xs shrink-0 border-r border-border">
        <AlbumSidebar
          albums={albums}
          activeFilter={albumFilter}
          totalPhotos={total}
          onFilterChange={setAlbumFilter}
          onCreateAlbum={handleCreateAlbum}
          onDeleteAlbum={handleDeleteAlbum}
          onUploadAlbum={handleUploadAlbumFolder}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative min-w-[180px] flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search photos…"
              className="pl-9"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as GallerySort)}
            className="h-9 rounded-md border border-border bg-panel px-3 text-sm"
            aria-label="Sort order"
          >
            <option value="recent">Recent</option>
            <option value="oldest">Oldest</option>
            <option value="shuffle">Shuffle</option>
          </select>
          <Button
            variant={selectMode ? 'default' : 'secondary'}
            onClick={() => {
              if (selectMode) exitSelectMode()
              else setSelectMode(true)
            }}
            data-testid="gallery-select-btn"
          >
            <CheckSquare className="h-4 w-4" aria-hidden />
            Select
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = [...(e.target.files ?? [])]
              void uploadFiles(files)
              e.target.value = ''
            }}
          />
          <input
            ref={folderInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
            onChange={(e) => {
              const files = [...(e.target.files ?? [])]
              void handleFolderInputChange(files)
              e.target.value = ''
            }}
          />
          <Button
            variant="secondary"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Upload className="h-4 w-4" aria-hidden />
            )}
            Upload
          </Button>
        </div>

        <TagFilterChips
          availableTags={availableTags}
          activeTags={activeTags}
          onToggleTag={toggleTagFilter}
          onClearTag={clearTagFilter}
        />

        <EditorDraftsStrip
          drafts={drafts}
          isLoading={draftsLoading}
          selectMode={draftSelectMode}
          selectedIds={selectedDraftIds}
          onNewCanvas={handleNewCanvas}
          onOpen={(d) => void openDraft(d.id)}
          onToggleSelect={(id) => {
            setSelectedDraftIds((prev) => {
              const next = new Set(prev)
              if (next.has(id)) next.delete(id)
              else next.add(id)
              return next
            })
          }}
          onDeleteSelected={() => void deleteSelectedDrafts()}
          onEnterSelect={() => setDraftSelectMode(true)}
        />

        {selectMode ? (
          <GalleryBulkBar
            count={selectedIds.size}
            total={accumulated.length}
            allSelected={accumulated.length > 0 && selectedIds.size === accumulated.length}
            onToggleAll={(checked) => {
              setSelectedIds(checked ? new Set(accumulated.map((i) => i.id)) : new Set())
            }}
            onFavorite={() => void handleBulkFavorite()}
            onAddTag={() => void handleBulkTag()}
            onDownload={() => void handleBulkDownload()}
            onDelete={() => void handleBulkDelete()}
            onCancel={exitSelectMode}
            busy={bulkBusy}
          />
        ) : null}

        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1">
            <GalleryGrid
              items={accumulated}
              selectedId={selectedId}
              selectMode={selectMode}
              selectedIds={selectedIds}
              isLoading={isLoading || isFetching}
              hasMore={hasMore}
              reorderEnabled={sort === 'recent' && !selectMode}
              onSelect={setSelectedId}
              onToggleSelect={toggleBulkSelect}
              onToggleFavorite={(id) => mutations.toggleFavorite.mutate(id)}
              onReorder={(ids) => {
                saveGalleryManualOrder(orderScope, ids)
                setAccumulated((prev) => applyGalleryManualOrder(prev, ids))
              }}
              onLoadMore={() => setOffset(accumulated.length)}
              onDropFiles={(files) => void uploadFiles(files)}
              onDropDataTransfer={(dt) => void handleFolderDrop(dt)}
            />
          </div>
          {selected && !selectMode ? (
            <div className="w-full max-w-md shrink-0 border-l border-border">
              <ImageDetail
                image={selected}
                isAiTagging={mutations.aiTag.isPending}
                isRotating={mutations.rotate.isPending}
                isRenaming={mutations.rename.isPending}
                onClose={() => setSelectedId(null)}
                onDelete={(id) => {
                  mutations.remove.mutate(id)
                  if (selectedId === id) setSelectedId(null)
                }}
                onToggleFavorite={(id) => mutations.toggleFavorite.mutate(id)}
                onAiTag={(id) => mutations.aiTag.mutate(id)}
                onClearAiTags={(id) => mutations.clearAiTags.mutate(id)}
                onEdit={() => openEditor(selected)}
                onRotate={(id, angle) => mutations.rotate.mutate({ id, angle })}
                onRename={(id, name) => mutations.rename.mutate({ id, name })}
                onTagFilter={(tag) => {
                  toggleTagFilter(tag)
                  setSelectedId(null)
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {editingImage ? (
        <GalleryEditor
          image={editingImage}
          initialImageDataUrl={editorDraftState?.imageDataUrl}
          initialMaskDataUrl={editorDraftState?.maskDataUrl}
          initialProject={editorDraftState?.blankProject}
          onClose={() => {
            setEditingImage(null)
            setEditorDraftState(null)
          }}
          onSaved={() => void qc.invalidateQueries({ queryKey: ['gallery', 'library'] })}
          onSaveDraft={handleSaveDraft}
        />
      ) : null}
    </div>
  )
}
