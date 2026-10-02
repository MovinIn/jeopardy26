import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { JeopardyBoard } from './JeopardyBoard.jsx'
import { GameProvider } from '../context/GameProvider.jsx'
import { gameReducer, initialGameState } from '../context/gameReducer.js'
import { makeValidBoardPayload } from '../test/fixtures.js'

const STORAGE_KEY = 'jeopardy-game-state-v5'

function seed(resolveFirstClue = false) {
  const { boardData } = makeValidBoardPayload()
  let state = gameReducer(initialGameState, { type: 'IMPORT_BOARD', boardData })
  if (resolveFirstClue) {
    state = gameReducer(state, { type: 'SELECT_CLUE', categoryIndex: 0, rowIndex: 0 })
    state = gameReducer(state, { type: 'ANSWER_CLUE', teamId: state.teams[0].id, correct: true })
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

describe('board background photo', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('sits behind the grid as a decorative layer', () => {
    seed()
    const { container } = render(
      <GameProvider>
        <JeopardyBoard />
      </GameProvider>,
    )
    const wrapper = container.querySelector('.jeopardy-grid-wrapper')
    const photo = wrapper.querySelector('.board-reveal-photo')
    expect(photo).toHaveAttribute('aria-hidden', 'true')
    const image = photo.querySelector('img')
    expect(image.getAttribute('src')).toMatch(/reveal\/board-photo\.png$/)
    expect(image).toHaveAttribute('alt', '')
    // The photo comes first so the grid draws on top of it.
    expect(wrapper.firstElementChild).toBe(photo)
    expect(wrapper.querySelector('.jeopardy-grid')).toBe(screen.getByRole('grid', { name: 'Jeopardy board' }))
  })

  it('keeps every tile inside the grid on top of the photo', () => {
    seed()
    const { container } = render(
      <GameProvider>
        <JeopardyBoard />
      </GameProvider>,
    )
    expect(container.querySelectorAll('.jeopardy-grid .clue-cell')).toHaveLength(30)
    expect(container.querySelectorAll('.jeopardy-grid .category-cell')).toHaveLength(6)
  })

  it('marks a played tile so the photo can show through where it was', () => {
    seed(true)
    const { container } = render(
      <GameProvider>
        <JeopardyBoard />
      </GameProvider>,
    )
    const played = container.querySelectorAll('.clue-cell.resolved')
    expect(played).toHaveLength(1)
    expect(played[0]).toBeDisabled()
    expect(played[0]).toHaveTextContent('')
  })
})
