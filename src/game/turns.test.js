import { describe, expect, it } from 'vitest'
import { nextTeamIndex, normalizeTeamIndex } from './turns.js'

describe('nextTeamIndex', () => {
  it('advances to next team when not at end of list', () => {
    expect(nextTeamIndex(3, 0)).toBe(1)
    expect(nextTeamIndex(3, 1)).toBe(2)
  })

  it('wraps to first team after last team', () => {
    expect(nextTeamIndex(3, 2)).toBe(0)
  })

  it('returns 0 when there are no teams', () => {
    expect(nextTeamIndex(0, 0)).toBe(0)
  })
})

describe('normalizeTeamIndex', () => {
  it('returns same index when in range', () => {
    expect(normalizeTeamIndex(3, 1)).toBe(1)
  })

  it('returns 0 when index is out of range and teams exist', () => {
    expect(normalizeTeamIndex(2, 5)).toBe(0)
  })
})
