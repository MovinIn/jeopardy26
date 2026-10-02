import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ClueModal } from './ClueModal.jsx'
import { GameProvider } from '../context/GameProvider.jsx'
import { gameReducer, initialGameState } from '../context/gameReducer.js'
import { TICK_MS } from '../game/snake.js'
import { makeValidBoardPayload } from '../test/fixtures.js'

const STORAGE_KEY = 'jeopardy-game-state-v5'

/** Saves a game whose first clue is the Snake clue, optionally with it already open. */
function seed(selectedClue) {
  const { boardData } = makeValidBoardPayload()
  boardData.categories[0].clues[0].minigame = 'snake'
  let state = gameReducer(initialGameState, { type: 'IMPORT_BOARD', boardData })
  state = gameReducer(state, { type: 'SELECT_CLUE', categoryIndex: 0, rowIndex: 0 })
  if (selectedClue) {
    state = { ...state, selectedClue: { ...state.selectedClue, ...selectedClue } }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function saved() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY))
}

function setup() {
  return render(
    <GameProvider>
      <ClueModal />
    </GameProvider>,
  )
}

async function runTicks(count) {
  await act(async () => {
    vi.advanceTimersByTime(TICK_MS * count)
  })
}

describe('Snake as a clue on the board', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    vi.spyOn(Math, 'random').mockReturnValue(0) // first apple lands in a far corner
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('opens Snake full-screen for the clue value, with the category and value on top', () => {
    seed()
    setup()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAccessibleName('Category 1 for $200')
    expect(screen.getByRole('img', { name: 'Snake board' })).toBeInTheDocument()
    expect(screen.getByText(/collect 10 apples to win \$200/i)).toBeInTheDocument()
    // Not a normal clue: no judging buttons.
    expect(screen.queryByRole('button', { name: /^correct/i })).not.toBeInTheDocument()
  })

  it('lets the host back out until the first key, then locks the exit', () => {
    seed()
    setup()
    expect(screen.getByRole('button', { name: 'Back to board' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.queryByRole('button', { name: 'Back to board' })).not.toBeInTheDocument()
    expect(saved().selectedClue.started).toBe(true)
  })

  it('takes the points and uses up the clue when the snake dies', async () => {
    seed()
    setup()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await runTicks(30)

    expect(screen.getByText('You hit the wall.')).toBeInTheDocument()
    const state = saved()
    expect(state.teams[0].score).toBe(-200)
    expect(state.board.cells[0]).toMatchObject({ resolved: true, result: 'incorrect' })

    fireEvent.click(screen.getByRole('button', { name: 'Back to board' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(saved().selectedClue).toBe(null)
    expect(saved().teams[0].score).toBe(-200)
  })

  it('does not score a second time after the result is dismissed', async () => {
    seed()
    setup()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await runTicks(30)
    fireEvent.click(screen.getByRole('button', { name: 'Back to board' }))
    await runTicks(30)
    expect(saved().teams.map((t) => t.score)).toEqual([-200, 0, 0, 0])
  })

  it('starts a game over, free, if the page is reloaded mid-game (a tab waking up, say)', () => {
    seed({ started: true })
    setup()
    // Back at the start of the same clue, nothing charged, and it can be backed out of again.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/press an arrow key/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to board' })).toBeInTheDocument()
    const state = saved()
    expect(state.teams[0].score).toBe(0)
    expect(state.board.cells[0].resolved).toBe(false)
    expect(state.selectedClue).toMatchObject({ stage: 'minigame', started: false, result: null })
  })

  it('just dismisses a finished game after a reload, without scoring again', () => {
    seed({ started: true, result: 'lost' })
    // The score from that finished game was already saved before the reload.
    const state = saved()
    state.teams[0].score = -200
    state.board.cells[0] = { ...state.board.cells[0], resolved: true, result: 'incorrect' }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))

    setup()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(saved().teams[0].score).toBe(-200)
    expect(saved().selectedClue).toBe(null)
  })

  it('plays for the team in control', async () => {
    seed()
    const state = saved()
    state.activeTeamIndex = 3
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    setup()
    expect(screen.getByText(/Team 4/)).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await runTicks(30)
    expect(saved().teams.map((t) => t.score)).toEqual([0, 0, 0, -200])
  })
})
