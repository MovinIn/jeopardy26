import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TICK_MS, createGame } from '../game/snake.js'
import { SnakeGame } from './SnakeGame.jsx'

const team = { id: 'team-1', name: 'Team 1' }

function setup(props = {}) {
  const handlers = { onStart: vi.fn(), onFinish: vi.fn(), onExit: vi.fn() }
  const view = render(<SnakeGame team={team} stake={200} {...handlers} {...props} />)
  return { ...handlers, ...view }
}

const press = (key) => fireEvent.keyDown(window, { key })

async function runTicks(count) {
  await act(async () => {
    vi.advanceTimersByTime(TICK_MS * count)
  })
}

/** A game one step from eating an apple straight ahead, with `score` apples already collected. */
function appleAhead(score) {
  return () => ({ ...createGame(() => 0), apple: { x: 5, y: 7 }, score })
}

describe('SnakeGame', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    // Puts the first apple in the top-left corner, well away from the snake's path.
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('waits for the first key and shows the apple goal and stake', () => {
    setup()
    expect(screen.getByText(/press an arrow key/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Apples collected')).toHaveTextContent('0')
    expect(screen.getByText('/ 10')).toBeInTheDocument()
    expect(screen.getByText(/collect 10 apples to win \$200/i)).toBeInTheDocument()
    expect(screen.getByText(/crash and you lose \$200/i)).toBeInTheDocument()
  })

  it('uses the stake it is given', () => {
    setup({ stake: 600 })
    expect(screen.getByText(/collect 10 apples to win \$600/i)).toBeInTheDocument()
  })

  it('starts on an arrow key, WASD or the on-screen pad, and says so once', () => {
    for (const start of [
      () => press('ArrowUp'),
      () => press('d'),
      () => fireEvent.click(screen.getByRole('button', { name: 'Down' })),
    ]) {
      const { unmount, onStart } = setup()
      start()
      expect(screen.queryByText(/press an arrow key/i)).not.toBeInTheDocument()
      expect(onStart).toHaveBeenCalledTimes(1)
      unmount()
    }
  })

  it('ignores a first key that points back into the snake', () => {
    const { onStart } = setup()
    press('ArrowLeft')
    expect(screen.getByText(/press an arrow key/i)).toBeInTheDocument()
    expect(onStart).not.toHaveBeenCalled()
  })

  it('counts apples as they are eaten', async () => {
    setup({ makeGame: appleAhead(3) })
    press('ArrowRight')
    await runTicks(1)
    expect(screen.getByLabelText('Apples collected')).toHaveTextContent('4')
  })

  it('reports a win on the tenth apple, once', async () => {
    const { onFinish } = setup({ makeGame: appleAhead(9) })
    press('ArrowRight')
    expect(onFinish).not.toHaveBeenCalled()
    await runTicks(1)

    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onFinish).toHaveBeenCalledWith(true)
    expect(screen.getByText('You collected all 10 apples!')).toBeInTheDocument()
    expect(screen.getByText('Apples: 10 / 10')).toBeInTheDocument()
    expect(screen.getByText('+$200')).toBeInTheDocument()
  })

  it('reports a loss when the snake hits a wall, and the game stops', async () => {
    const { onFinish } = setup()
    press('ArrowRight')
    await runTicks(30)

    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onFinish).toHaveBeenCalledWith(false)
    expect(screen.getByText('You hit the wall.')).toBeInTheDocument()
    expect(screen.getByText('−$200')).toBeInTheDocument()
    await runTicks(30)
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('stops responding to keys after the game is over', async () => {
    const { onFinish } = setup()
    press('ArrowRight')
    await runTicks(30)
    press('ArrowUp')
    await runTicks(5)
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('group', { name: 'Steering' })).not.toBeInTheDocument()
  })

  it('leaves scoring to the parent: nothing is reported if it is unmounted mid-game', async () => {
    const { onFinish, unmount } = setup()
    press('ArrowRight')
    await runTicks(2)
    unmount()
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('hands control back through the result card button', async () => {
    const { onExit } = setup()
    press('ArrowRight')
    await runTicks(30)
    fireEvent.click(screen.getByRole('button', { name: 'Back to board' }))
    expect(onExit).toHaveBeenCalledTimes(1)
  })
})
