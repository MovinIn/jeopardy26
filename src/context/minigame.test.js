import { describe, expect, it } from 'vitest'
import { gameReducer, initialGameState } from './gameReducer.js'
import { makeValidBoardPayload } from '../test/fixtures.js'

function snakeBoardState() {
  const { boardData } = makeValidBoardPayload()
  boardData.categories[0].clues[0].minigame = 'snake' // the $200 clue in the first category
  const state = gameReducer(
    { ...initialGameState, teams: initialGameState.teams },
    { type: 'IMPORT_BOARD', boardData },
  )
  return state
}

function select(state, categoryIndex = 0, rowIndex = 0) {
  return gameReducer(state, { type: 'SELECT_CLUE', categoryIndex, rowIndex })
}

describe('mini game clues', () => {
  it('open the game instead of a normal clue, with no wager', () => {
    const state = select(snakeBoardState())
    expect(state.selectedClue).toMatchObject({
      stage: 'minigame',
      minigame: 'snake',
      started: false,
      result: null,
      wager: null,
    })
  })

  it('leave every other clue alone', () => {
    const state = select(snakeBoardState(), 1, 0)
    expect(state.selectedClue.stage).toBe('clue')
    expect(state.selectedClue.minigame).toBe(null)
  })

  it('can be backed out of until play has begun', () => {
    const opened = select(snakeBoardState())
    expect(gameReducer(opened, { type: 'CLOSE_CLUE' }).selectedClue).toBe(null)

    const started = gameReducer(opened, { type: 'MINIGAME_STARTED' })
    expect(started.selectedClue.started).toBe(true)
    expect(gameReducer(started, { type: 'CLOSE_CLUE' })).toBe(started)
  })

  it('cannot be judged like a normal clue', () => {
    const opened = select(snakeBoardState())
    expect(gameReducer(opened, { type: 'ANSWER_CLUE', teamId: opened.teams[0].id, correct: true })).toBe(opened)
    expect(gameReducer(opened, { type: 'PASS_CLUE' })).toBe(opened)
  })

  it('win the clue value for the team in control and keep it in control', () => {
    let state = select(snakeBoardState())
    state = gameReducer(state, { type: 'SET_ACTIVE_TEAM', index: 2 })
    state = gameReducer(state, { type: 'MINIGAME_STARTED' })
    state = gameReducer(state, { type: 'FINISH_MINIGAME', won: true })

    expect(state.teams.map((t) => t.score)).toEqual([0, 0, 200, 0])
    expect(state.activeTeamIndex).toBe(2)
    expect(state.board.cells[0]).toMatchObject({ resolved: true, result: 'correct' })
    expect(state.selectedClue.result).toBe('won')
  })

  it('lose the clue value when the snake dies, and the clue is used up', () => {
    let state = select(snakeBoardState())
    state = gameReducer(state, { type: 'MINIGAME_STARTED' })
    state = gameReducer(state, { type: 'FINISH_MINIGAME', won: false })

    expect(state.teams.map((t) => t.score)).toEqual([-200, 0, 0, 0])
    expect(state.activeTeamIndex).toBe(0)
    expect(state.board.cells[0]).toMatchObject({ resolved: true, result: 'incorrect' })
    expect(state.selectedClue.result).toBe('lost')
  })

  it('score only once, however many times the result is reported', () => {
    let state = select(snakeBoardState())
    state = gameReducer(state, { type: 'FINISH_MINIGAME', won: false })
    const again = gameReducer(state, { type: 'FINISH_MINIGAME', won: false })
    expect(again).toBe(state)
    expect(gameReducer(state, { type: 'FINISH_MINIGAME', won: true })).toBe(state)
    expect(state.teams[0].score).toBe(-200)
  })

  it('close once the result has been seen', () => {
    let state = select(snakeBoardState())
    state = gameReducer(state, { type: 'FINISH_MINIGAME', won: true })
    expect(gameReducer(state, { type: 'CLOSE_CLUE' }).selectedClue).toBe(null)
  })

  it('ignore a result when no mini game is open', () => {
    const state = snakeBoardState()
    expect(gameReducer(state, { type: 'FINISH_MINIGAME', won: true })).toBe(state)
    const normal = select(state, 1, 0)
    expect(gameReducer(normal, { type: 'FINISH_MINIGAME', won: true })).toBe(normal)
  })

  it('come back on a new game', () => {
    let state = select(snakeBoardState())
    state = gameReducer(state, { type: 'FINISH_MINIGAME', won: false })
    state = gameReducer(state, { type: 'CLOSE_CLUE' })
    state = gameReducer(state, { type: 'RESET_GAME' })
    expect(state.board.cells[0]).toMatchObject({ resolved: false, minigame: 'snake' })
    expect(state.teams.every((t) => t.score === 0)).toBe(true)
  })
})
