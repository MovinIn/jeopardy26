import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BIRD_X, POLE_W, START_Y, createGame } from '../game/flappy.js'
import { FlappyGame } from './FlappyGame.jsx'

const team = { id: 'team-1', name: 'Team 1' }

function setup(props = {}) {
  const handlers = { onStart: vi.fn(), onFinish: vi.fn(), onExit: vi.fn() }
  const view = render(<FlappyGame team={team} stake={400} {...handlers} {...props} />)
  return { ...handlers, ...view }
}

const press = (key = ' ') => fireEvent.keyDown(window, { key })

async function run(ms) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

/** One pole about to be passed, with the bird already in line with its gap. */
function aboutToPass(score) {
  return () => ({
    ...createGame(),
    score,
    poles: [{ x: BIRD_X - POLE_W / 2 + 1, y: START_Y, scored: false }],
  })
}

describe('FlappyGame', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('waits for the first flap and shows the goal and stake', () => {
    setup()
    expect(screen.getByText('Get ready!')).toBeInTheDocument()
    expect(screen.getByLabelText('Poles passed')).toHaveTextContent('0')
    expect(screen.getByText(/fly through 15 poles to win \$400/i)).toBeInTheDocument()
    expect(screen.getByText(/crash and you lose \$400/i)).toBeInTheDocument()
  })

  it('uses the stake it is given', () => {
    setup({ stake: 700 })
    expect(screen.getByText(/to win \$700/i)).toBeInTheDocument()
  })

  it('starts on space, the arrow, W, a click on the board or the Flap button, and says so once', () => {
    for (const start of [
      () => press(' '),
      () => press('ArrowUp'),
      () => press('w'),
      () => fireEvent.pointerDown(screen.getByRole('img', { name: 'Flappy Bird' }).parentElement),
      () => fireEvent.click(screen.getByRole('button', { name: 'Flap' })),
    ]) {
      const { unmount, onStart } = setup()
      start()
      expect(screen.queryByText('Get ready!')).not.toBeInTheDocument()
      expect(onStart).toHaveBeenCalledTimes(1)
      unmount()
    }
  })

  it('ignores other keys and held-down repeats', () => {
    const { onStart } = setup()
    press('Enter')
    press('ArrowLeft')
    expect(onStart).not.toHaveBeenCalled()
    expect(screen.getByText('Get ready!')).toBeInTheDocument()
  })

  it('reports a win on the fifteenth pole, once', async () => {
    const { onFinish } = setup({ makeGame: aboutToPass(14) })
    press()
    expect(onFinish).not.toHaveBeenCalled()
    await run(200)

    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onFinish).toHaveBeenCalledWith(true)
    expect(screen.getByText('You flew through all 15 poles!')).toBeInTheDocument()
    expect(screen.getByText('Poles: 15 / 15')).toBeInTheDocument()
    expect(screen.getByText('+$400')).toBeInTheDocument()
  })

  it('counts poles as they are passed', async () => {
    setup({ makeGame: aboutToPass(3) })
    press()
    await run(100)
    expect(screen.getByLabelText('Poles passed')).toHaveTextContent('4')
  })

  it('reports a loss when the bird hits the ground, and the game stops', async () => {
    const { onFinish } = setup()
    press() // one flap, then let it fall
    await run(4000)

    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onFinish).toHaveBeenCalledWith(false)
    expect(screen.getByText('You hit the ground.')).toBeInTheDocument()
    expect(screen.getByText('−$400')).toBeInTheDocument()
    await run(2000)
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('reports a loss when the bird hits a pole', async () => {
    const hitsPole = () => ({
      ...createGame(),
      poles: [{ x: BIRD_X - 10, y: 350, scored: false }], // gap is far below the bird
    })
    const { onFinish } = setup({ makeGame: hitsPole })
    press()
    await run(200)
    expect(onFinish).toHaveBeenCalledWith(false)
    expect(screen.getByText('You hit a pole.')).toBeInTheDocument()
  })

  it('stops responding to flaps after the game is over', async () => {
    const { onFinish } = setup()
    press()
    await run(4000)
    press()
    await run(500)
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Flap' })).not.toBeInTheDocument()
  })

  it('leaves scoring to the parent: nothing is reported if it is unmounted mid-flight', async () => {
    const { onFinish, unmount } = setup()
    press()
    await run(300)
    unmount()
    await run(4000)
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('hands control back through the result card button', async () => {
    const { onExit } = setup()
    press()
    await run(4000)
    fireEvent.click(screen.getByRole('button', { name: 'Back to board' }))
    expect(onExit).toHaveBeenCalledTimes(1)
  })
})
