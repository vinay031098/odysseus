import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CookbookEnvState, CookbookState } from '@/api/cookbookServe'
import { launchCookbookPipTask } from '@/lib/cookbookDepsHelpers'
import type { DiagnosisFix } from '@/lib/cookbookDiagnosis'
import { resolvePipDiagnosisCmd } from '@/lib/cookbookDiagnosis'
import { cookbookServeKeys } from '@/hooks/useCookbookServe'

export function useCookbookPipTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: {
      fix: DiagnosisFix
      state: CookbookState
      env: CookbookEnvState
      remoteHost?: string
      sshPort?: string
      serverEnv?: string
      serverEnvPath?: string
      platform?: string
    }) => {
      const cmd = resolvePipDiagnosisCmd(
        args.fix,
        args.serverEnv || args.env.env,
        args.serverEnvPath || args.env.envPath,
      )
      if (!cmd || !args.fix.pipTaskName) {
        throw new Error('No pip command for this fix')
      }
      const remoteHost = args.remoteHost || ''
      return launchCookbookPipTask({
        taskName: args.fix.pipTaskName,
        cmd,
        state: args.state,
        remoteHost,
        activeServer: {
          port: args.sshPort,
          env: args.serverEnv || args.env.env,
          envPath: args.serverEnvPath || args.env.envPath,
          platform: args.platform || args.env.platform,
        },
        env: args.env,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cookbookServeKeys.state })
      void queryClient.invalidateQueries({ queryKey: cookbookServeKeys.tasks })
    },
  })
}
