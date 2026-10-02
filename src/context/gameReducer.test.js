import { describe, expect, it } from 'vitest'
import { gameReducer, initialGameState } from './gameReducer.js'
import { makeValidBoardPayload } from '../test/fixtures.js'

describe('gameReducer RESOLVE_CLUE', () => {
  it('adds win amount and advances team when answer is correct without hint', () => {
    let state = {
      ...initialGameState,
      teams: [
        { id: '1', name: 'Alpha', score: 0 },
        { id: '2', name: 'Beta', score: 0 },
      ],
      activeTeamIndex: 0,
      board: makeValidBoardPayload().board,
      selectedClue: { categoryIndex: 0, rowIndex: 0 },
      activeClueHintUsed: false,
    }

    state = gameReducer(state, { type: 'RESOLVE_CLUE', correct: true })
    expect(state.teams[0].score).toBe(200)
    expect(state.activeTeamIndex).toBe(1)
    expect(state.selectedClue).toBe(null)
  })

  it('subtracts increased loss when incorrect with hint used', () => {
    let state = {
      ...initialGameState,
      teams: [{ id: '1', name: 'Alpha', score: 1000 }],
      activeTeamIndex: 0,
      board: makeValidBoardPayload().board,
      selectedClue: { categoryIndex: 0, rowIndex: 1 },
      activeClueHintUsed: true,
    }

    state = gameReducer(state, { type: 'RESOLVE_CLUE', correct: false })
    expect(state.teams[0].score).toBe(500)
  })
})

describe('gameReducer SET_ACTIVE_TEAM', () => {
  it('sets active team index when host switches manually', () => {
    const state = gameReducer(
      {
        ...initialGameState,
        teams: [{ id: '1', name: 'A' }, { id: '2', name: 'B' }],
        activeTeamIndex: 0,
      },
      { type: 'SET_ACTIVE_TEAM', index: 1 },
    )
    expect(state.activeTeamIndex).toBe(1)
  })
})
