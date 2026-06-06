import { Link } from 'react-router-dom'
import { Settings, Server } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function OnboardingWizard() {
  return (
    <div className="max-w-md space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Server className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold">Connect a model to start chatting</h2>
      <p className="text-sm text-muted-foreground">
        Odysseus needs at least one LLM endpoint. Add Ollama locally at{' '}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
          http://localhost:11434/v1
        </code>{' '}
        or configure another provider in Settings.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild variant="default">
          <Link to="/settings?tab=models">
            <Settings className="mr-2 h-4 w-4" />
            Open Settings
          </Link>
        </Button>
      </div>
    </div>
  )
}
