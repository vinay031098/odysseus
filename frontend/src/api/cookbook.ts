import { api } from './client'
import type { CookbookRecipe, PromptPreset, UserTemplate } from './types'

/** Built-in character templates shipped in the legacy UI. */
export const BUILTIN_RECIPES: CookbookRecipe[] = [
  {
    id: 'builtin-socrates',
    name: 'Socrates',
    source: 'builtin',
    temperature: 0.9,
    prompt:
      'Never answer directly. Respond only with questions — sharp, layered, Socratic. Expose contradictions.',
  },
  {
    id: 'builtin-razor',
    name: 'Razor',
    source: 'builtin',
    temperature: 0.4,
    prompt: 'Strip everything to the bone. Answer in the fewest words possible. Blunt, precise, surgical.',
  },
  {
    id: 'builtin-spark',
    name: 'Spark',
    source: 'builtin',
    temperature: 1.0,
    prompt:
      'Playful, quick-witted assistant with bright energy. Concise, vivid, helpful — warm without being cloying.',
  },
]

export function fetchPresets() {
  return api.get<Record<string, PromptPreset>>('/api/presets')
}

export function fetchUserTemplates() {
  return api.get<UserTemplate[]>('/api/presets/templates')
}

export function presetsToRecipes(presets: Record<string, PromptPreset>): CookbookRecipe[] {
  return Object.entries(presets)
    .filter(([key, p]) => key !== 'custom' && Boolean(p.system_prompt?.trim()))
    .map(([id, p]) => ({
      id: `preset-${id}`,
      name: p.name || id,
      prompt: p.system_prompt ?? '',
      temperature: p.temperature,
      source: 'preset' as const,
    }))
}

export function templatesToRecipes(templates: UserTemplate[]): CookbookRecipe[] {
  return templates
    .filter((t) => Boolean(t.system_prompt?.trim() || t.name))
    .map((t) => ({
      id: t.id,
      name: t.name,
      prompt: t.system_prompt,
      temperature: t.temperature,
      source: 'template' as const,
    }))
}

export async function fetchAllRecipes(): Promise<CookbookRecipe[]> {
  const [presets, templates] = await Promise.all([
    fetchPresets().catch(() => ({})),
    fetchUserTemplates().catch(() => []),
  ])
  const fromPresets = presetsToRecipes(presets)
  const fromTemplates = templatesToRecipes(templates)
  const seen = new Set<string>()
  const merged: CookbookRecipe[] = []

  for (const recipe of [...fromPresets, ...fromTemplates, ...BUILTIN_RECIPES]) {
    const key = recipe.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(recipe)
  }

  return merged.sort((a, b) => a.name.localeCompare(b.name))
}

export const PREFILL_STORAGE_KEY = 'odysseus-prefill-prompt'

export function storePrefillPrompt(prompt: string) {
  sessionStorage.setItem(PREFILL_STORAGE_KEY, prompt)
}

export function saveUserTemplate(template: UserTemplate) {
  return api.post<{ success: boolean; template?: UserTemplate; message?: string }>(
    '/api/presets/templates',
    template,
  )
}

export function deleteUserTemplate(templateId: string) {
  return api.delete<{ success: boolean; message?: string }>(
    `/api/presets/templates/${encodeURIComponent(templateId)}`,
  )
}
