import { describe, expect, it } from 'vitest'
import type { AgentSkill } from '@/api/types'
import {
  computeDuplicateMeta,
  isNonPassingSkill,
  parseSkillApprovalThreshold,
  skillConfidencePercent,
  skillNecessityKind,
} from './skillHelpers'

describe('skillHelpers', () => {
  it('computes confidence percent', () => {
    expect(skillConfidencePercent({ name: 'x', confidence: 0.876 })).toBe(88)
  })

  it('detects necessity kinds', () => {
    const dup: AgentSkill = {
      name: 'a',
      necessity: { necessary: false, reason: 'duplicate of b', redundant_with: ['b'] },
    }
    expect(skillNecessityKind(dup)).toBe('duplicate')
  })

  it('flags non-passing skills', () => {
    const fail: AgentSkill = { name: 'a', audit_verdict: 'fail', confidence: 0.99 }
    expect(isNonPassingSkill(fail, 0.85)).toBe(true)
    const low: AgentSkill = { name: 'b', audit_verdict: 'pass', confidence: 0.5 }
    expect(isNonPassingSkill(low, 0.85)).toBe(true)
    const ok: AgentSkill = { name: 'c', audit_verdict: 'pass', confidence: 0.9 }
    expect(isNonPassingSkill(ok, 0.85)).toBe(false)
  })

  it('parses approval threshold from prefs', () => {
    expect(parseSkillApprovalThreshold({ skill_min_confidence: 0.7 })).toBe(0.7)
    expect(parseSkillApprovalThreshold({})).toBe(0.85)
  })

  it('groups duplicate skills', () => {
    const skills: AgentSkill[] = [
      { name: 'deploy-app', confidence: 0.9, uses: 5, status: 'published' },
      { name: 'deploy-app-2', confidence: 0.5, uses: 1, status: 'draft' },
    ]
    const meta = computeDuplicateMeta(skills)
    expect(meta.get('deploy-app')?.keep).toBe(true)
    expect(meta.get('deploy-app-2')?.keep).toBe(false)
  })
})
