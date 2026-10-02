import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ClueModal } from './ClueModal.jsx'
import { GameProvider } from '../context/GameProvider.jsx'
import { gameReducer, initialGameState } from '../context/gameReducer.js'
import { validateBoardJson } from '../game/validateBoard.js'
import { makeCategories, makeValidBoardPayload } from '../test/fixtures.js'

const STORAGE_KEY = 'jeopardy-game-state-v5'
const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY))

function open() {
  const { boardData } = makeValidBoardPayload()
  boardData.categories[0].clues[0].minigame = 'reaction'
  let state = gameReducer(initialGameState, { type: 'IMPORT_BOARD', boardData })
  state = gameReducer(state, { type: 'SELECT_CLUE', categoryIndex: 0, rowIndex: 0 })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  return render(
    <GameProvider>
      <ClueModal />
    </GameProvider>,
  )
}

/** Start a try and press at once, which counts as "too soon": a quick way to fail it. */
function failATry() {
  fireEvent.click(screen.getByRole('button', { name: /^start try/i }))
  fireEvent.keyDown(window, { key: ' ' })
}

describe('the reaction test as a clue on the board', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('is accepted in board data, with no warnings', () => {
    const categories = makeCategories()
    categories[3].clues[4].minigame = 'reaction'
    const result = validateBoardJson({ title: 'T', categories })
    expect(result.ok).toBe(true)
    expect(result.warnings).toEqual([])
    expect(result.data.categories[3].clues[4].minigame).toBe('reaction')
  })

  it('opens full-screen for the clue value, with the "only press when pink" title', () => {
    open()
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Category 1 for $200')
    expect(screen.getByRole('heading', { name: /only press when pink!/i })).toBeInTheDocument()
    expect(screen.getByText(/to win \$200/i)).toBeInTheDocument()
    // Not a normal clue: no judging buttons.
    expect(screen.queryByRole('button', { name: /^correct/i })).not.toBeInTheDocument()
  })

  it('lets the host back out until the first try starts, then locks the exit', () => {
    open()
    expect(screen.getByRole('button', { name: 'Back to board' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Start try 1' }))
    expect(screen.queryByRole('button', { name: 'Back to board' })).not.toBeInTheDocument()
    expect(saved().selectedClue.started).toBe(true)
  })

  it('takes the points and uses the clue up after three failed tries', () => {
    open()
    failATry()
    failATry()
    failATry()

    expect(screen.getByText('Out of tries.')).toBeInTheDocument()
    const state = saved()
    expect(state.teams[0].score).toBe(-200)
    expect(state.board.cells[0]).toMatchObject({ resolved: true, result: 'incorrect' })

    fireEvent.click(screen.getByRole('button', { name: 'Back to board' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(saved().teams[0].score).toBe(-200)
  })

  it('does not take anything while tries remain', () => {
    open()
    failATry()
    failATry()
    expect(saved().teams[0].score).toBe(0)
    expect(screen.getByText('1 try left')).toBeInTheDocument()
  })

  it('starts the test over, free, if the page is reloaded mid-test (a tab waking up, say)', () => {
    const { boardData } = makeValidBoardPayload()
    boardData.categories[0].clues[0].minigame = 'reaction'
    let state = gameReducer(initialGameState, { type: 'IMPORT_BOARD', boardData })
    state = gameReducer(state, { type: 'SELECT_CLUE', categoryIndex: 0, rowIndex: 0 })
    state = gameReducer(state, { type: 'MINIGAME_STARTED' })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))

    render(
      <GameProvider>
        <ClueModal />
      </GameProvider>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start try 1' })).toBeInTheDocument()
    expect(saved().teams[0].score).toBe(0)
    expect(saved().selectedClue).toMatchObject({ started: false, result: null })
  })
})
