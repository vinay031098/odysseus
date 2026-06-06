import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchAppSettings,
  fetchFeatures,
  saveAppSettings,
  saveFeatures,
  type AppSettings,
  type FeatureFlags,
} from '@/api/appSettings'
import { useAuth } from '@/hooks/useAuth'

export const appSettingsKey = ['app', 'settings'] as const
export const featuresKey = ['app', 'features'] as const

export function useAppSettings() {
  const { user } = useAuth()
  const isAdmin = !!user?.is_admin
  const qc = useQueryClient()

  const settingsQuery = useQuery({
    queryKey: appSettingsKey,
    queryFn: fetchAppSettings,
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (partial: Partial<AppSettings>) => saveAppSettings(partial),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: appSettingsKey })
      void qc.invalidateQueries({ queryKey: ['auth', 'settings'] })
      void qc.invalidateQueries({ queryKey: ['prefs'] })
      void qc.invalidateQueries({ queryKey: ['default-chat'] })
    },
  })

  return {
    isAdmin,
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    save: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  }
}

export function useFeatures() {
  const { user } = useAuth()
  const isAdmin = !!user?.is_admin
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: featuresKey,
    queryFn: fetchFeatures,
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (flags: FeatureFlags) => saveFeatures(flags),
    onSuccess: () => qc.invalidateQueries({ queryKey: featuresKey }),
  })

  return {
    isAdmin,
    features: query.data,
    isLoading: query.isLoading,
    save: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  }
}
