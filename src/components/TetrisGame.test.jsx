import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COLS, ROWS, SHRINK_EVERY_MS, createGame, emptyBoard, gravityMs } from '../game/tetris.js'
import { TetrisGame } from './TetrisGame.jsx'

const team = { id: 'team-1', name: 'Team 1' }

function setup(props = {}) {
  const handlers = { onStart: vi.fn(), onFinish: vi.fn(), onExit: vi.fn() }
  const view = render(<TetrisGame team={team} stake={800} {...handlers} {...props} />)
  return { ...handlers, ...view }
}

const press = (key) => fireEvent.keyDown(window, { key })

async function run(ms) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

/** One flat I piece away from clearing a line, with `lines` already cleared. */
function oneDropFromLine(lines) {
  return () => {
    const board = emptyBoard()
    board[ROWS - 1] = Array.from({ length: COLS }, (_, x) => (x < 4 ? null : 'Z'))
    return { ...createGame(() => 0.3), lines, board, piece: { type: 'I', rot: 0, x: 0, y: 0 } }
  }
}

/** The stack is up to the spawn area: the next piece cannot appear after this one lands. */
function aboutToTopOut() {
  const board = emptyBoard()
  for (let y = 0; y < 4; y++) {
    board[y] = Array.from({ length: COLS }, (_, x) => (x === 0 ? null : 'Z'))
  }
  return { ...createGame(() => 0.3), board, piece: { type: 'O', rot: 0, x: 8, y: 10 }, next: 'O' }
}

describe('TetrisGame', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] })
    vi.spyOn(Math, 'random').mockReturnValue(0.3)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('waits for the first key and shows the goal, the stake, the line counter and the next piece', () => {
    setup()
    expect(screen.getByText(/press any arrow key/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Lines cleared')).toHaveTextContent('0 / 5')
    expect(screen.getByText(/clear 5 lines to win \$800/i)).toBeInTheDocument()
    expect(screen.getByText(/lose \$800/i)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^Next piece: [IOTSZJL]$/ })).toBeInTheDocument()
  })

  it('uses the stake it is given', () => {
    setup({ stake: 500 })
    expect(screen.getByText(/clear 5 lines to win \$500/i)).toBeInTheDocument()
  })

  it('starts on the first control key or on-screen button, and says so once', () => {
    for (const start of [
      () => press('ArrowLeft'),
      () => press('ArrowUp'),
      () => press(' '),
      () => press('z'),
      () => fireEvent.click(screen.getByRole('button', { name: 'Rotate' })),
    ]) {
      const { unmount, onStart } = setup()
      start()
      expect(screen.queryByText(/press any arrow key/i)).not.toBeInTheDocument()
      expect(onStart).toHaveBeenCalledTimes(1)
      unmount()
    }
  })

  it('ignores keys that are not controls', () => {
    const { onStart } = setup()
    press('Enter')
    press('q')
    expect(onStart).not.toHaveBeenCalled()
    expect(screen.getByText(/press any arrow key/i)).toBeInTheDocument()
  })

  it('stops the page scrolling when the arrow keys and space are used', () => {
    setup()
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ']) {
      // fireEvent returns false when the default action was cancelled.
      expect(press(key)).toBe(false)
    }
  })

  it('wins on the fifth line, once', async () => {
    const { onFinish } = setup({ makeGame: oneDropFromLine(4) })
    press(' ') // start and drop the I piece into the gap
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onFinish).toHaveBeenCalledWith(true)
    expect(screen.getByText('You cleared 5 lines!')).toBeInTheDocument()
    expect(screen.getByText('Lines: 5 / 5')).toBeInTheDocument()
    expect(screen.getByText('+$800')).toBeInTheDocument()
    await run(5000)
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('counts lines as they are cleared', () => {
    setup({ makeGame: oneDropFromLine(1) })
    press(' ')
    expect(screen.getByLabelText('Lines cleared')).toHaveTextContent('2 / 5')
  })

  it('loses when the stack reaches the top', () => {
    const { onFinish } = setup({ makeGame: aboutToTopOut })
    press(' ')
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onFinish).toHaveBeenCalledWith(false)
    expect(screen.getByText('The stack reached the top.')).toBeInTheDocument()
    expect(screen.getByText('−$800')).toBeInTheDocument()
  })

  it('loses on its own if the pieces are left to fall', async () => {
    const { onFinish } = setup()
    press('ArrowLeft') // start, then never touch it again
    await run(gravityMs(0) * 25 * 40)
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onFinish).toHaveBeenCalledWith(false)
    expect(screen.getByText(/the stack reached the top|the ceiling crushed your stack/i)).toBeInTheDocument()
  })

  it('stops responding once the game is over', async () => {
    const { onFinish } = setup({ makeGame: aboutToTopOut })
    press(' ')
    press('ArrowLeft')
    press(' ')
    await run(5000)
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('group', { name: 'Controls' })).not.toBeInTheDocument()
  })

  it('leaves scoring to the parent: nothing is reported if it is unmounted mid-game', async () => {
    const { onFinish, unmount } = setup()
    press('ArrowLeft')
    await run(2000)
    unmount()
    await run(60000)
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('says the ceiling drops every 15 seconds', () => {
    setup()
    expect(screen.getByText(/the ceiling drops a row every 15 seconds, so no stalling/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Seconds until the ceiling drops')).toHaveTextContent('15s')
    expect(screen.getByLabelText('Rows walled off')).toHaveTextContent('0')
  })

  it('does not start the ceiling clock until the first key', async () => {
    setup()
    await run(60000)
    expect(document.querySelectorAll('[data-wall="true"]')).toHaveLength(0)
    expect(screen.getByLabelText('Seconds until the ceiling drops')).toHaveTextContent('15s')
  })

  it('counts down and then walls off a row at the top, then another 15 seconds later', async () => {
    setup()
    press('ArrowLeft')
    await run(5000)
    expect(screen.getByLabelText('Seconds until the ceiling drops')).toHaveTextContent('10s')
    expect(document.querySelectorAll('[data-wall="true"]')).toHaveLength(0)

    await run(SHRINK_EVERY_MS - 5000)
    expect(document.querySelectorAll('[data-wall="true"]')).toHaveLength(COLS)
    expect(screen.getByLabelText('Rows walled off')).toHaveTextContent('1')
    expect(screen.getByLabelText('Seconds until the ceiling drops')).toHaveTextContent('15s')

    await run(SHRINK_EVERY_MS)
    expect(document.querySelectorAll('[data-wall="true"]')).toHaveLength(COLS * 2)
    expect(screen.getByLabelText('Rows walled off')).toHaveTextContent('2')
  })

  it('flashes the row that is about to go in the last three seconds', async () => {
    setup()
    press('ArrowLeft')
    await run(SHRINK_EVERY_MS - 5000)
    expect(document.querySelector('.tt-warning')).toBeNull()
    await run(2500)
    expect(document.querySelector('.tt-warning')).not.toBeNull()
    await run(3000) // the ceiling drops and the warning resets
    expect(document.querySelector('.tt-warning')).toBeNull()
  })

  it('loses when the ceiling comes down on the stack', async () => {
    const stackedAtTop = () => {
      const board = emptyBoard()
      board[0][0] = 'Z' // already up in the top row
      return { ...createGame(() => 0.3), board, piece: { type: 'O', rot: 0, x: 4, y: 10 }, next: 'O' }
    }
    const { onFinish } = setup({ makeGame: stackedAtTop })
    press('ArrowLeft')
    await run(SHRINK_EVERY_MS)

    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onFinish).toHaveBeenCalledWith(false)
    expect(screen.getByText('The ceiling crushed your stack.')).toBeInTheDocument()
    expect(screen.getByText('−$800')).toBeInTheDocument()
  })

  it('loses anyone who stalls, even with a clear well', async () => {
    const { onFinish } = setup()
    press('ArrowLeft') // start, then do nothing
    await run(SHRINK_EVERY_MS * (ROWS + 2))
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onFinish).toHaveBeenCalledWith(false)
  })

  it('stops the ceiling once the game has been won', async () => {
    const { onFinish } = setup({ makeGame: oneDropFromLine(4) })
    press(' ')
    expect(onFinish).toHaveBeenCalledWith(true)
    await run(SHRINK_EVERY_MS * 3)
    expect(document.querySelectorAll('[data-wall="true"]')).toHaveLength(0)
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('hands control back through the result card button', () => {
    const { onExit } = setup({ makeGame: aboutToTopOut })
    press(' ')
    fireEvent.click(screen.getByRole('button', { name: 'Back to board' }))
    expect(onExit).toHaveBeenCalledTimes(1)
  })
})
