import { describe, expect, it } from 'vitest'
import { gameReducer, initialGameState } from './gameReducer.js'
import { makeValidBoardPayload } from '../test/fixtures.js'

function openMinigame({ started = false } = {}) {
  const { boardData } = makeValidBoardPayload()
  boardData.categories[0].clues[0].minigame = 'snake'
  let state = gameReducer(initialGameState, { type: 'IMPORT_BOARD', boardData })
  state = gameReducer(state, { type: 'SELECT_CLUE', categoryIndex: 0, rowIndex: 0 })
  return started ? gameReducer(state, { type: 'MINIGAME_STARTED' }) : state
}

describe('RESTART_MINIGAME (the page was reloaded mid-game)', () => {
  it('puts a started game back to the start, without charging anyone', () => {
    const state = gameReducer(openMinigame({ started: true }), { type: 'RESTART_MINIGAME' })
    expect(state.selectedClue).toMatchObject({ stage: 'minigame', started: false, result: null })
    expect(state.teams.every((t) => t.score === 0)).toBe(true)
    expect(state.board.cells[0].resolved).toBe(false)
  })

  it('lets the host back out of it again once it is restarted', () => {
    let state = gameReducer(openMinigame({ started: true }), { type: 'RESTART_MINIGAME' })
    state = gameReducer(state, { type: 'CLOSE_CLUE' })
    expect(state.selectedClue).toBe(null)
  })

  it('can be played properly after the restart', () => {
    let state = gameReducer(openMinigame({ started: true }), { type: 'RESTART_MINIGAME' })
    state = gameReducer(state, { type: 'MINIGAME_STARTED' })
    state = gameReducer(state, { type: 'FINISH_MINIGAME', won: true })
    expect(state.teams[0].score).toBe(200)
  })

  it('does nothing for a game that has not started, one that has finished, or an ordinary clue', () => {
    const notStarted = openMinigame()
    expect(gameReducer(notStarted, { type: 'RESTART_MINIGAME' })).toBe(notStarted)

    const finished = gameReducer(openMinigame({ started: true }), { type: 'FINISH_MINIGAME', won: false })
    expect(gameReducer(finished, { type: 'RESTART_MINIGAME' })).toBe(finished)

    const { boardData } = makeValidBoardPayload()
    let ordinary = gameReducer(initialGameState, { type: 'IMPORT_BOARD', boardData })
    ordinary = gameReducer(ordinary, { type: 'SELECT_CLUE', categoryIndex: 0, rowIndex: 0 })
    expect(gameReducer(ordinary, { type: 'RESTART_MINIGAME' })).toBe(ordinary)

    expect(gameReducer(initialGameState, { type: 'RESTART_MINIGAME' })).toBe(initialGameState)
  })
})
