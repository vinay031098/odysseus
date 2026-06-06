import { describe, expect, it } from 'vitest'
import { parseSseDataLine } from '@/lib/sseParser'

describe('parseSseDataLine', () => {
  it('returns done for [DONE]', () => {
    expect(parseSseDataLine('[DONE]')).toEqual({ type: 'done' })
  })

  it('parses delta chunks', () => {
    expect(parseSseDataLine('{"delta":"Hello"}')).toEqual({
      type: 'delta',
      text: 'Hello',
    })
    expect(parseSseDataLine('{"delta":" world"}')).toEqual({
      type: 'delta',
      text: ' world',
    })
  })

  it('returns error for status >= 400', () => {
    expect(parseSseDataLine('{"status":500,"text":"Server error"}')).toEqual({
      type: 'error',
      message: 'Server error',
    })
  })

  it('returns error for error type events', () => {
    expect(parseSseDataLine('{"type":"error","text":"Rate limited"}')).toEqual({
      type: 'error',
      message: 'Rate limited',
    })
  })

  it('returns null for invalid JSON', () => {
    expect(parseSseDataLine('not-json')).toBeNull()
  })

  it('parses tool and source events', () => {
    expect(parseSseDataLine('{"type":"tool_start","name":"bash","label":"Running command…"}')).toEqual({
      type: 'tool_start',
      name: 'bash',
      label: 'Running command…',
    })
    expect(parseSseDataLine('{"type":"web_sources","data":[{"url":"https://example.com","title":"Ex"}]}')).toEqual({
      type: 'web_sources',
      data: [{ url: 'https://example.com', title: 'Ex' }],
    })
  })

  it('parses doc and ask_user events', () => {
    expect(parseSseDataLine('{"type":"doc_stream_open","title":"Draft","language":"markdown"}')).toEqual({
      type: 'doc_stream_open',
      title: 'Draft',
      language: 'markdown',
    })
    expect(parseSseDataLine('{"type":"doc_stream_delta","content":"# Hi"}')).toEqual({
      type: 'doc_stream_delta',
      content: '# Hi',
    })
    expect(parseSseDataLine('{"type":"ask_user","data":{"question":"Pick one","options":[{"label":"A"}]}}')).toEqual({
      type: 'ask_user',
      data: { question: 'Pick one', options: [{ label: 'A' }] },
    })
    expect(parseSseDataLine('{"type":"ui_control","data":{"ui_event":"set_theme","theme_name":"dark"}}')).toEqual({
      type: 'ui_control',
      ui_event: 'set_theme',
      theme_name: 'dark',
    })
  })
})

describe('parseSseDataLine accumulation pattern', () => {
  it('accumulates deltas like legacy chat.js', () => {
    const lines = [
      '{"delta":"The "}',
      '{"delta":"quick "}',
      '{"delta":"brown fox"}',
      '[DONE]',
    ]
    let text = ''
    for (const line of lines) {
      const event = parseSseDataLine(line)
      if (event?.type === 'delta') text += event.text
      if (event?.type === 'done') break
    }
    expect(text).toBe('The quick brown fox')
  })
})
