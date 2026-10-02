import { describe, expect, it } from 'vitest'
import { gameReducer, initialGameState } from './gameReducer.js'
import { makeValidBoardPayload } from '../test/fixtures.js'

const alpha = { id: '1', name: 'Alpha', score: 0 }
const beta = { id: '2', name: 'Beta', score: 0 }

function playableState(overrides = {}) {
  const { boardData } = makeValidBoardPayload()
  let state = {
    ...initialGameState,
    teams: [alpha, beta],
  }
  state = gameReducer(state, { type: 'IMPORT_BOARD', boardData })
  return { ...state, ...overrides }
}

function withoutDailyDoubles(state) {
  return {
    ...state,
    board: {
      ...state.board,
      cells: state.board.cells.map((c) => ({ ...c, dailyDouble: false })),
    },
  }
}

describe('IMPORT_BOARD', () => {
  it('hides exactly one Daily Double in round one, never in the top row', () => {
    const state = playableState()
    const doubles = state.board.cells.filter((c) => c.dailyDouble)
    expect(doubles).toHaveLength(1)
    expect(doubles[0].rowIndex).toBeGreaterThan(0)
  })

  it('keeps Daily Doubles the author flagged', () => {
    const { boardData } = makeValidBoardPayload()
    boardData.categories[2].clues[3].dailyDouble = true
    const state = gameReducer(initialGameState, { type: 'IMPORT_BOARD', boardData })
    const doubles = state.board.cells.filter((c) => c.dailyDouble)
    expect(doubles.map((c) => [c.categoryIndex, c.rowIndex])).toEqual([[2, 3]])
  })
})

describe('ANSWER_CLUE on a regular clue', () => {
  it('awards the value and gives control to whoever answers correctly', () => {
    let state = withoutDailyDoubles(playableState())
    state = gameReducer(state, { type: 'SELECT_CLUE', categoryIndex: 0, rowIndex: 0 })
    state = gameReducer(state, { type: 'ANSWER_CLUE', teamId: '2', correct: true })
    expect(state.teams[1].score).toBe(200)
    expect(state.activeTeamIndex).toBe(1)
    expect(state.selectedClue).toBe(null)
    expect(state.board.cells[0].resolved).toBe(true)
  })

  it('deducts the value, keeps the clue open and locks the team out on a miss', () => {
    let state = withoutDailyDoubles(playableState())
    state = gameReducer(state, { type: 'SELECT_CLUE', categoryIndex: 0, rowIndex: 1 })
    state = gameReducer(state, { type: 'ANSWER_CLUE', teamId: '1', correct: false })
    expect(state.teams[0].score).toBe(-400)
    expect(state.selectedClue.lockedOut).toEqual(['1'])

    state = gameReducer(state, { type: 'ANSWER_CLUE', teamId: '1', correct: true })
    expect(state.teams[0].score).toBe(-400)
  })

  it('closes the clue with control unchanged when every team misses', () => {
    let state = withoutDailyDoubles(playableState())
    state = gameReducer(state, { type: 'SELECT_CLUE', categoryIndex: 0, rowIndex: 0 })
    state = gameReducer(state, { type: 'ANSWER_CLUE', teamId: '1', correct: false })
    state = gameReducer(state, { type: 'ANSWER_CLUE', teamId: '2', correct: false })
    expect(state.selectedClue).toBe(null)
    expect(state.activeTeamIndex).toBe(0)
    expect(state.board.cells[0].result).toBe('none')
    expect(state.teams.map((t) => t.score)).toEqual([-200, -200])
  })

  it('lets the host back out only before anyone is penalised', () => {
    let state = withoutDailyDoubles(playableState())
    state = gameReducer(state, { type: 'SELECT_CLUE', categoryIndex: 0, rowIndex: 0 })
    expect(gameReducer(state, { type: 'CLOSE_CLUE' }).selectedClue).toBe(null)

    state = gameReducer(state, { type: 'ANSWER_CLUE', teamId: '1', correct: false })
    expect(gameReducer(state, { type: 'CLOSE_CLUE' }).selectedClue).not.toBe(null)
  })
})

describe('Daily Double', () => {
  function dailyDoubleState(score) {
    const base = playableState()
    const board = {
      ...base.board,
      cells: base.board.cells.map((c, i) => ({ ...c, dailyDouble: i === 1 })),
    }
    const teams = [{ ...alpha, score }, beta]
    let state = { ...base, board, teams }
    state = gameReducer(state, { type: 'SELECT_CLUE', categoryIndex: 0, rowIndex: 1 })
    return state
  }

  it('asks for a wager first, capped at the top clue value when the score is lower', () => {
    let state = dailyDoubleState(200)
    expect(state.selectedClue.stage).toBe('wager')
    state = gameReducer(state, { type: 'SET_WAGER', amount: 99999 })
    expect(state.selectedClue.wager).toBe(1000)
    expect(state.selectedClue.stage).toBe('clue')
  })

  it('allows wagering the whole score when it is above the top clue value', () => {
    let state = dailyDoubleState(3000)
    state = gameReducer(state, { type: 'SET_WAGER', amount: 3000 })
    expect(state.selectedClue.wager).toBe(3000)
  })

  it('enforces the $5 minimum wager', () => {
    let state = dailyDoubleState(500)
    state = gameReducer(state, { type: 'SET_WAGER', amount: 0 })
    expect(state.selectedClue.wager).toBe(5)
  })

  it('pays the wager and keeps control with the same team on a correct response', () => {
    let state = dailyDoubleState(500)
    state = gameReducer(state, { type: 'SET_WAGER', amount: 300 })
    state = gameReducer(state, { type: 'ANSWER_CLUE', teamId: '1', correct: true })
    expect(state.teams[0].score).toBe(800)
    expect(state.activeTeamIndex).toBe(0)
  })

  it('charges the wager, keeps control and closes the clue on a miss', () => {
    let state = dailyDoubleState(500)
    state = gameReducer(state, { type: 'SET_WAGER', amount: 800 })
    state = gameReducer(state, { type: 'ANSWER_CLUE', teamId: '1', correct: false })
    expect(state.teams[0].score).toBe(-300)
    expect(state.activeTeamIndex).toBe(0)
    expect(state.selectedClue).toBe(null)
  })

  it('ignores answers from teams that are not in control', () => {
    let state = dailyDoubleState(500)
    state = gameReducer(state, { type: 'SET_WAGER', amount: 300 })
    const after = gameReducer(state, { type: 'ANSWER_CLUE', teamId: '2', correct: true })
    expect(after).toBe(state)
  })
})

describe('round progression', () => {
  function finishRound(state) {
    return {
      ...state,
      board: {
        ...state.board,
        cells: state.board.cells.map((c) => ({ ...c, resolved: true })),
      },
    }
  }

  it('does not advance while clues remain', () => {
    const state = playableState()
    expect(gameReducer(state, { type: 'ADVANCE_ROUND' })).toBe(state)
  })

  it('moves to Double Jeopardy with the lowest-scoring team in control', () => {
    let state = finishRound(playableState())
    state = { ...state, teams: [{ ...alpha, score: 1200 }, { ...beta, score: 200 }] }
    state = gameReducer(state, { type: 'ADVANCE_ROUND' })
    expect(state.round).toBe('double')
    expect(state.board.cells.every((c) => !c.resolved)).toBe(true)
    expect(state.board.cells.filter((c) => c.dailyDouble)).toHaveLength(2)
    expect(state.activeTeamIndex).toBe(1)
  })

  it('goes to Final Jeopardy after Double Jeopardy', () => {
    let state = finishRound(playableState())
    state = gameReducer(state, { type: 'ADVANCE_ROUND' })
    state = {
      ...finishRound(state),
      teams: [{ ...alpha, score: 1000 }, { ...beta, score: 0 }],
    }
    state = gameReducer(state, { type: 'ADVANCE_ROUND' })
    expect(state.phase).toBe('final-wager')
  })
})

describe('Final Jeopardy', () => {
  function finalState() {
    return {
      ...playableState(),
      phase: 'final-wager',
      teams: [
        { id: '1', name: 'Alpha', score: 1000 },
        { id: '2', name: 'Beta', score: 400 },
        { id: '3', name: 'Gamma', score: -200 },
      ],
    }
  }

  it('caps wagers at the score and bars non-positive scores from playing', () => {
    let state = finalState()
    state = gameReducer(state, { type: 'SET_FINAL_WAGER', teamId: '1', amount: 5000 })
    state = gameReducer(state, { type: 'SET_FINAL_WAGER', teamId: '3', amount: 100 })
    expect(state.finalWagers).toEqual({ 1: 1000 })
  })

  it('settles wagers and ends the game once every finalist is judged', () => {
    let state = finalState()
    state = gameReducer(state, { type: 'SET_FINAL_WAGER', teamId: '1', amount: 600 })
    state = gameReducer(state, { type: 'SET_FINAL_WAGER', teamId: '2', amount: 400 })
    state = gameReducer(state, { type: 'START_FINAL_CLUE' })
    state = gameReducer(state, { type: 'REVEAL_FINAL' })
    state = gameReducer(state, { type: 'JUDGE_FINAL', teamId: '1', correct: true })
    expect(state.phase).toBe('final-clue')
    state = gameReducer(state, { type: 'JUDGE_FINAL', teamId: '2', correct: false })
    expect(state.teams.map((t) => t.score)).toEqual([1600, 0, -200])
    expect(state.phase).toBe('over')
  })

  it('does not judge before the response is revealed', () => {
    let state = finalState()
    state = gameReducer(state, { type: 'START_FINAL_CLUE' })
    const after = gameReducer(state, { type: 'JUDGE_FINAL', teamId: '1', correct: true })
    expect(after).toBe(state)
  })
})

describe('SET_ACTIVE_TEAM', () => {
  it('lets the host hand control to another team', () => {
    const state = gameReducer(playableState(), { type: 'SET_ACTIVE_TEAM', index: 1 })
    expect(state.activeTeamIndex).toBe(1)
  })
})

describe('COMMIT_BONUS_ROUND', () => {
  it('adds banked tokens and powerup to the active team', () => {
    let state = playableState()
    state = {
      ...state,
      teams: state.teams.map((t, i) =>
        i === 0
          ? { ...t, bonusTokens: 2, powerups: [] }
          : { ...t, bonusTokens: 0, powerups: [] },
      ),
      activeTeamIndex: 0,
    }
    state = gameReducer(state, {
      type: 'COMMIT_BONUS_ROUND',
      baseTokens: 3,
      multiplier: 4,
      powerup: { id: 'double-next', label: 'Double next' },
    })
    expect(state.teams[0].bonusTokens).toBe(14)
    expect(state.teams[0].powerups).toEqual([{ id: 'double-next', label: 'Double next' }])
    expect(state.teams[1].bonusTokens).toBe(0)
  })

  it('ignores commit when there are no teams', () => {
    const state = { ...initialGameState, teams: [] }
    const after = gameReducer(state, {
      type: 'COMMIT_BONUS_ROUND',
      baseTokens: 5,
      multiplier: 2,
      powerup: { id: 'x', label: 'X' },
    })
    expect(after).toBe(state)
  })
})

describe('RESET_GAME', () => {
  it('zeroes scores and restores every clue', () => {
    let state = withoutDailyDoubles(playableState())
    state = gameReducer(state, { type: 'SELECT_CLUE', categoryIndex: 0, rowIndex: 0 })
    state = gameReducer(state, { type: 'ANSWER_CLUE', teamId: '2', correct: true })
    state = gameReducer(state, { type: 'RESET_GAME' })
    expect(state.teams.map((t) => t.score)).toEqual([0, 0])
    expect(state.board.cells.every((c) => !c.resolved)).toBe(true)
    expect(state.round).toBe('jeopardy')
  })
})

describe('shop', () => {
  it('charges the team in control when they buy an item', () => {
    let state = playableState()
    state = { ...state, teams: [{ ...state.teams[0], score: 500 }, ...state.teams.slice(1)] }
    state = gameReducer(state, { type: 'BUY_SHOP_ITEM', itemId: 'blackjack' })
    expect(state.teams[0].score).toBe(400)
  })

  it('refuses a purchase the team cannot afford', () => {
    const state = playableState()
    expect(gameReducer(state, { type: 'BUY_SHOP_ITEM', itemId: 'blackjack' })).toBe(state)
  })

  it('applies a mini game payout to the named team', () => {
    const state = gameReducer(playableState(), { type: 'ADJUST_SCORE', teamId: '2', delta: -200 })
    expect(state.teams.find((t) => t.id === '2').score).toBe(-200)
  })
})
