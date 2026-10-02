import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReactionGame } from '../components/ReactionGame.jsx'
import { SnakeGame } from '../components/SnakeGame.jsx'
import { TetrisGame } from '../components/TetrisGame.jsx'
import { TypingGame } from '../components/TypingGame.jsx'
import { DECOYS } from '../game/reaction.js'
import { TICK_MS as SNAKE_TICK } from '../game/snake.js'
import { PASSAGE } from '../game/typing.js'
import { usePageVisible } from './usePageVisible.js'

const team = { id: 't', name: 'Team 1' }

/** Pretend the tab went to the background (or came back), the way the browser reports it. */
function setHidden(hidden) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') })
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

async function run(ms) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

const key = (k) => fireEvent.keyDown(window, { key: k })

afterEach(() => {
  delete document.hidden
  delete document.visibilityState
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('usePageVisible', () => {
  it('follows the tab going to the background and coming back', () => {
    const { result } = renderHook(() => usePageVisible())
    expect(result.current).toBe(true)
    setHidden(true)
    expect(result.current).toBe(false)
    setHidden(false)
    expect(result.current).toBe(true)
  })
})

describe('Snake while the tab is hidden', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] })
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  it('stands still instead of crashing into a wall behind your back', async () => {
    const onFinish = vi.fn()
    render(<SnakeGame team={team} stake={200} onFinish={onFinish} onExit={() => {}} />)
    key('ArrowRight')
    await run(SNAKE_TICK * 3)

    setHidden(true)
    await run(SNAKE_TICK * 60) // far longer than it takes to hit the wall
    expect(onFinish).not.toHaveBeenCalled()

    setHidden(false)
    await run(SNAKE_TICK * 60)
    expect(onFinish).toHaveBeenCalledWith(false) // it carries on from where it was
  })
})

describe('Tetris while the tab is hidden', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] })
    vi.spyOn(Math, 'random').mockReturnValue(0.3)
  })

  const walls = () => document.querySelectorAll('[data-wall="true"]').length

  it('does not drop the ceiling in a burst when you come back', async () => {
    render(<TetrisGame team={team} stake={800} onFinish={() => {}} onExit={() => {}} />)
    key('ArrowLeft') // start
    await run(5000) // 10 s left on the countdown

    setHidden(true)
    await run(10 * 60 * 1000) // away for ten minutes
    setHidden(false)
    await run(500)
    expect(walls()).toBe(0) // not a single row, let alone every row at once
  })

  it('carries the countdown on from where it paused', async () => {
    render(<TetrisGame team={team} stake={800} onFinish={() => {}} onExit={() => {}} />)
    key('ArrowLeft')
    await run(5000)
    setHidden(true)
    await run(60000)
    setHidden(false)

    await run(9000) // 9 of the remaining 10 seconds
    expect(walls()).toBe(0)
    await run(1500)
    expect(walls()).toBe(10) // one row, as it would have been
    expect(document.querySelector('[aria-label="Rows walled off"]')).toHaveTextContent('1')
  })

  it('does not stack up or lose the game while nobody is looking', async () => {
    const onFinish = vi.fn()
    render(<TetrisGame team={team} stake={800} onFinish={onFinish} onExit={() => {}} />)
    key('ArrowLeft')
    await run(2000)
    setHidden(true)
    await run(30 * 60 * 1000)
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('counts the ceiling down again only once you are back', async () => {
    render(<TetrisGame team={team} stake={800} onFinish={() => {}} onExit={() => {}} />)
    key('ArrowLeft')
    await run(3000)
    setHidden(true)
    await run(20000)
    // Still on 12 seconds: nothing ticked while away.
    expect(screen.getByLabelText('Seconds until the ceiling drops')).toHaveTextContent('12s')
  })
})

describe('the typing clock while the tab is hidden', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] })
  })

  it('does not lose the typist their time, and does not end the game while away', async () => {
    const onFinish = vi.fn()
    render(<TypingGame team={team} stake={600} onFinish={onFinish} onExit={() => {}} />)
    key('I')
    await run(10000) // 20 s left

    setHidden(true)
    await run(120000) // two minutes on another tab
    expect(onFinish).not.toHaveBeenCalled()

    setHidden(false)
    await run(300)
    expect(onFinish).not.toHaveBeenCalled()
    const left = parseFloat(screen.getByLabelText('Time left').textContent)
    expect(left).toBeGreaterThan(19)
    expect(left).toBeLessThanOrEqual(20)
  })

  it('still runs out normally once the tab is back and time really passes', async () => {
    const onFinish = vi.fn()
    render(<TypingGame team={team} stake={600} onFinish={onFinish} onExit={() => {}} />)
    key('I')
    await run(10000)
    setHidden(true)
    await run(60000)
    setHidden(false)
    await run(21000) // the remaining 20 seconds, and a little more
    expect(onFinish).toHaveBeenCalledWith(false)
  })

  it('lets you finish after coming back', async () => {
    const onFinish = vi.fn()
    render(<TypingGame team={team} stake={600} onFinish={onFinish} onExit={() => {}} />)
    key(PASSAGE[0])
    await run(5000)
    setHidden(true)
    await run(90000)
    setHidden(false)
    await run(100)
    for (const ch of PASSAGE.slice(1)) {
      key(ch)
    }
    expect(onFinish).toHaveBeenCalledWith(true)
  }, 30000)
})

describe('the reaction test when the tab is hidden', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
    })
  })

  const GREEN = DECOYS[0]
  const script = () => ({ warmupMs: 1000, flashes: [{ color: GREEN, ms: 500 }] })
  const setup = () => {
    const handlers = { onStart: vi.fn(), onFinish: vi.fn(), onExit: vi.fn() }
    render(<ReactionGame team={team} stake={1000} makeScript={script} {...handlers} />)
    return handlers
  }
  const start = () => fireEvent.click(screen.getByRole('button', { name: /^start try/i }))
  const panel = () => screen.getByRole('button', { name: 'Reaction panel' })

  it('calls the try off with no penalty, and says so', async () => {
    const { onFinish } = setup()
    start()
    await run(1200) // green is showing
    setHidden(true)

    expect(panel()).toHaveAttribute('data-phase', 'interrupted')
    expect(screen.getByText('Paused')).toBeInTheDocument()
    expect(screen.getByText(/that try was called off/i)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Tries' })).not.toHaveTextContent('failed')

    await run(60000) // however long you are away, nothing is counted
    expect(onFinish).not.toHaveBeenCalled()
    expect(panel()).toHaveAttribute('data-phase', 'interrupted')
  })

  it('does not flash pink or fail behind your back', async () => {
    setup()
    start()
    await run(500)
    setHidden(true)
    await run(30000)
    expect(panel().style.background).toBe('rgb(11, 16, 48)') // still the dark waiting colour
  })

  it('ignores a key press while paused', async () => {
    const { onFinish } = setup()
    start()
    await run(1200)
    setHidden(true)
    setHidden(false)
    fireEvent.keyDown(window, { key: ' ' })
    expect(panel()).toHaveAttribute('data-phase', 'interrupted')
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('restarts the same try from the beginning when you ask', async () => {
    const { onFinish } = setup()
    start()
    await run(1200)
    setHidden(true)
    setHidden(false)

    fireEvent.click(screen.getByRole('button', { name: 'Restart try 1' }))
    expect(panel()).toHaveAttribute('data-phase', 'warmup')
    expect(screen.getByText(/get ready/i)).toBeInTheDocument()

    await run(1800)
    await run(32) // pink is up
    await run(100)
    fireEvent.keyDown(window, { key: ' ' })
    expect(onFinish).toHaveBeenCalledWith(true)
  })

  it('does not interrupt anything when there is no try running', async () => {
    setup()
    setHidden(true) // on the start screen
    setHidden(false)
    expect(screen.getByRole('button', { name: 'Start try 1' })).toBeInTheDocument()

    start()
    fireEvent.keyDown(window, { key: ' ' }) // too soon: a failed try, now showing the result
    setHidden(true)
    setHidden(false)
    expect(screen.getByText('Try failed.')).toBeInTheDocument()
  })
})
