import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ClueModal } from '../components/ClueModal.jsx'
import { FlappyGame } from '../components/FlappyGame.jsx'
import { HostControls } from '../components/HostControls.jsx'
import { JeopardyBoard } from '../components/JeopardyBoard.jsx'
import { SnakeGame } from '../components/SnakeGame.jsx'
import { ShopModal } from '../components/shop/ShopModal.jsx'
import { TeamPanel } from '../components/TeamPanel.jsx'
import { TetrisGame } from '../components/TetrisGame.jsx'
import { TypingGame } from '../components/TypingGame.jsx'
import { GameProvider } from '../context/GameProvider.jsx'
import { gameReducer, initialGameState } from '../context/gameReducer.js'
import { GameMusicProvider } from '../hooks/useGameMusic.jsx'
import { BIRD_X, POLE_W, START_Y, createGame as createFlappy } from '../game/flappy.js'
import { createGame as createSnake, TICK_MS as SNAKE_TICK } from '../game/snake.js'
import {
  COLS,
  ROWS,
  SHRINK_EVERY_MS,
  createGame as createTetris,
  emptyBoard,
} from '../game/tetris.js'
import { PASSAGE, TIME_LIMIT_MS } from '../game/typing.js'
import { makeValidBoardPayload } from '../test/fixtures.js'

// Replace only `play`, so every other export (mute switch, names) stays real.
vi.mock('./sfx.js', async (importOriginal) => ({ ...(await importOriginal()), play: vi.fn() }))
import { play } from './sfx.js'

const STORAGE_KEY = 'jeopardy-game-state-v5'
const names = () => play.mock.calls.map(([name]) => name)
const count = (name) => names().filter((n) => n === name).length

async function run(ms) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

// ------------------------------------------------------------- the board itself

function seedBoard({ select, dailyDouble = false } = {}) {
  const { boardData } = makeValidBoardPayload()
  if (dailyDouble) {
    boardData.categories[0].clues[1].dailyDouble = true
  }
  let state = gameReducer(initialGameState, { type: 'IMPORT_BOARD', boardData })
  if (select) {
    state = gameReducer(state, { type: 'SELECT_CLUE', categoryIndex: select[0], rowIndex: select[1] })
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

describe('sounds on the board', () => {
  beforeEach(() => {
    localStorage.clear()
    play.mockClear()
  })

  it('pops when a tile is picked', async () => {
    seedBoard()
    render(
      <GameProvider>
        <JeopardyBoard />
      </GameProvider>,
    )
    await userEvent.click(screen.getAllByRole('button', { name: '$200' })[0])
    expect(names()).toEqual(['tile'])
  })

  it('dings for a correct answer, buzzes for a wrong one, and has sounds for reveal and pass', async () => {
    seedBoard({ select: [0, 0] })
    render(
      <GameProvider>
        <ClueModal />
      </GameProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: /reveal response/i }))
    await userEvent.click(screen.getAllByRole('button', { name: /^incorrect/i })[0])
    await userEvent.click(screen.getAllByRole('button', { name: /^correct/i })[1])
    expect(names()).toEqual(['reveal', 'wrong', 'correct'])
  })

  it('has a sound for "no one got it"', async () => {
    seedBoard({ select: [0, 0] })
    render(
      <GameProvider>
        <ClueModal />
      </GameProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: /no one got it/i }))
    expect(names()).toEqual(['pass'])
  })

  it('plays the Daily Double fanfare when one is uncovered, and a ticket sound on the wager', async () => {
    seedBoard({ select: [0, 1], dailyDouble: true })
    render(
      <GameProvider>
        <ClueModal />
      </GameProvider>,
    )
    expect(names()).toEqual(['dailyDouble'])
    await userEvent.click(screen.getByRole('button', { name: /lock in wager/i }))
    expect(names()).toEqual(['dailyDouble', 'ticket'])
  })

  it('stays quiet when an ordinary clue opens', () => {
    seedBoard({ select: [0, 0] })
    render(
      <GameProvider>
        <ClueModal />
      </GameProvider>,
    )
    expect(play).not.toHaveBeenCalled()
  })
})

describe('sounds in the side rail', () => {
  beforeEach(() => {
    localStorage.clear()
    play.mockClear()
  })

  it('plays a coin for points added and a descending blip for points taken away', async () => {
    render(
      <GameProvider>
        <TeamPanel />
      </GameProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Add 100 to Team 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Subtract 100 from Team 1' }))
    expect(names()).toEqual(['coin', 'pass'])
  })

  it('switches sound effects off and on, and remembers it', async () => {
    localStorage.removeItem('jeopardy-sfx-prefs-v1')
    render(
      <GameProvider>
        <GameMusicProvider>
          <HostControls />
        </GameMusicProvider>
      </GameProvider>,
    )
    const toggle = screen.getByRole('button', { name: 'Sounds on' })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Sounds off' })).toHaveAttribute('aria-pressed', 'false')
    expect(JSON.parse(localStorage.getItem('jeopardy-sfx-prefs-v1'))).toEqual({ muted: true })

    await userEvent.click(screen.getByRole('button', { name: 'Sounds off' }))
    expect(screen.getByRole('button', { name: 'Sounds on' })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('jeopardy-sfx-prefs-v1'))).toEqual({ muted: false })
  })
})

// ---------------------------------------------------------------- the mini games

describe('sounds in Snake', () => {
  beforeEach(() => {
    play.mockClear()
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] })
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const appleAhead = (score) => () => ({ ...createSnake(() => 0), apple: { x: 5, y: 7 }, score })
  const setup = (props) =>
    render(<SnakeGame team={{ id: 't', name: 'T' }} stake={200} onFinish={() => {}} onExit={() => {}} {...props} />)

  it('is silent until something happens, even if it starts with apples already', () => {
    setup({ makeGame: appleAhead(3) })
    expect(play).not.toHaveBeenCalled()
  })

  it('blips for an apple', async () => {
    setup({ makeGame: appleAhead(3) })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await run(SNAKE_TICK)
    expect(names()).toEqual(['eat'])
  })

  it('crashes and then plays the losing trombone when the snake dies', async () => {
    setup()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await run(SNAKE_TICK * 30)
    expect(names()).toEqual(['crash', 'lose'])
  })

  it('plays the win jingle (and the last apple blip) on the tenth apple', async () => {
    setup({ makeGame: appleAhead(9) })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await run(SNAKE_TICK)
    expect(names()).toEqual(expect.arrayContaining(['eat', 'win']))
    expect(names()).not.toContain('lose')
  })
})

describe('sounds in Flappy Bird', () => {
  beforeEach(() => {
    play.mockClear()
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const setup = (props) =>
    render(<FlappyGame team={{ id: 't', name: 'T' }} stake={400} onFinish={() => {}} onExit={() => {}} {...props} />)
  const aboutToPass = (score) => () => ({
    ...createFlappy(),
    score,
    poles: [{ x: BIRD_X - POLE_W / 2 + 1, y: START_Y, scored: false }],
  })

  it('flaps with each flap', () => {
    setup()
    fireEvent.keyDown(window, { key: ' ' })
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(count('flap')).toBe(2)
  })

  it('dings when a pole is passed', async () => {
    setup({ makeGame: aboutToPass(3) })
    fireEvent.keyDown(window, { key: ' ' })
    await run(100)
    expect(count('point')).toBe(1)
  })

  it('thuds and plays the losing trombone on a crash', async () => {
    setup()
    fireEvent.keyDown(window, { key: ' ' })
    await run(4000)
    expect(names()).toEqual(expect.arrayContaining(['hit', 'lose']))
    expect(count('hit')).toBe(1)
    expect(count('lose')).toBe(1)
  })

  it('plays the win jingle after the fifteenth pole', async () => {
    setup({ makeGame: aboutToPass(14) })
    fireEvent.keyDown(window, { key: ' ' })
    await run(200)
    expect(names()).toEqual(expect.arrayContaining(['point', 'win']))
    expect(names()).not.toContain('hit')
  })
})

describe('sounds in Tetris', () => {
  beforeEach(() => {
    play.mockClear()
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] })
    vi.spyOn(Math, 'random').mockReturnValue(0.3)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const setup = (props) =>
    render(<TetrisGame team={{ id: 't', name: 'T' }} stake={800} onFinish={() => {}} onExit={() => {}} {...props} />)
  const press = (key) => fireEvent.keyDown(window, { key })

  const oneDropFromLine = (lines) => () => {
    const board = emptyBoard()
    board[ROWS - 1] = Array.from({ length: COLS }, (_, x) => (x < 4 ? null : 'Z'))
    return { ...createTetris(() => 0.3), lines, board, piece: { type: 'I', rot: 0, x: 0, y: 0 } }
  }

  it('is silent until the game is played', () => {
    setup()
    expect(play).not.toHaveBeenCalled()
  })

  it('ticks when a piece slides and blips when it turns', () => {
    setup()
    press('ArrowLeft') // starts the game and slides the piece
    press('ArrowUp')
    expect(names()).toEqual(['move', 'rotate'])
  })

  it('thuds when a piece lands', () => {
    setup()
    press(' ') // starts the game and hard-drops the first piece
    expect(names()).toEqual(['lock'])
  })

  it('plays a sparkle for a cleared line, and the win jingle on the fifth', () => {
    setup({ makeGame: oneDropFromLine(4) })
    press(' ')
    expect(play).toHaveBeenCalledWith('lineClear', { lines: 1 })
    expect(names()).toContain('win')
  })

  it('does not play the thud on top of a line-clear sparkle', () => {
    setup({ makeGame: oneDropFromLine(0) })
    press(' ')
    expect(names()).toEqual(['lineClear'])
  })

  it('beeps for the last three seconds, then rumbles as the ceiling drops', async () => {
    setup()
    press('ArrowLeft')
    play.mockClear()
    await run(SHRINK_EVERY_MS - 3500)
    expect(count('warning')).toBe(0)
    await run(3500) // 3, 2, 1, then the ceiling comes down
    expect(count('warning')).toBe(3)
    expect(count('ceiling')).toBe(1)
  })

  it('plays the losing trombone when the stack tops out', () => {
    const topped = () => {
      const board = emptyBoard()
      for (let y = 0; y < 4; y++) {
        board[y] = Array.from({ length: COLS }, (_, x) => (x === 0 ? null : 'Z'))
      }
      return { ...createTetris(() => 0.3), board, piece: { type: 'O', rot: 0, x: 8, y: 10 }, next: 'O' }
    }
    setup({ makeGame: topped })
    press(' ')
    expect(names()).toContain('lose')
    expect(names()).not.toContain('win')
  })
})

describe('sounds in the typing test', () => {
  beforeEach(() => {
    play.mockClear()
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const setup = (props) =>
    render(<TypingGame team={{ id: 't', name: 'T' }} stake={600} onFinish={() => {}} onExit={() => {}} {...props} />)
  const press = (key) => fireEvent.keyDown(window, { key })

  it('clicks for a right letter, buzzes for a wrong one and ticks for backspace', () => {
    setup()
    press('I')
    press('x') // the passage has "n" next
    press('Backspace')
    expect(names()).toEqual(['key', 'typo', 'tick'])
  })

  it('is silent before anyone types', () => {
    setup()
    expect(play).not.toHaveBeenCalled()
  })

  it('plays the losing trombone when time runs out', async () => {
    setup()
    press('I')
    await run(TIME_LIMIT_MS + 500)
    expect(count('lose')).toBe(1)
  })

  it('plays the win jingle after typing the whole passage in time', () => {
    setup()
    for (const ch of PASSAGE) {
      press(ch)
    }
    expect(count('win')).toBe(1)
    expect(count('lose')).toBe(0)
  }, 30000)
})

// --------------------------------------------------------------------- the shop

function seedScores(scores) {
  const teams = scores.map((score, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    score,
    bonusTokens: 0,
    powerups: [],
  }))
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ teams, activeTeamIndex: 0 }))
}

describe('sounds in the shop', () => {
  beforeEach(() => {
    localStorage.clear()
    seedScores([5000, 1000, 0, 0])
    play.mockClear()
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
    })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // userEvent waits on setTimeout, which these tests fake, so click with fireEvent instead.
  const openShop = () => {
    const user = { click: async (element) => fireEvent.click(element) }
    render(
      <GameProvider>
        <ShopModal onClose={() => {}} />
      </GameProvider>,
    )
    return user
  }
  const playGame = (user, index) => user.click(screen.getAllByRole('button', { name: 'Play' })[index])

  it('plays a carnival jingle as the shop opens, a tick for choosing a team, a ticket for Play', async () => {
    const user = openShop()
    expect(names()).toEqual(['shopOpen'])
    await user.click(screen.getByRole('button', { name: /team 2/i }))
    await playGame(user, 0)
    expect(names()).toEqual(['shopOpen', 'tick', 'ticket'])
  })

  it('ticks as the wager is changed', async () => {
    const user = openShop()
    await playGame(user, 0)
    play.mockClear()
    await user.click(screen.getByRole('button', { name: 'Raise wager' }))
    expect(names()).toEqual(['tick'])
  })

  it('flips a card with a sound for each card turned over', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    const user = openShop()
    await playGame(user, 0)
    play.mockClear()
    await user.click(screen.getByRole('button', { name: 'Deal' }))
    await run(2000)
    expect(count('card')).toBeGreaterThanOrEqual(3) // two for you, one of the dealer's
  })

  it('plays a result sound once the dealer has finished', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    const user = openShop()
    await playGame(user, 0)
    await user.click(screen.getByRole('button', { name: 'Deal' }))
    const stand = screen.queryByRole('button', { name: 'Stand' })
    if (stand) {
      await user.click(stand)
    }
    await run(6000)
    expect(names().filter((n) => ['win', 'lose', 'tick'].includes(n)).length).toBeGreaterThan(0)
  })

  it('spins the roulette wheel with a whoosh, clacking ball and a landing, then pays out', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(17.5 / 37)
    const user = openShop()
    await playGame(user, 1)
    await user.click(screen.getByRole('button', { name: 'Number 17' }))
    play.mockClear()
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    expect(names()).toEqual(['spinStart'])

    await run(9000)
    expect(count('ballTick')).toBeGreaterThan(5)
    expect(count('ballLand')).toBe(1)
    expect(names()).toEqual(expect.arrayContaining(['win', 'coin']))
    expect(names()).not.toContain('lose')
  })

  it('plays the losing trombone when the roulette ball misses', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const user = openShop()
    await playGame(user, 1)
    await user.click(screen.getByRole('button', { name: 'Number 17' }))
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    await run(9000)
    expect(count('lose')).toBe(1)
    expect(names()).not.toContain('win')
  })

  it('pulls the slot lever, ratchets while the reels turn, thunks as each stops, and hits the jackpot', async () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.0005).mockReturnValue(0.4) // three sevens
    const user = openShop()
    await playGame(user, 2)
    play.mockClear()
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    expect(names()).toEqual(['leverPull'])

    await run(6000)
    expect(count('reelTick')).toBeGreaterThan(20)
    expect(count('reelStop')).toBe(3)
    expect(count('jackpot')).toBe(1)
  })

  it('plays win and coin for a small slot win, and the trombone for a loss', async () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.2).mockReturnValue(0.4) // two cherries
    const user = openShop()
    await playGame(user, 2)
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    await run(6000)
    expect(names()).toEqual(expect.arrayContaining(['win', 'coin']))
    expect(names()).not.toContain('jackpot')
  })

  it('plays the losing trombone when the reels show no match', async () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.85).mockReturnValue(0.4)
    const user = openShop()
    await playGame(user, 2)
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    await run(6000)
    expect(count('lose')).toBe(1)
  })
})
