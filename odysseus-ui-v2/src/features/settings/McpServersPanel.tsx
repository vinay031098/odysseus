import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { mcpOAuthAuthorizeUrl } from '@/api/mcp'
import { useMcpServerTools, useMcpServers } from '@/hooks/useMcpServers'

export function McpServersPanel() {
  const { data: servers = [], isLoading, create, toggle, reconnect, remove } =
    useMcpServers(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [transport, setTransport] = useState<'stdio' | 'sse' | 'http'>('stdio')
  const [command, setCommand] = useState('')
  const [url, setUrl] = useState('')

  const toolsQuery = useMcpServerTools(expandedId, !!expandedId)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    try {
      await create.mutateAsync({
        name: name.trim(),
        transport,
        command: transport === 'stdio' ? command.trim() : undefined,
        url: transport !== 'stdio' ? url.trim() : undefined,
      })
      toast.success('MCP server added')
      setShowForm(false)
      setName('')
      setCommand('')
      setUrl('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add server')
    }
  }

  async function toggleTool(toolName: string, currentlyDisabled: boolean) {
    if (!expandedId || !toolsQuery.data) return
    const disabled = new Set(
      toolsQuery.data.filter((t) => t.is_disabled).map((t) => t.name),
    )
    if (currentlyDisabled) disabled.delete(toolName)
    else disabled.add(toolName)
    try {
      await toolsQuery.updateTools.mutateAsync({
        id: expandedId,
        disabled: [...disabled],
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update tools')
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted">Loading MCP servers…</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">MCP servers</h3>
          <p className="text-xs text-muted mt-1">
            Connect Model Context Protocol tools for agents and chat.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Add server'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="rounded-lg border border-border bg-panel p-4 space-y-3"
        >
          <div>
            <Label htmlFor="mcp-name">Name</Label>
            <Input
              id="mcp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="filesystem"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="mcp-transport">Transport</Label>
            <select
              id="mcp-transport"
              value={transport}
              onChange={(e) =>
                setTransport(e.target.value as 'stdio' | 'sse' | 'http')
              }
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="stdio">stdio (local command)</option>
              <option value="sse">SSE (remote URL)</option>
              <option value="http">HTTP (remote URL)</option>
            </select>
          </div>
          {transport === 'stdio' ? (
            <div>
              <Label htmlFor="mcp-command">Command</Label>
              <Input
                id="mcp-command"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="npx -y @modelcontextprotocol/server-filesystem /path"
                className="mt-1"
              />
            </div>
          ) : (
            <div>
              <Label htmlFor="mcp-url">URL</Label>
              <Input
                id="mcp-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://127.0.0.1:3000/sse"
                className="mt-1"
              />
            </div>
          )}
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Adding…' : 'Add server'}
          </Button>
        </form>
      )}

      {servers.length === 0 ? (
        <p className="text-sm text-muted rounded-lg border border-dashed border-border p-4">
          No MCP servers configured.
        </p>
      ) : (
        <ul className="space-y-2">
          {servers.map((srv) => (
            <li
              key={srv.id}
              className="rounded-lg border border-border bg-panel p-3 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{srv.name}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {srv.transport} · {srv.status} · {srv.enabled_tool_count}/
                    {srv.tool_count} tools
                  </div>
                  {srv.error && (
                    <div className="text-xs text-destructive mt-1">{srv.error}</div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {srv.needs_oauth && (
                    <a
                      href={mcpOAuthAuthorizeUrl(srv.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground"
                    >
                      Authorize
                    </a>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void reconnect.mutateAsync(srv.id).then(() =>
                        toast.success('Reconnect attempted'),
                      )
                    }
                  >
                    Reconnect
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void toggle
                        .mutateAsync({ id: srv.id, enabled: !srv.is_enabled })
                        .then(() => toast.success(srv.is_enabled ? 'Disabled' : 'Enabled'))
                    }
                  >
                    {srv.is_enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setExpandedId(expandedId === srv.id ? null : srv.id)
                    }
                  >
                    Tools
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (!confirm(`Delete MCP server "${srv.name}"?`)) return
                      void remove.mutateAsync(srv.id).then(() => toast.success('Deleted'))
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              {expandedId === srv.id && (
                <div className="mt-3 border-t border-border pt-3">
                  {toolsQuery.isLoading ? (
                    <p className="text-xs text-muted">Loading tools…</p>
                  ) : toolsQuery.data?.length ? (
                    <ul className="space-y-1 max-h-48 overflow-y-auto">
                      {toolsQuery.data.map((t) => (
                        <li key={t.name} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!t.is_disabled}
                            onChange={() =>
                              void toggleTool(t.name, !!t.is_disabled)
                            }
                            aria-label={`Enable ${t.name}`}
                          />
                          <span className={t.is_disabled ? 'text-muted line-through' : ''}>
                            {t.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted">No tools discovered.</p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
