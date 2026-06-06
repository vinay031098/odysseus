import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addPersonalDirectory,
  deletePersonalFile,
  fetchPersonalDocs,
  reloadPersonalIndex,
  removePersonalDirectory,
  uploadPersonalFiles,
} from '@/api/personal'

const KEY = ['personal', 'docs'] as const

export function usePersonalDocs(enabled: boolean) {
  const qc = useQueryClient()

  const list = useQuery({
    queryKey: KEY,
    queryFn: fetchPersonalDocs,
    enabled,
  })

  const invalidate = () => void qc.invalidateQueries({ queryKey: KEY })

  const addDir = useMutation({
    mutationFn: addPersonalDirectory,
    onSuccess: invalidate,
  })

  const removeDir = useMutation({
    mutationFn: removePersonalDirectory,
    onSuccess: invalidate,
  })

  const removeFile = useMutation({
    mutationFn: deletePersonalFile,
    onSuccess: invalidate,
  })

  const reload = useMutation({
    mutationFn: reloadPersonalIndex,
    onSuccess: invalidate,
  })

  const upload = useMutation({
    mutationFn: (files: FileList | File[]) => uploadPersonalFiles(files),
    onSuccess: invalidate,
  })

  return { ...list, addDir, removeDir, removeFile, reload, upload }
}
