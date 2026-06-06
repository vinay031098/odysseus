import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAuthSettings, fetchUserPrefs, saveAuthSettings, setUserPref } from '@/api/settings'
import type { ModelFallbackEntry } from '@/api/types'
import { useAuth } from '@/hooks/useAuth'

export const authSettingsQueryKey = ['auth', 'settings'] as const
export const userPrefsQueryKey = ['prefs'] as const

export function useSettings() {
  const { user } = useAuth()
  const isAdmin = !!user?.is_admin
  const queryClient = useQueryClient()

  const settingsQuery = useQuery({
    queryKey: isAdmin ? authSettingsQueryKey : userPrefsQueryKey,
    queryFn: isAdmin ? fetchAuthSettings : fetchUserPrefs,
    staleTime: 30_000,
  })

  const saveDefaultModelMutation = useMutation({
    mutationFn: async ({
      endpointId,
      model,
    }: {
      endpointId: string
      model: string
    }) => {
      if (isAdmin) {
        return saveAuthSettings({
          default_endpoint_id: endpointId,
          default_model: model,
        })
      }
      await setUserPref('default_endpoint_id', endpointId)
      await setUserPref('default_model', model)
      return { default_endpoint_id: endpointId, default_model: model }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authSettingsQueryKey })
      void queryClient.invalidateQueries({ queryKey: userPrefsQueryKey })
      void queryClient.invalidateQueries({ queryKey: ['default-chat'] })
    },
  })

  const saveFallbacksMutation = useMutation({
    mutationFn: async (fallbacks: ModelFallbackEntry[]) => {
      if (isAdmin) {
        return saveAuthSettings({ default_model_fallbacks: fallbacks })
      }
      await setUserPref('default_model_fallbacks', fallbacks)
      return { default_model_fallbacks: fallbacks }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authSettingsQueryKey })
      void queryClient.invalidateQueries({ queryKey: userPrefsQueryKey })
      void queryClient.invalidateQueries({ queryKey: ['default-chat'] })
    },
  })

  const savedEndpointId =
    (settingsQuery.data?.default_endpoint_id as string | undefined) ?? ''
  const savedModel = (settingsQuery.data?.default_model as string | undefined) ?? ''
  const savedFallbacks = Array.isArray(settingsQuery.data?.default_model_fallbacks)
    ? (settingsQuery.data.default_model_fallbacks as ModelFallbackEntry[])
    : []

  return {
    isAdmin,
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    savedEndpointId,
    savedModel,
    savedFallbacks,
    saveDefaultModel: saveDefaultModelMutation.mutateAsync,
    saveDefaultModelState: saveDefaultModelMutation,
    saveFallbacks: saveFallbacksMutation.mutateAsync,
    saveFallbacksState: saveFallbacksMutation,
  }
}
