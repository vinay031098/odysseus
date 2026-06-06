import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  addSkill,
  cancelSkillAuditAll,
  deleteSkill,
  fetchBuiltinCapabilities,
  fetchBuiltinSkill,
  fetchSkillAuditStatus,
  fetchSkillMarkdown,
  fetchSkillTestStatus,
  fetchSkills,
  fetchSkillsIndex,
  importSkillFromUrl,
  resetBuiltinOverride,
  saveSkillMarkdown,
  startSkillAuditAll,
  startSkillTest,
  updateBuiltinOverride,
  updateSkillStatus,
} from '@/api/agents'
import type { SkillAddPayload } from '@/api/types'

export const agentsQueryKey = ['agents', 'skills'] as const
export const skillsIndexQueryKey = ['agents', 'index'] as const

export function useAgents() {
  return useQuery({
    queryKey: agentsQueryKey,
    queryFn: async () => {
      const [skillsRes, builtinRes] = await Promise.all([
        fetchSkills(),
        fetchBuiltinCapabilities(),
      ])
      return {
        skills: skillsRes.skills ?? [],
        builtin: builtinRes.builtin ?? [],
      }
    },
  })
}

export function useSkillsIndex() {
  return useQuery({
    queryKey: skillsIndexQueryKey,
    queryFn: async () => {
      const res = await fetchSkillsIndex()
      return res.index ?? []
    },
  })
}

export function useAgentMarkdown(skillId: string | null) {
  return useQuery({
    queryKey: ['agents', 'markdown', skillId],
    queryFn: () => fetchSkillMarkdown(skillId!),
    enabled: Boolean(skillId),
  })
}

export function useBuiltinSkill(name: string | null) {
  return useQuery({
    queryKey: ['agents', 'builtin', name],
    queryFn: () => fetchBuiltinSkill(name!),
    enabled: Boolean(name),
  })
}

export function useSkillTestStatus(skillId: string | null, polling = false) {
  return useQuery({
    queryKey: ['agents', 'test', skillId],
    queryFn: () => fetchSkillTestStatus(skillId!),
    enabled: Boolean(skillId),
    refetchInterval: (query) => (polling && query.state.data?.status === 'running' ? 1500 : false),
  })
}

export const skillAuditQueryKey = ['agents', 'audit'] as const

export function useSkillAuditStatus(polling = false) {
  return useQuery({
    queryKey: skillAuditQueryKey,
    queryFn: fetchSkillAuditStatus,
    refetchInterval: (query) =>
      polling && query.state.data?.status === 'running' ? 1500 : false,
  })
}

export function useAgentMutations() {
  const qc = useQueryClient()

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: agentsQueryKey })
    void qc.invalidateQueries({ queryKey: skillsIndexQueryKey })
  }

  const saveMarkdown = useMutation({
    mutationFn: ({ id, markdown }: { id: string; markdown: string }) =>
      saveSkillMarkdown(id, markdown),
    onSuccess: (_, { id }) => {
      invalidate()
      void qc.invalidateQueries({ queryKey: ['agents', 'markdown', id] })
      toast.success('Skill saved')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
  })

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateSkillStatus(id, status),
    onSuccess: () => {
      invalidate()
      toast.success('Skill status updated')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteSkill(id),
    onSuccess: () => {
      invalidate()
      toast.success('Skill deleted')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
  })

  const importUrl = useMutation({
    mutationFn: (url: string) => importSkillFromUrl(url),
    onSuccess: (data) => {
      invalidate()
      const name = data.skill?.name ?? 'skill'
      toast.success(`Imported ${name}`)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Import failed'),
  })

  const create = useMutation({
    mutationFn: (payload: SkillAddPayload) => addSkill(payload),
    onSuccess: () => {
      invalidate()
      toast.success('Skill added (draft)')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not add skill'),
  })

  const runTest = useMutation({
    mutationFn: ({
      id,
      model,
      endpoint_url,
    }: {
      id: string
      model?: string
      endpoint_url?: string
    }) => startSkillTest(id, { model, endpoint_url }),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: ['agents', 'test', id] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Test failed to start'),
  })

  const saveBuiltin = useMutation({
    mutationFn: ({ name, text }: { name: string; text: string }) =>
      updateBuiltinOverride(name, text),
    onSuccess: (_, { name }) => {
      invalidate()
      void qc.invalidateQueries({ queryKey: ['agents', 'builtin', name] })
      toast.success('Built-in capability updated')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
  })

  const revertBuiltin = useMutation({
    mutationFn: (name: string) => resetBuiltinOverride(name),
    onSuccess: (_, name) => {
      invalidate()
      void qc.invalidateQueries({ queryKey: ['agents', 'builtin', name] })
      toast.success('Reverted to default')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Revert failed'),
  })

  const startAudit = useMutation({
    mutationFn: (opts: {
      scope?: 'all' | 'selected'
      names?: string[]
      skip_audited?: boolean
    }) => startSkillAuditAll(opts),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: skillAuditQueryKey })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Audit failed to start'),
  })

  const cancelAudit = useMutation({
    mutationFn: cancelSkillAuditAll,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: skillAuditQueryKey })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Cancel failed'),
  })

  const bulkDelete = useMutation({
    mutationFn: async (names: string[]) => {
      let deleted = 0
      for (const name of names) {
        try {
          await deleteSkill(name)
          deleted++
        } catch {
          /* continue */
        }
      }
      return deleted
    },
    onSuccess: (deleted) => {
      invalidate()
      toast.success(`Deleted ${deleted}`)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
  })

  const bulkPublish = useMutation({
    mutationFn: async (names: string[]) => {
      let published = 0
      for (const name of names) {
        try {
          await updateSkillStatus(name, 'published')
          published++
        } catch {
          /* continue */
        }
      }
      return published
    },
    onSuccess: (published) => {
      invalidate()
      toast.success(`Published ${published}`)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Publish failed'),
  })

  return {
    saveMarkdown,
    setStatus,
    remove,
    importUrl,
    create,
    runTest,
    saveBuiltin,
    revertBuiltin,
    startAudit,
    cancelAudit,
    bulkDelete,
    bulkPublish,
  }
}
