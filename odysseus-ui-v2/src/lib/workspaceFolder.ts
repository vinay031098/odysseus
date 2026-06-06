export const WORKSPACE_STORAGE_KEY = 'odysseus-workspace'
export const WORKSPACE_CHANGE_EVENT = 'odysseus-workspace-change'
export const WORKSPACE_OPEN_EVENT = 'odysseus-workspace-open'

export function getWorkspaceFolder(): string {
  try {
    return localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setWorkspaceFolder(path: string): void {
  try {
    if (path) localStorage.setItem(WORKSPACE_STORAGE_KEY, path)
    else localStorage.removeItem(WORKSPACE_STORAGE_KEY)
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(WORKSPACE_CHANGE_EVENT, { detail: { path } }))
}

export function clearWorkspaceFolder(): void {
  setWorkspaceFolder('')
}

export function openWorkspacePicker(): void {
  window.dispatchEvent(new CustomEvent(WORKSPACE_OPEN_EVENT))
}

export function workspaceBasename(path: string): string {
  if (!path) return ''
  const parts = path.replace(/[\\/]+$/, '').split(/[\\/]/)
  return parts[parts.length - 1] || path
}
