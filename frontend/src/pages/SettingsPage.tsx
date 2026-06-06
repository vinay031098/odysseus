import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AccountTab } from '@/features/settings/AccountTab'
import { AiTab } from '@/features/settings/AiTab'
import { AppearanceTab } from '@/features/settings/AppearanceTab'
import { ContactsTab } from '@/features/settings/ContactsTab'
import { EmailSettingsTab } from '@/features/settings/EmailSettingsTab'
import { IntegrationsTab } from '@/features/settings/IntegrationsTab'
import { PrivacyTab } from '@/features/settings/PrivacyTab'
import { RemindersTab } from '@/features/settings/RemindersTab'
import { SearchTab } from '@/features/settings/SearchTab'
import { ServicesTab } from '@/features/settings/ServicesTab'
import { ShortcutsTab } from '@/features/settings/ShortcutsTab'
import { SystemTab } from '@/features/settings/SystemTab'
import { ToolsTab } from '@/features/settings/ToolsTab'
import { UsersTab } from '@/features/settings/UsersTab'
import { useAuth } from '@/hooks/useAuth'

const TAB_ALIASES: Record<string, SettingsTab> = {
  models: 'ai',
  advanced: 'system',
}

const PUBLIC_TABS = [
  'services',
  'ai',
  'search',
  'integrations',
  'email',
  'reminders',
  'appearance',
  'shortcuts',
  'account',
  'privacy',
] as const

const ADMIN_TABS = ['contacts', 'tools', 'users', 'system'] as const

type PublicTab = (typeof PUBLIC_TABS)[number]
type AdminTab = (typeof ADMIN_TABS)[number]
export type SettingsTab = PublicTab | AdminTab

function isSettingsTab(value: string | null): value is SettingsTab {
  if (!value) return false
  const resolved = TAB_ALIASES[value] ?? value
  return (
    (PUBLIC_TABS as readonly string[]).includes(resolved) ||
    (ADMIN_TABS as readonly string[]).includes(resolved)
  )
}

function resolveTab(value: string | null): SettingsTab {
  if (!value) return 'account'
  const aliased = TAB_ALIASES[value] ?? value
  return isSettingsTab(aliased) ? aliased : 'account'
}

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const isAdmin = !!user?.is_admin

  const tabParam = searchParams.get('tab')
  const tab = useMemo(() => resolveTab(tabParam), [tabParam])

  const visibleTabs = useMemo(
    () => [...PUBLIC_TABS, ...(isAdmin ? ADMIN_TABS : [])],
    [isAdmin],
  )

  function handleTabChange(value: string) {
    if (!isSettingsTab(value)) return
    setSearchParams(value === 'account' ? {} : { tab: value }, { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h2 className="text-xl font-semibold">Settings</h2>
      <p className="mt-1 text-sm text-muted">
        Services, AI, integrations, email, reminders, and administration.
      </p>

      <Tabs value={tab} onValueChange={handleTabChange} className="mt-6">
        <TabsList className="flex h-auto max-w-full flex-wrap justify-start gap-1 overflow-x-auto">
          {visibleTabs.map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t === 'ai' ? 'AI' : t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="services">
          <ServicesTab />
        </TabsContent>
        <TabsContent value="ai">
          <AiTab />
        </TabsContent>
        <TabsContent value="search">
          <SearchTab />
        </TabsContent>
        <TabsContent value="integrations">
          <IntegrationsTab />
        </TabsContent>
        <TabsContent value="email">
          <EmailSettingsTab />
        </TabsContent>
        <TabsContent value="reminders">
          <RemindersTab />
        </TabsContent>
        <TabsContent value="appearance">
          <AppearanceTab />
        </TabsContent>
        <TabsContent value="shortcuts">
          <ShortcutsTab />
        </TabsContent>
        <TabsContent value="account">
          <AccountTab />
        </TabsContent>
        <TabsContent value="privacy">
          <PrivacyTab />
        </TabsContent>
        {isAdmin && (
          <>
            <TabsContent value="contacts">
              <ContactsTab />
            </TabsContent>
            <TabsContent value="tools">
              <ToolsTab />
            </TabsContent>
            <TabsContent value="users">
              <UsersTab />
            </TabsContent>
            <TabsContent value="system">
              <SystemTab />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
