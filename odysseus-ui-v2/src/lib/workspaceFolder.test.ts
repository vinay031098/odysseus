import { describe, expect, it } from 'vitest'
import {
  clearWorkspaceFolder,
  getWorkspaceFolder,
  setWorkspaceFolder,
  workspaceBasename,
  WORKSPACE_STORAGE_KEY,
} from './workspaceFolder'

describe('workspaceFolder', () => {
  it('stores and clears workspace path', () => {
    setWorkspaceFolder('/tmp/project')
    expect(getWorkspaceFolder()).toBe('/tmp/project')
    expect(workspaceBasename('/tmp/project')).toBe('project')
    clearWorkspaceFolder()
    expect(getWorkspaceFolder()).toBe('')
    expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBeNull()
  })
})
