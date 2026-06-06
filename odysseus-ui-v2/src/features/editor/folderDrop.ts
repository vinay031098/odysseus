import { isMediaFile } from '@/lib/galleryHelpers'

export type UploadItem = { file: File; albumId?: string | null }

type FsEntry = {
  isFile: boolean
  isDirectory: boolean
  name: string
  file: (ok: (f: File) => void, err: () => void) => void
  createReader: () => {
    readEntries: (ok: (e: FsEntry[]) => void, err: () => void) => void
  }
}

async function walkEntryForImages(entry: FsEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise((res) => {
      entry.file(
        (f) => res(isMediaFile(f) ? [f] : []),
        () => res([]),
      )
    })
  }
  if (!entry.isDirectory) return []
  const reader = entry.createReader()
  const out: File[] = []
  while (true) {
    const batch = await new Promise<FsEntry[]>((res) =>
      reader.readEntries(res, () => res([])),
    )
    if (!batch.length) break
    const subs = await Promise.all(batch.map(walkEntryForImages))
    subs.forEach((s) => out.push(...s))
  }
  return out
}

function getEntry(item: DataTransferItem): FsEntry | null {
  const fn = (item as DataTransferItem & { webkitGetAsEntry?: () => unknown }).webkitGetAsEntry
  const entry = fn?.()
  return entry ? (entry as unknown as FsEntry) : null
}

export async function parseFolderDrop(
  dataTransfer: DataTransfer,
  activeAlbumId: string | null,
  findAlbumByName: (name: string) => { id: string } | undefined,
  createAlbum: (name: string) => Promise<{ id: string } | null | undefined>,
): Promise<{ items: UploadItem[]; folderUriOnly: boolean }> {
  const dtItems = [...dataTransfer.items]
  const entries = dtItems.map(getEntry).filter((e): e is FsEntry => !!e)
  const uploadItems: UploadItem[] = []
  let sawFolderEntry = false

  for (const entry of entries) {
    if (entry.isDirectory) {
      sawFolderEntry = true
      const files = await walkEntryForImages(entry)
      if (!files.length) continue
      let album = findAlbumByName(entry.name)
      if (!album) album = (await createAlbum(entry.name)) ?? undefined
      if (!album) continue
      files.forEach((f) => uploadItems.push({ file: f, albumId: album!.id }))
    } else if (entry.isFile) {
      const f = await new Promise<File | null>((res) =>
        entry.file((file) => res(file), () => res(null)),
      )
      if (f && isMediaFile(f)) uploadItems.push({ file: f, albumId: activeAlbumId })
    }
  }

  if (!uploadItems.length) {
    const files = [...dataTransfer.files].filter(isMediaFile)
    files.forEach((f) => uploadItems.push({ file: f, albumId: activeAlbumId }))
  }

  if (uploadItems.length) return { items: uploadItems, folderUriOnly: false }

  const types = [...dataTransfer.types]
  const looksLikeFolderUri =
    !sawFolderEntry &&
    (types.includes('text/uri-list') ||
      types.includes('text/x-moz-url') ||
      dtItems.some((it) => it.kind === 'string'))

  return { items: [], folderUriOnly: looksLikeFolderUri }
}

export function folderNameFromFiles(files: File[]): string {
  const rel = files[0]?.webkitRelativePath ?? ''
  return rel.split('/')[0] || ''
}
