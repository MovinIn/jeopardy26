import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ClueModal } from './ClueModal.jsx'
import { GameProvider } from '../context/GameProvider.jsx'
import { gameReducer, initialGameState } from '../context/gameReducer.js'
import { makeValidBoardPayload } from '../test/fixtures.js'

const STORAGE_KEY = 'jeopardy-game-state-v5'

function open({ image, categoryIndex = 0, rowIndex = 0 } = {}) {
  const { boardData } = makeValidBoardPayload()
  if (image !== undefined) {
    boardData.categories[0].clues[0].image = image
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

describe('clue pictures', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the picture above the clue text', () => {
    open({ image: '/clues/math-400-sack-balls.svg' })
    const image = screen.getByRole('img', { name: 'Diagram for this clue' })
    expect(image).toHaveAttribute('src', '/clues/math-400-sack-balls.svg')

    const text = screen.getByText('Clue 0-200')
    // The picture comes first in the clue body, so it sits above the words.
    expect(image.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('finds a picture given without a leading slash', () => {
    open({ image: 'clues/diagram.png' })
    expect(screen.getByRole('img', { name: 'Diagram for this clue' })).toHaveAttribute('src', '/clues/diagram.png')
  })

  it('shows no picture for a clue that has none', () => {
    open()
    expect(screen.queryByRole('img', { name: 'Diagram for this clue' })).not.toBeInTheDocument()
    expect(screen.getByText('Clue 0-200')).toBeInTheDocument()
  })

  it('shows no picture on a different clue from the one that has it', () => {
    open({ image: '/clues/diagram.png', categoryIndex: 0, rowIndex: 1 })
    expect(screen.queryByRole('img', { name: 'Diagram for this clue' })).not.toBeInTheDocument()
  })

  it('keeps the judging buttons and answer working alongside the picture', () => {
    open({ image: '/clues/diagram.png' })
    expect(screen.getByRole('button', { name: /reveal response/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^correct/i }).length).toBeGreaterThan(0)
  })
})
