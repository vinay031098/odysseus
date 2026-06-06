import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModelsTab } from '@/features/settings/ModelsTab'
import { SettingsCard } from '@/features/settings/SettingsCard'
import { useAppSettings } from '@/hooks/useAppSettings'

export function AiTab() {
  const { isAdmin, settings, save, isSaving } = useAppSettings()
  const [agentRounds, setAgentRounds] = useState('20')
  const [agentTools, setAgentTools] = useState('0')
  const [ttsProvider, setTtsProvider] = useState('disabled')

  useEffect(() => {
    if (!settings) return
    setAgentRounds(String(settings.agent_max_rounds ?? 20))
    setAgentTools(String(settings.agent_max_tool_calls ?? 0))
    setTtsProvider(String(settings.tts_provider ?? 'disabled'))
  }, [settings])

  async function saveAgent() {
    if (!isAdmin) return
    try {
      await save({
        agent_max_rounds: Number(agentRounds) || 20,
        agent_max_tool_calls: Number(agentTools) || 0,
        tts_provider: ttsProvider,
        tts_enabled: ttsProvider !== 'disabled',
      })
      toast.success('AI settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  return (
    <div className="space-y-6">
      <ModelsTab />
      <SettingsCard title="Agent limits" description="Control agent loop depth (admin).">
        {isAdmin ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="agent-rounds">Max rounds per message</Label>
              <Input
                id="agent-rounds"
                type="number"
                min={1}
                max={200}
                value={agentRounds}
                onChange={(e) => setAgentRounds(e.target.value)}
                className="mt-1 max-w-xs"
              />
            </div>
            <div>
              <Label htmlFor="agent-tools">Max tool calls (0 = unlimited)</Label>
              <Input
                id="agent-tools"
                type="number"
                min={0}
                value={agentTools}
                onChange={(e) => setAgentTools(e.target.value)}
                className="mt-1 max-w-xs"
              />
            </div>
            <div>
              <Label htmlFor="tts-provider">TTS provider</Label>
              <select
                id="tts-provider"
                value={ttsProvider}
                onChange={(e) => setTtsProvider(e.target.value)}
                className="mt-1 w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="disabled">Disabled</option>
                <option value="openai">OpenAI</option>
                <option value="elevenlabs">ElevenLabs</option>
              </select>
            </div>
            <Button type="button" onClick={() => void saveAgent()} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save agent settings'}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted">Agent and TTS settings require an admin account.</p>
        )}
      </SettingsCard>
    </div>
  )
}
