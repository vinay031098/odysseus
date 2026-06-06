import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import * as memoryApi from '@/api/memory'

export const memoriesQueryKey = ['memories'] as const

export type MemoryTidyDiff = {
  removed: string[]
  edited: Array<{ id: string; oldText: string; newText: string }>
}

export function useMemories() {
  return useQuery({
    queryKey: memoriesQueryKey,
    queryFn: () => memoryApi.fetchMemories(),
  })
}

export function useMemorySearch() {
  const [query, setQuery] = useState('')
  const trimmed = query.trim()

  const searchQuery = useQuery({
    queryKey: ['memories', 'search', trimmed],
    queryFn: () => memoryApi.searchMemories(trimmed),
    enabled: trimmed.length >= 2,
  })

  return { query, setQuery, searchQuery, isSearching: trimmed.length >= 2 }
}

export function useFilteredMemories(searchResults: ReturnType<typeof useMemorySearch>) {
  const listQuery = useMemories()
  const { isSearching, searchQuery } = searchResults

  const items = useMemo(() => {
    if (isSearching) return searchQuery.data ?? []
    return listQuery.data ?? []
  }, [isSearching, searchQuery.data, listQuery.data])

  const isLoading = isSearching ? searchQuery.isLoading : listQuery.isLoading
  const isError = isSearching ? searchQuery.isError : listQuery.isError

  return { items, isLoading, isError, listQuery }
}

export function useMemoryMutations() {
  const qc = useQueryClient()
  const [tidyDiff, setTidyDiff] = useState<MemoryTidyDiff | null>(null)

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: memoriesQueryKey })
    void qc.invalidateQueries({ queryKey: ['memories', 'search'] })
  }

  const add = useMutation({
    mutationFn: ({ text, category }: { text: string; category?: string }) =>
      memoryApi.addMemory(text, category),
    onSuccess: () => {
      invalidate()
      toast.success('Memory added')
    },
    onError: () => toast.error('Could not add memory'),
  })

  const update = useMutation({
    mutationFn: ({ id, text, category }: { id: string; text: string; category?: string }) =>
      memoryApi.updateMemory(id, text, category),
    onSuccess: () => {
      invalidate()
      toast.success('Memory updated')
    },
    onError: () => toast.error('Could not update memory'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => memoryApi.deleteMemory(id),
    onSuccess: () => {
      invalidate()
      toast.success('Memory deleted')
    },
    onError: () => toast.error('Could not delete memory'),
  })

  const audit = useMutation({
    mutationFn: async () => {
      const before = await memoryApi.fetchMemories()
      const beforeMap = new Map(before.map((m) => [m.id, m]))
      const data = await memoryApi.auditMemories()
      if (data.removed === 0) return { data, diff: null as MemoryTidyDiff | null }

      const after = await memoryApi.fetchMemories()
      const afterMap = new Map(after.map((m) => [m.id, m]))
      const removed: string[] = []
      const edited: MemoryTidyDiff['edited'] = []
      for (const [id, oldMem] of beforeMap) {
        if (!afterMap.has(id)) removed.push(id)
        else if (afterMap.get(id)!.text !== oldMem.text) {
          edited.push({ id, oldText: oldMem.text, newText: afterMap.get(id)!.text })
        }
      }
      return { data, diff: { removed, edited } }
    },
    onSuccess: ({ data, diff }) => {
      invalidate()
      if (diff) setTidyDiff(diff)
      if (data.removed === 0) toast.success('Already clean')
      else toast.success(`Tidied: ${data.removed} removed (${data.before} → ${data.after})`)
    },
    onError: () => toast.error('Memory tidy failed'),
  })

  const importFile = useMutation({
    mutationFn: (file: File) => memoryApi.importMemories(file),
    onError: () => toast.error('Import failed'),
  })

  const extract = useMutation({
    mutationFn: (sessionId: string) => memoryApi.extractMemories(sessionId),
    onError: () => toast.error('Extract failed'),
  })

  const clearTidyDiff = () => setTidyDiff(null)

  return { add, update, remove, audit, importFile, extract, tidyDiff, clearTidyDiff }
}
