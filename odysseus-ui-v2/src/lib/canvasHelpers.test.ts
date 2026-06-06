import { describe, expect, it } from 'vitest'
import {
  CANVAS_MARKER,
  CANVAS_PROJECT_TYPE,
  emptyCanvasProject,
  isCanvasDocument,
  parseCanvasProject,
  serializeCanvasProject,
} from './canvasHelpers'

describe('canvasHelpers', () => {
  it('detects canvas documents by language or marker', () => {
    expect(isCanvasDocument('canvas', '')).toBe(true)
    expect(isCanvasDocument('markdown', `${CANVAS_MARKER}\n{}`)).toBe(true)
    expect(isCanvasDocument('markdown', '# Hello')).toBe(false)
  })

  it('round-trips canvas project serialization', () => {
    const project = emptyCanvasProject(400, 300)
    const content = serializeCanvasProject(project)
    expect(content.startsWith(CANVAS_MARKER)).toBe(true)
    const parsed = parseCanvasProject(content)
    expect(parsed?.type).toBe(CANVAS_PROJECT_TYPE)
    expect(parsed?.imgWidth).toBe(400)
    expect(parsed?.layers).toHaveLength(1)
  })

  it('returns null for invalid canvas JSON', () => {
    expect(parseCanvasProject('not json')).toBeNull()
    expect(parseCanvasProject('{"type":"other"}')).toBeNull()
  })
})
