export interface WorkspaceBrowseDir {
  name: string
  path: string
}

export interface WorkspaceBrowseResponse {
  path: string
  parent: string | null
  dirs: WorkspaceBrowseDir[]
}

export function browseWorkspace(path?: string) {
  const q = path ? `?path=${encodeURIComponent(path)}` : ''
  return fetch(`/api/workspace/browse${q}`, { credentials: 'include' }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(typeof body.detail === 'string' ? body.detail : 'Browse failed')
    }
    return res.json() as Promise<WorkspaceBrowseResponse>
  })
}
