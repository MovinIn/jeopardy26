import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PASSAGE, TIME_LIMIT_MS } from '../game/typing.js'
import { TypingGame } from './TypingGame.jsx'

const team = { id: 'team-1', name: 'Team 1' }

function setup(props = {}) {
  const handlers = { onStart: vi.fn(), onFinish: vi.fn(), onExit: vi.fn() }
  const view = render(<TypingGame team={team} stake={600} {...handlers} {...props} />)
  return { ...handlers, ...view }
}

const press = (key, extra = {}) => fireEvent.keyDown(window, { key, ...extra })

function typeText(text) {
  for (const ch of text) {
    press(ch)
  }
}

async function run(ms) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

const charAt = (i) => document.querySelector(`[data-index="${i}"]`)

// Typing the whole 213-character passage re-renders it on every key, so give these room on a busy machine.
describe('TypingGame', { timeout: 30000 }, () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('waits for the first key and shows the goal, the stake, and the speed needed', () => {
    setup()
    expect(screen.getByText(/start typing to begin/i)).toBeInTheDocument()
    expect(screen.getByText(/type all 40 words at 80 WPM or faster to win \$600/i)).toBeInTheDocument()
    expect(screen.getByText(/too slow and you lose \$600/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Time left')).toHaveTextContent('30.0s')
    expect(screen.getByLabelText('Passage to type')).toHaveTextContent(PASSAGE)
  })

  it('uses the stake it is given', () => {
    setup({ stake: 900 })
    expect(screen.getByText(/to win \$900/i)).toBeInTheDocument()
  })

  it('starts on the first character, and says so once', () => {
    const { onStart } = setup()
    typeText('In')
    expect(screen.queryByText(/start typing to begin/i)).not.toBeInTheDocument()
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('does not start on keys that are not characters, or on shortcuts', () => {
    const { onStart } = setup()
    press('Shift')
    press('Enter')
    press('Backspace')
    press('a', { ctrlKey: true })
    press('a', { metaKey: true })
    expect(onStart).not.toHaveBeenCalled()
    expect(screen.getByText(/start typing to begin/i)).toBeInTheDocument()
  })

  it('stops the page scrolling on space and going back on backspace', () => {
    setup()
    expect(press(' ')).toBe(false)
    expect(press('Backspace')).toBe(false)
  })

  it('marks what you typed: right in green, wrong in red, and lets you delete a mistake', () => {
    setup()
    typeText('In x')
    expect(charAt(0)).toHaveClass('tp-ok')
    expect(charAt(3)).toHaveClass('tp-wrong') // typed "x" where the passage has "a"
    expect(charAt(4)).toHaveClass('tp-cursor')
    press('Backspace')
    expect(charAt(3)).toHaveClass('tp-todo')
    expect(charAt(3)).toHaveClass('tp-cursor')
  })

  it('shows a pace marker that moves through the passage at 80 words a minute', async () => {
    setup()
    typeText('I')
    await run(15000)
    const ghost = Number(document.querySelector('.tp-ghost').dataset.index)
    expect(ghost).toBeGreaterThan(PASSAGE.length / 2 - 8)
    expect(ghost).toBeLessThan(PASSAGE.length / 2 + 8)
    await run(10000)
    const later = Number(document.querySelector('.tp-ghost').dataset.index)
    expect(later).toBeGreaterThan(ghost)
  })

  it('counts the time down and tells you how far ahead or behind the pace you are', async () => {
    setup()
    typeText(PASSAGE.slice(0, 20)) // a quick start
    await run(2000)
    expect(screen.getByLabelText('Time left')).toHaveTextContent('28.0s')
    expect(screen.getByText(/ahead of pace/i)).toBeInTheDocument()

    await run(10000) // then nothing typed for ten seconds
    expect(screen.getByText(/behind pace/i)).toBeInTheDocument()
  })

  it('wins by typing the whole passage within 30 seconds, and reports the speed', async () => {
    const { onFinish } = setup()
    typeText(PASSAGE[0])
    await run(20000)
    typeText(PASSAGE.slice(1))

    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onFinish).toHaveBeenCalledWith(true)
    expect(screen.getByText(/you typed 40 words at 12\d WPM!/i)).toBeInTheDocument() // ~20 s
    expect(screen.getByText('+$600')).toBeInTheDocument()
  })

  it('does not count the run until typos are fixed', async () => {
    const { onFinish } = setup()
    typeText(PASSAGE.slice(0, -1) + 'X') // the whole length, but the last letter is wrong
    await run(5000)
    expect(onFinish).not.toHaveBeenCalled()
    expect(screen.queryByText(/you typed 40 words/i)).not.toBeInTheDocument()

    press('Backspace')
    press(PASSAGE.slice(-1))
    expect(onFinish).toHaveBeenCalledWith(true)
  })

  it('loses when the 30 seconds run out, and the game stops', async () => {
    const { onFinish } = setup()
    typeText('In a quiet')
    await run(TIME_LIMIT_MS + 500)

    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onFinish).toHaveBeenCalledWith(false)
    expect(screen.getByText(/time's up\. you needed 80 WPM/i)).toBeInTheDocument()
    expect(screen.getByText(/got to word 3 of 40/i)).toBeInTheDocument()
    expect(screen.getByText('−$600')).toBeInTheDocument()

    typeText('more')
    await run(5000)
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('still wins when the last letter lands just inside the limit', async () => {
    const { onFinish } = setup()
    typeText(PASSAGE.slice(0, -1))
    await run(TIME_LIMIT_MS - 100) // just inside the limit while one letter is still missing
    typeText(PASSAGE.slice(-1))
    expect(onFinish).toHaveBeenCalledWith(true)
  })

  it('ignores typing after the game is over', async () => {
    const { onFinish } = setup()
    typeText('I')
    await run(TIME_LIMIT_MS + 500)
    typeText(PASSAGE)
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onFinish).toHaveBeenCalledWith(false)
  })

  it('leaves scoring to the parent: nothing is reported if it is unmounted mid-game', async () => {
    const { onFinish, unmount } = setup()
    typeText('In a')
    await run(2000)
    unmount()
    await run(60000)
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('hands control back through the result card button', async () => {
    const { onExit } = setup()
    typeText('I')
    await run(TIME_LIMIT_MS + 500)
    fireEvent.click(screen.getByRole('button', { name: 'Back to board' }))
    expect(onExit).toHaveBeenCalledTimes(1)
  })
})
