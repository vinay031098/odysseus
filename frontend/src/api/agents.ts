import { api } from './client'
import type {
  AgentSkill,
  BuiltinAgentCapability,
  BuiltinSkillDetail,
  SkillAddPayload,
  SkillAuditStatus,
  SkillTestStatus,
  SkillsIndexEntry,
} from './types'

export function fetchSkills() {
  return api.get<{ skills: AgentSkill[]; count: number }>('/api/skills')
}

export function fetchSkillsIndex() {
  return api.get<{ index: SkillsIndexEntry[]; count: number }>('/api/skills/index')
}

export function fetchBuiltinCapabilities() {
  return api.get<{ builtin: BuiltinAgentCapability[]; count: number }>('/api/skills/builtin')
}

export function fetchSkillMarkdown(skillId: string) {
  return api.get<{ name: string; markdown: string }>(
    `/api/skills/${encodeURIComponent(skillId)}/markdown`,
  )
}

export function fetchSkill(skillId: string) {
  return api.get<AgentSkill>(`/api/skills/${encodeURIComponent(skillId)}`)
}

export function saveSkillMarkdown(skillId: string, markdown: string) {
  return api.post<{ ok: boolean; name: string }>(
    `/api/skills/${encodeURIComponent(skillId)}/markdown`,
    { markdown },
  )
}

export function updateSkillStatus(skillId: string, status: string) {
  return api.put<{ ok: boolean }>(`/api/skills/${encodeURIComponent(skillId)}`, { status })
}

export function deleteSkill(skillId: string) {
  return api.delete<{ ok: boolean }>(`/api/skills/${encodeURIComponent(skillId)}`)
}

export function importSkillFromUrl(url: string) {
  return api.post<{ ok: boolean; skill: AgentSkill; files: number }>('/api/skills/import-from-url', {
    url,
  })
}

export function addSkill(payload: SkillAddPayload) {
  return api.post<{ ok: boolean; skill: AgentSkill; deduped?: boolean }>('/api/skills/add', {
    ...payload,
    status: payload.status ?? 'draft',
  })
}

export function startSkillTest(
  skillId: string,
  opts?: { model?: string; endpoint_url?: string; task?: string },
) {
  return api.post<{ ok: boolean; status: string; skill: string; model: string }>(
    `/api/skills/${encodeURIComponent(skillId)}/test`,
    opts ?? {},
  )
}

export function fetchSkillTestStatus(skillId: string) {
  return api.get<SkillTestStatus>(`/api/skills/${encodeURIComponent(skillId)}/test-status`)
}

export function fetchBuiltinSkill(name: string) {
  return api.get<BuiltinSkillDetail>(`/api/skills/builtin/${encodeURIComponent(name)}`)
}

export function updateBuiltinOverride(name: string, text: string) {
  return api.put<{ ok: boolean; name: string; is_overridden: boolean }>(
    `/api/skills/builtin/${encodeURIComponent(name)}`,
    { text },
  )
}

export function resetBuiltinOverride(name: string) {
  return api.delete<{ ok: boolean; name: string; is_overridden: boolean }>(
    `/api/skills/builtin/${encodeURIComponent(name)}`,
  )
}

export function startSkillAuditAll(opts: {
  scope?: 'all' | 'selected'
  names?: string[]
  skip_audited?: boolean
}) {
  return api.post<{ ok: boolean; status: string; total?: number; model?: string }>(
    '/api/skills/audit-all',
    opts,
  )
}

export function fetchSkillAuditStatus() {
  return api.get<SkillAuditStatus>('/api/skills/audit-all/status')
}

export function cancelSkillAuditAll() {
  return api.post<{ ok: boolean; status: string }>('/api/skills/audit-all/cancel')
}
