import { api } from './client'

export interface McpServer {
  id: string
  name: string
  transport: string
  command: string | null
  args: string[]
  env: Record<string, string>
  url: string | null
  is_enabled: boolean
  status: string
  tool_count: number
  disabled_tool_count: number
  enabled_tool_count: number
  error?: string | null
  auth_url?: string | null
  has_oauth: boolean
  needs_oauth: boolean
}

export interface McpServerTool {
  name: string
  server_id: string
  server_name: string
  description?: string
  is_disabled?: boolean
}

export function fetchMcpServers() {
  return api.get<McpServer[]>('/api/mcp/servers')
}

export interface CreateMcpServerInput {
  name: string
  transport: 'stdio' | 'sse' | 'http'
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
}

export function createMcpServer(input: CreateMcpServerInput) {
  const form = new FormData()
  form.append('name', input.name)
  form.append('transport', input.transport)
  if (input.command) form.append('command', input.command)
  if (input.url) form.append('url', input.url)
  form.append('args', JSON.stringify(input.args ?? []))
  form.append('env', JSON.stringify(input.env ?? {}))
  return api.postForm<{ id: string }>('/api/mcp/servers', form)
}

export function toggleMcpServer(id: string, enabled: boolean) {
  const form = new FormData()
  form.append('is_enabled', enabled ? 'true' : 'false')
  return api.patchForm<{ id: string; is_enabled: boolean }>(
    `/api/mcp/servers/${id}`,
    form,
  )
}

export function reconnectMcpServer(id: string) {
  return api.post<{ status?: string; needs_auth?: boolean }>(
    `/api/mcp/servers/${id}/reconnect`,
  )
}

export function deleteMcpServer(id: string) {
  return api.delete<{ status: string }>(`/api/mcp/servers/${id}`)
}

export function fetchMcpServerTools(serverId: string) {
  return api.get<McpServerTool[]>(`/api/mcp/servers/${serverId}/tools`)
}

export function updateMcpDisabledTools(serverId: string, disabled: string[]) {
  return api.patch<{ ok: boolean }>(`/api/mcp/servers/${serverId}/tools`, {
    disabled,
  })
}

export function mcpOAuthAuthorizeUrl(serverId: string) {
  return `/api/mcp/oauth/authorize/${serverId}`
}
