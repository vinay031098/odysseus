import { useMemo, useState } from 'react'
import { MemoryDetail } from '@/features/workspace/MemoryDetail'
import { MemoryList } from '@/features/workspace/MemoryList'
import {
  useFilteredMemories,
  useMemoryMutations,
  useMemorySearch,
} from '@/hooks/useMemory'

type ImportSuggestion = { text: string; category: string }

export function MemoryPage() {
  const search = useMemorySearch()
  const { items, isLoading, isError } = useFilteredMemories(search)
  const {
    add,
    update,
    remove,
    audit,
    importFile,
    extract,
    tidyDiff,
    clearTidyDiff,
  } = useMemoryMutations()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [importSuggestions, setImportSuggestions] = useState<ImportSuggestion[]>([])
  const [extractSuggestions, setExtractSuggestions] = useState<string[]>([])

  const selected = useMemo(
    () => items.find((m) => m.id === selectedId) ?? null,
    [items, selectedId],
  )

  const handleImport = (file: File) => {
    importFile.mutate(file, {
      onSuccess: (data) => {
        const suggestions = (data.suggestions ?? [])
          .map((s) =>
            typeof s === 'string'
              ? { text: s, category: 'fact' }
              : { text: s.text, category: s.category || 'fact' },
          )
          .filter((s) => s.text)
        setImportSuggestions(suggestions)
      },
    })
  }

  const handleExtract = (sessionId: string) => {
    extract.mutate(sessionId, {
      onSuccess: (data) => {
        setExtractSuggestions(data.suggestions ?? [])
      },
    })
  }

  if (isLoading && items.length === 0) {
    return <Centered message="Loading memories…" />
  }
  if (isError) {
    return <Centered message="Could not load memories." error />
  }

  return (
    <div className="flex h-full min-h-[480px]">
      <div className="w-full max-w-md shrink-0 border-r border-border">
        <MemoryList
          items={items}
          selectedId={selectedId}
          query={search.query}
          onQueryChange={search.setQuery}
          onSelect={setSelectedId}
          onDelete={(id) => {
            remove.mutate(id)
            if (selectedId === id) setSelectedId(null)
          }}
          onTidy={() => audit.mutate()}
          onImport={handleImport}
          onExtract={handleExtract}
          isTidying={audit.isPending}
          isImporting={importFile.isPending}
          isExtracting={extract.isPending}
          tidyDiff={tidyDiff}
          onClearTidyDiff={clearTidyDiff}
          importSuggestions={importSuggestions}
          extractSuggestions={extractSuggestions}
          onSaveImportSuggestion={(text, category) => {
            add.mutate({ text, category })
            setImportSuggestions((prev) => prev.filter((s) => s.text !== text))
          }}
          onSaveExtractSuggestion={(text) => {
            add.mutate({ text, category: 'fact' })
            setExtractSuggestions((prev) => prev.filter((s) => s !== text))
          }}
          onDismissImport={() => setImportSuggestions([])}
          onDismissExtract={() => setExtractSuggestions([])}
        />
      </div>
      <div className="min-w-0 flex-1">
        <MemoryDetail
          entry={selected}
          onSave={(id, text, category) => update.mutate({ id, text, category })}
          onAdd={(text, category) => {
            add.mutate(
              { text, category },
              { onSuccess: () => setSelectedId(null) },
            )
          }}
          isSaving={add.isPending || update.isPending}
        />
      </div>
    </div>
  )
}

function Centered({ message, error }: { message: string; error?: boolean }) {
  return (
    <div className={`flex h-full items-center justify-center p-6 text-sm ${error ? 'text-destructive' : 'text-muted'}`}>
      {message}
    </div>
  )
}
