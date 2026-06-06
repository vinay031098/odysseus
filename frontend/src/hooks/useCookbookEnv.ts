import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  execShell,
  saveCookbookState,
  type CookbookEnvState,
  type CookbookServer,
  type CookbookState,
} from '@/api/cookbookServe'
import { cookbookServeKeys } from '@/hooks/useCookbookServe'

export function defaultCookbookServers(servers?: CookbookServer[]): CookbookServer[] {
  if (servers?.length) return servers
  return [{ host: '', name: 'Local', port: '22', env: 'none', modelDirs: ['~/.cache/huggingface/hub'] }]
}

export function useCookbookEnvMutations() {
  const queryClient = useQueryClient()

  const saveEnv = useMutation({
    mutationFn: async (args: { state: CookbookState; env: CookbookEnvState }) => {
      const next: CookbookState = { ...args.state, env: args.env }
      const res = await saveCookbookState(next)
      if (!res.ok) throw new Error(res.error || 'Failed to save cookbook state')
      return next
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cookbookServeKeys.state })
    },
  })

  const testSsh = useMutation({
    mutationFn: async (args: { host: string; port?: string }) => {
      const pf = args.port && args.port !== '22' ? `-p ${args.port} ` : ''
      const cmd = `ssh -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new ${pf}${args.host} "echo ok"`
      const res = await execShell(cmd)
      const out = (res.stdout || '').trim()
      if (res.exit_code === 0 && out.startsWith('ok')) {
        return { ok: true as const, message: 'Connected' }
      }
      const err = (res.stderr || res.stdout || `exit ${res.exit_code}`).toString().trim()
      return { ok: false as const, message: err.slice(0, 240) }
    },
  })

  return { saveEnv, testSsh }
}
