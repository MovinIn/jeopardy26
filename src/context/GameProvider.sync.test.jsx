import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GameProvider, useGame } from './GameProvider.jsx'
import { gameReducer, initialGameState } from './gameReducer.js'
import { boardFingerprint } from '../data/loadBoard.js'
import { validateBoardJson } from '../game/validateBoard.js'
import { makeCategories } from '../test/fixtures.js'

const STORAGE_KEY = 'jeopardy-game-state-v5'

function boardFile(firstCategoryName) {
  const categories = makeCategories()
  categories[0].name = firstCategoryName
  return { title: 'Test Game', categories }
}

/** Saves a game in progress, as if the page had been used before the board file changed. */
function saveGameBuiltFrom(file, { scoreForTeam1 = 0 } = {}) {
  const result = validateBoardJson(file)
  let state = gameReducer(initialGameState, {
    type: 'SYNC_BOARD_FILE',
    boardData: result.data,
    fingerprint: boardFingerprint(result.data),
  })
  state = { ...state, teams: state.teams.map((t, i) => (i === 0 ? { ...t, score: scoreForTeam1 } : t)) }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function serveBoard(file) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => file })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function Probe() {
  const { state, boardLoadError } = useGame()
  return (
    <div>
      <p data-testid="categories">{state.board?.categories.map((c) => c.name).join('|')}</p>
      <p data-testid="score">{state.teams[0].score}</p>
      <p data-testid="error">{boardLoadError ?? ''}</p>
    </div>
  )
}

function setup() {
  return render(
    <GameProvider>
      <Probe />
    </GameProvider>,
  )
}

describe('GameProvider board file sync', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the edited board instead of the old one saved in the browser', async () => {
    saveGameBuiltFrom(boardFile('Gambling'), { scoreForTeam1: 975 })
    serveBoard(boardFile('Live Games'))
    setup()

    // Shows the saved game straight away...
    expect(screen.getByTestId('categories')).toHaveTextContent('Gambling')
    // ...then notices board.json changed and switches to the new board.
    await waitFor(() => expect(screen.getByTestId('categories')).toHaveTextContent('Live Games'))
    expect(screen.getByTestId('categories')).not.toHaveTextContent('Gambling')
    expect(screen.getByTestId('score')).toHaveTextContent('0')
  })

  it('keeps a game in progress when board.json has not changed', async () => {
    saveGameBuiltFrom(boardFile('Live Games'), { scoreForTeam1: 975 })
    const fetchMock = serveBoard(boardFile('Live Games'))
    setup()

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.getByTestId('categories')).toHaveTextContent('Live Games')
    expect(screen.getByTestId('score')).toHaveTextContent('975')
  })

  it('treats a game saved before fingerprints existed as out of date, once', async () => {
    saveGameBuiltFrom(boardFile('Gambling'), { scoreForTeam1: 975 })
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    delete saved.boardFingerprint
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    serveBoard(boardFile('Gambling'))
    setup()

    await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).boardFingerprint).toBeTruthy())
    const afterFirstSync = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(afterFirstSync.boardFingerprint).toBe(
      boardFingerprint(validateBoardJson(boardFile('Gambling')).data),
    )
    // The one-off refresh resets the score; from now on the game is left alone.
    expect(afterFirstSync.teams[0].score).toBe(0)
  })

  it('does not show a load error over a saved game when the file cannot be fetched', async () => {
    saveGameBuiltFrom(boardFile('Gambling'), { scoreForTeam1: 975 })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    setup()

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.getByTestId('error')).toHaveTextContent('')
    expect(screen.getByTestId('categories')).toHaveTextContent('Gambling')
    expect(screen.getByTestId('score')).toHaveTextContent('975')
  })

  it('still reports a load error on a first run with no saved game', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    setup()
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('offline'))
  })
})
