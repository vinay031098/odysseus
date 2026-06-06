import type { ModelOption } from '@/api/types'
import { isImageModel } from './compareHelpers'

export const POOL_STORAGE_KEY = 'odysseus-shuffle-pool-excluded'

export function getExcludedModels(): string[] {
  try {
    const raw = localStorage.getItem(POOL_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function setExcludedModels(ids: string[]): void {
  try {
    localStorage.setItem(POOL_STORAGE_KEY, JSON.stringify(ids))
  } catch {
    /* ignore quota */
  }
}

export function setModelExcluded(modelId: string, included: boolean): void {
  const excluded = getExcludedModels()
  const idx = excluded.indexOf(modelId)
  if (included && idx >= 0) excluded.splice(idx, 1)
  else if (!included && idx < 0) excluded.push(modelId)
  setExcludedModels(excluded)
}

/** Fisher–Yates shuffle in place. */
function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Pick `count` unique models from pool, respecting shuffle-pool exclusions. */
export function pickShuffleModels(pool: ModelOption[], count: number): ModelOption[] {
  const excluded = new Set(getExcludedModels())
  const eligible = pool.filter((m) => !excluded.has(m.id) && !m.offline)
  if (!eligible.length) return []
  const shuffled = shuffleInPlace([...eligible])
  const picked: ModelOption[] = []
  const seen = new Set<string>()
  for (const m of shuffled) {
    const key = `${m.endpointId}:${m.id}`
    if (seen.has(key)) continue
    seen.add(key)
    picked.push(m)
    if (picked.length >= count) break
  }
  if (picked.length < count) {
    for (const m of shuffled) {
      const key = `${m.endpointId}:${m.id}`
      if (seen.has(key)) continue
      seen.add(key)
      picked.push(m)
      if (picked.length >= count) break
    }
  }
  return picked
}

export function groupModelsForPool(models: ModelOption[]): {
  chat: ModelOption[]
  image: ModelOption[]
} {
  const chat: ModelOption[] = []
  const image: ModelOption[] = []
  for (const m of models) {
    if (isImageModel(m.id)) image.push(m)
    else chat.push(m)
  }
  return { chat, image }
}
