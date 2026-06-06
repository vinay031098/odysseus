import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CookbookRecipe } from '@/api/types'

interface CookbookDetailProps {
  recipe: CookbookRecipe | null
  onRunInChat: () => void
}

export function CookbookDetail({ recipe, onRunInChat }: CookbookDetailProps) {
  if (!recipe) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Select a recipe to view its full prompt.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{recipe.name}</h3>
          {recipe.temperature != null && (
            <p className="text-xs text-muted-foreground mt-1">
              Temperature {recipe.temperature}
            </p>
          )}
        </div>
        <Button size="sm" onClick={onRunInChat}>
          <MessageSquare className="mr-2 h-4 w-4" />
          Run in chat
        </Button>
      </div>
      <pre className="mt-4 whitespace-pre-wrap rounded-md bg-panel/50 p-4 text-sm font-sans leading-relaxed">
        {recipe.prompt}
      </pre>
    </div>
  )
}
