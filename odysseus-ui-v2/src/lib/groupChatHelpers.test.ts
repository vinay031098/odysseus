import { describe, expect, it } from 'vitest'
import {
  buildGroupSystemPrompt,
  formatPeerMessage,
  participantLabel,
  shuffleIndices,
} from './groupChatHelpers'
import type { GroupParticipant } from '@/api/types'

const alice: GroupParticipant = {
  id: 'a',
  modelId: 'llama',
  modelLabel: 'Llama',
  url: 'http://localhost',
  endpointId: 'e1',
}

const bob: GroupParticipant = {
  id: 'b',
  modelId: 'mistral',
  modelLabel: 'Mistral',
  url: 'http://localhost',
  endpointId: 'e1',
  character: { id: 'c1', name: 'Bob', prompt: 'You are Bob the builder.' },
}

describe('groupChatHelpers', () => {
  it('uses character name as label', () => {
    expect(participantLabel(bob)).toBe('Bob')
    expect(participantLabel(alice)).toBe('Llama')
  })

  it('builds system prompt with character voice', () => {
    const prompt = buildGroupSystemPrompt(bob, [alice, bob])
    expect(prompt).toContain('You are Bob the builder.')
    expect(prompt).toContain('Llama')
  })

  it('formats peer sync messages', () => {
    expect(formatPeerMessage('Alice', 'Hello')).toBe('[Alice]: Hello')
  })

  it('shuffleIndices is a permutation', () => {
    const order = shuffleIndices(5)
    expect(order.sort()).toEqual([0, 1, 2, 3, 4])
  })
})
