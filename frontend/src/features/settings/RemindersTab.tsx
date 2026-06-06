import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SettingsCard } from '@/features/settings/SettingsCard'
import { useAppSettings } from '@/hooks/useAppSettings'
import { useIntegrations } from '@/hooks/useIntegrations'
import { REMINDER_CHANNELS } from '@/lib/settings-fields'
import { useAuth } from '@/hooks/useAuth'

export function RemindersTab() {
  const { isAdmin, settings, save, isSaving } = useAppSettings()
  const { user } = useAuth()
  const { data: integrations = [] } = useIntegrations(!!user?.is_admin)
  const [channel, setChannel] = useState('browser')
  const [ntfyTopic, setNtfyTopic] = useState('')
  const [emailTo, setEmailTo] = useState('')
  const [webhookId, setWebhookId] = useState('')
  const [template, setTemplate] = useState('')

  useEffect(() => {
    if (!settings) return
    setChannel(String(settings.reminder_channel ?? 'browser'))
    setNtfyTopic(String(settings.reminder_ntfy_topic ?? ''))
    setEmailTo(String(settings.reminder_email_to ?? ''))
    setWebhookId(String(settings.reminder_webhook_integration_id ?? ''))
    setTemplate(String(settings.reminder_webhook_payload_template ?? ''))
  }, [settings])

  async function handleSave() {
    if (!isAdmin) {
      toast.error('Admin only')
      return
    }
    try {
      await save({
        reminder_channel: channel,
        reminder_ntfy_topic: ntfyTopic,
        reminder_email_to: emailTo,
        reminder_webhook_integration_id: webhookId,
        reminder_webhook_payload_template: template,
      })
      toast.success('Reminder settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  return (
    <SettingsCard title="Reminder delivery" description="How calendar and note reminders reach you.">
      {isAdmin ? (
        <div className="space-y-3">
          <div>
            <Label htmlFor="rem-channel">Channel</Label>
            <select
              id="rem-channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {REMINDER_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {channel === 'ntfy' && (
            <div>
              <Label htmlFor="rem-ntfy">ntfy topic</Label>
              <Input id="rem-ntfy" value={ntfyTopic} onChange={(e) => setNtfyTopic(e.target.value)} className="mt-1" />
            </div>
          )}
          {channel === 'email' && (
            <div>
              <Label htmlFor="rem-email">Email to</Label>
              <Input id="rem-email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} className="mt-1" />
            </div>
          )}
          {channel === 'webhook' && (
            <>
              <div>
                <Label htmlFor="rem-intg">Integration</Label>
                <select
                  id="rem-intg"
                  value={webhookId}
                  onChange={(e) => setWebhookId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select integration</option>
                  {integrations.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="rem-tpl">Payload template (JSON)</Label>
                <textarea
                  id="rem-tpl"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                />
              </div>
            </>
          )}
          <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
            Save reminders
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted">Reminder channel configuration is admin-only.</p>
      )}
    </SettingsCard>
  )
}
