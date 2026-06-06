import { describe, expect, it, vi } from 'vitest'
import { isRunnableLanguage, isServerShellLanguage, runCodeBlock, runHtmlCode } from './codeRunner'

vi.mock('@/api/cookbookServe', () => ({
  execShell: vi.fn(async () => ({ stdout: 'server ok', stderr: '', exit_code: 0 })),
}))

describe('codeRunner', () => {
  it('detects runnable languages', () => {
    expect(isRunnableLanguage('python')).toBe(true)
    expect(isRunnableLanguage('bash')).toBe(true)
    expect(isRunnableLanguage('rust')).toBe(false)
  })

  it('detects server-shell languages', () => {
    expect(isServerShellLanguage('python')).toBe(true)
    expect(isServerShellLanguage('bash')).toBe(true)
    expect(isServerShellLanguage('javascript')).toBe(false)
  })

  it('runHtmlCode reports popup blocked when window.open fails', () => {
    const original = window.open
    window.open = () => null
    expect(runHtmlCode('<p>hi</p>')).toContain('Popup blocked')
    window.open = original
  })

  it('falls back to server shell when Pyodide is unavailable', async () => {
    window.loadPyodide = vi.fn().mockRejectedValue(new Error('Pyodide unavailable'))
    const result = await runCodeBlock('print("hi")', 'python')
    expect(result.viaServer).toBe(true)
    expect(result.output).toContain('Pyodide unavailable')
    expect(result.output).toContain('server ok')
    delete window.loadPyodide
  })
})
