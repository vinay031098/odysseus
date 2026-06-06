import { fetchSkillMarkdown } from '@/api/agents'

/** Resolve skill markdown for slash invocation (published skills only). */
export async function resolveSkillSlashMessage(raw: string): Promise<string | null> {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/')) return null
  const body = trimmed.slice(1)
  const space = body.indexOf(' ')
  const cmd = (space === -1 ? body : body.slice(0, space)).toLowerCase()
  const args = space === -1 ? '' : body.slice(space + 1).trim()
  if (!cmd || cmd === 'help' || cmd === 'skills') return null

  try {
    const { markdown } = await fetchSkillMarkdown(cmd)
    if (!markdown) return null
    return (
      `Apply the skill below to my request, following its Procedure / Pitfalls / Verification.\n\n` +
      `--- BEGIN SKILL ---\n${markdown}\n--- END SKILL ---\n\n` +
      (args ? `Request: ${args}` : 'Request: (use the skill as appropriate)')
    )
  } catch {
    return null
  }
}
