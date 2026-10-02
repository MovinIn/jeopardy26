import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ClueModal } from './ClueModal.jsx'
import { GameProvider } from '../context/GameProvider.jsx'
import { gameReducer, initialGameState } from '../context/gameReducer.js'
import { makeValidBoardPayload } from '../test/fixtures.js'

const STORAGE_KEY = 'jeopardy-game-state-v5'

function open({ animated = true, word, categoryIndex = 0, rowIndex = 0 } = {}) {
  const { boardData } = makeValidBoardPayload()
  if (animated) {
    boardData.categories[0].clues[0].animation = 'spellingChaos'
    if (word) {
      boardData.categories[0].clues[0].spellingWord = word
    }
  }
  let state = gameReducer(initialGameState, { type: 'IMPORT_BOARD', boardData })
  state = gameReducer(state, { type: 'SELECT_CLUE', categoryIndex, rowIndex })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  return render(
    <GameProvider>
      <ClueModal />
    </GameProvider>,
  )
}

describe('the spelling animation on a clue', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reduced motion shows the word straight away, so the test needn't wait on animations.
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('plays under the question, with the word and the letter-count choices', () => {
    open({ word: 'Ezekiel' })
    expect(screen.getByTestId('spelling-chaos')).toBeInTheDocument()
    expect(screen.getByText('Ezekiel')).toBeInTheDocument()
    const choices = screen.getByRole('group', { name: 'Letter count choices' })
    expect(choices).toHaveTextContent('5678')
    expect(screen.getByText('Clue 0-200')).toBeInTheDocument()
  })

  it('uses the clue\'s own word', () => {
    open({ word: 'Jeremiah' })
    expect(screen.getByText('Jeremiah')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Letter count choices' })).toHaveTextContent('6789') // 8 letters
  })

  it('falls back to Ezekiel when no word is given', () => {
    open()
    expect(screen.getByText('Ezekiel')).toBeInTheDocument()
  })

  it('lets the team tap a choice', () => {
    open({ word: 'Ezekiel' })
    const seven = screen.getByRole('button', { name: '7' })
    expect(seven).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(seven)
    expect(screen.getByRole('button', { name: '7' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('is not shown on an ordinary clue', () => {
    open({ animated: false })
    expect(screen.queryByTestId('spelling-chaos')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Letter count choices' })).not.toBeInTheDocument()
  })

  it('is not shown on a different clue from the one that has it', () => {
    open({ categoryIndex: 0, rowIndex: 1 })
    expect(screen.queryByTestId('spelling-chaos')).not.toBeInTheDocument()
  })

  it('leaves judging and the answer working alongside it', () => {
    open({ word: 'Ezekiel' })
    expect(screen.getByRole('button', { name: /reveal response/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^correct/i }).length).toBeGreaterThan(0)
  })
})
