import { describe, expect, it } from 'vitest'
import {
  BLIND_SLOT_LEFT,
  BLIND_SLOT_RIGHT,
  buildComparisonMarkdown,
  buildMultiPaneComparisonMarkdown,
  isImageModel,
  resolveComparePaneLabels,
} from './compareHelpers'

describe('resolveComparePaneLabels', () => {
  it('hides model names in blind mode', () => {
    const labels = resolveComparePaneLabels(true, {
      model_left: null,
      model_right: null,
    })
    expect(labels).toEqual({ left: BLIND_SLOT_LEFT, right: BLIND_SLOT_RIGHT })
  })

  it('shows model names when not blind', () => {
    const labels = resolveComparePaneLabels(false, {
      model_left: 'gpt-4',
      model_right: 'claude-3',
    })
    expect(labels).toEqual({ left: 'gpt-4', right: 'claude-3' })
  })
})

describe('buildComparisonMarkdown', () => {
  it('marks blind exports and uses pane labels', () => {
    const md = buildComparisonMarkdown({
      prompt: 'Hello world',
      isBlind: true,
      left: { content: 'Left answer', isStreaming: false, done: true, label: BLIND_SLOT_LEFT },
      right: { content: 'Right answer', isStreaming: false, done: true, label: BLIND_SLOT_RIGHT },
      revealed: null,
    })
    expect(md).toContain('(blind)')
    expect(md).toContain('## Model A')
    expect(md).toContain('Left answer')
    expect(md).toContain('## Model B')
    expect(md).not.toContain('gpt-4')
  })

  it('uses revealed names after voting', () => {
    const md = buildComparisonMarkdown({
      prompt: 'Test',
      isBlind: true,
      left: { content: 'A', isStreaming: false, done: true, label: BLIND_SLOT_LEFT },
      right: { content: 'B', isStreaming: false, done: true, label: BLIND_SLOT_RIGHT },
      revealed: { left: 'gpt-4o', right: 'claude-sonnet' },
    })
    expect(md).toContain('## gpt-4o')
    expect(md).toContain('## claude-sonnet')
  })

  it('returns null when there is nothing to export', () => {
    expect(
      buildComparisonMarkdown({
        prompt: '',
        isBlind: false,
        left: { content: '', isStreaming: false, done: false, label: 'A' },
        right: { content: '', isStreaming: false, done: false, label: 'B' },
      }),
    ).toBeNull()
  })

  it('exports three or more panes', () => {
    const md = buildMultiPaneComparisonMarkdown({
      prompt: 'Compare these',
      isBlind: false,
      compareMode: 'agent',
      panes: [
        { label: 'Model A', content: 'One' },
        { label: 'Model B', content: 'Two' },
        { label: 'Model C', content: 'Three' },
      ],
      revealed: null,
    })
    expect(md).toContain('**Type:** agent')
    expect(md).toContain('## Model A')
    expect(md).toContain('## Model C')
    expect(md).toContain('Three')
  })
})

describe('isImageModel', () => {
  it('detects image model prefixes', () => {
    expect(isImageModel('dall-e-3')).toBe(true)
    expect(isImageModel('meta-llama/Llama-3')).toBe(false)
  })
})
