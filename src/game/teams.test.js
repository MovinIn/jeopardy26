import { describe, expect, it } from 'vitest'
import { createDefaultTeams, DEFAULT_TEAM_COUNT } from './teams.js'

describe('createDefaultTeams', () => {
  it('returns four named teams with zero scores when app starts', () => {
    const teams = createDefaultTeams()
    expect(teams).toHaveLength(DEFAULT_TEAM_COUNT)
    expect(teams.map((t) => t.name)).toEqual(['Team 1', 'Team 2', 'Team 3', 'Team 4'])
    expect(teams.every((t) => t.score === 0)).toBe(true)
  })
})
