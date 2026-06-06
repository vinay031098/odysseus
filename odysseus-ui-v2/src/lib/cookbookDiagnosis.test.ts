import { describe, expect, it } from 'vitest'
import { diagnoseOutput, servePatternCount, SERVE_DIAGNOSIS_PATTERNS } from '@/lib/cookbookDiagnosis'

describe('cookbookDiagnosis', () => {
  it('detects gated model errors', () => {
    const entry = diagnoseOutput('403 Forbidden: Access to model meta-llama/Llama is restricted')
    expect(entry?.message).toMatch(/Gated model/)
  })

  it('detects hf_transfer failures', () => {
    const entry = diagnoseOutput('hf_transfer crashed near end of download')
    expect(entry?.fixes.some((f) => f.action === 'retry_no_transfer')).toBe(true)
  })

  it('detects CUDA OOM with serve retry fixes', () => {
    const entry = diagnoseOutput('torch.cuda.OutOfMemoryError: CUDA out of memory')
    expect(entry?.fixes.some((f) => f.action === 'serve_retry_replace')).toBe(true)
  })

  it('has expanded serve pattern set (~35+)', () => {
    expect(servePatternCount()).toBeGreaterThanOrEqual(35)
    expect(SERVE_DIAGNOSIS_PATTERNS.length).toBe(servePatternCount())
  })

  it('offers pip-update fix for kernel mismatch', () => {
    const entry = diagnoseOutput(
      'Either a revision or a version must be specified for kernels/layer',
      SERVE_DIAGNOSIS_PATTERNS,
    )
    expect(entry?.fixes.some((f) => f.action === 'pip_update' && f.pipTaskName === 'repair-kernels')).toBe(
      true,
    )
  })

  it('builds troubleshooting copy bundle', async () => {
    const { buildDiagnosisCopyBundle } = await import('@/lib/cookbookDiagnosis')
    const entry = diagnoseOutput('CUDA out of memory', SERVE_DIAGNOSIS_PATTERNS)!
    const text = buildDiagnosisCopyBundle({
      task: {
        sessionId: 'abc',
        name: 'model',
        type: 'serve',
        status: 'error',
        payload: { repo_id: 'org/model', _cmd: 'vllm serve org/model --port 8000' },
      },
      diagnosis: entry,
      output: 'CUDA out of memory',
    })
    expect(text).toContain('## Odysseus Cookbook troubleshooting')
    expect(text).toContain('org/model')
    expect(text).toContain('CUDA out of memory')
  })
})
