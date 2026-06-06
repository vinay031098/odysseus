import { useQuery } from '@tanstack/react-query'
import { fetchAllRecipes } from '@/api/cookbook'

export function useCookbook() {
  const query = useQuery({
    queryKey: ['cookbook-recipes'],
    queryFn: fetchAllRecipes,
    staleTime: 60_000,
  })

  return {
    recipes: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}
