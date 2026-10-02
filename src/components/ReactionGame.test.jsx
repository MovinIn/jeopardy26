import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DECOYS, PINK } from '../game/reaction.js'
import { ReactionGame } from './ReactionGame.jsx'
import { play } from '../audio/sfx.js'

// Only `play` is replaced, so the tests can see which sounds were asked for.
vi.mock('../audio/sfx.js', async (importOriginal) => ({ ...(await importOriginal()), play: vi.fn() }))

const team = { id: 'team-1', name: 'Team 1' }
const GREEN = DECOYS.find((c) => c.name === 'green')
const RED = DECOYS.find((c) => c.name === 'red')

// green at 1.0 s, red at 1.5 s, pink at 1.8 s.
const script = () => ({
  warmupMs: 1000,
  flashes: [
    { color: GREEN, ms: 500 },
    { color: RED, ms: 300 },
  ],
})

function setup(props = {}) {
  const handlers = { onStart: vi.fn(), onFinish: vi.fn(), onExit: vi.fn() }
  const view = render(<ReactionGame team={team} stake={1000} makeScript={script} {...handlers} {...props} />)
  return { ...handlers, ...view }
}

const panel = () => screen.getByRole('button', { name: 'Reaction panel' })
const space = () => fireEvent.keyDown(window, { key: ' ' })
const start = () => fireEvent.click(screen.getByRole('button', { name: /^start try/i }))
const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`
}

async function run(ms) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

/** Run a try up to the moment pink is on screen and its start time has been settled. */
async function untilPink() {
  await run(1800)
  await run(32)
}

describe('ReactionGame', () => {
  beforeEach(() => {
    play.mockClear()
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  describe('the start screen', () => {
    it('says in the title to only press when pink, and explains the rules', () => {
      setup()
      expect(screen.getByRole('heading', { name: /only press when pink!/i })).toBeInTheDocument()
      expect(screen.getByText(/react in under 350 ms to win \$1,000/i)).toBeInTheDocument()
      expect(screen.getByText(/3 tries; fail them all and you lose \$1,000/i)).toBeInTheDocument()
      expect(screen.getByText(/press on green, or any other colour, and that try fails/i)).toBeInTheDocument()
      expect(screen.getByText(/flashing colours/i)).toBeInTheDocument()
    })

    it('shows three unused tries and waits for Start', () => {
      const { onStart } = setup()
      const tries = screen.getByRole('list', { name: 'Tries' })
      expect(tries.querySelectorAll('li')).toHaveLength(3)
      expect(tries).toHaveTextContent('not used yet')
      expect(onStart).not.toHaveBeenCalled()
      // Pressing before starting does nothing, and does not scroll the page away either.
      expect(fireEvent.keyDown(window, { key: ' ' })).toBe(true)
      expect(screen.getByRole('button', { name: 'Start try 1' })).toBeInTheDocument()
    })

    it('uses the stake it is given', () => {
      setup({ stake: 400 })
      expect(screen.getByText(/to win \$400/i)).toBeInTheDocument()
    })
  })

  describe('a try', () => {
    it('starts the first try, says so once, and waits for the screen to flash', async () => {
      const { onStart } = setup()
      start()
      expect(onStart).toHaveBeenCalledTimes(1)
      expect(screen.getByText(/get ready/i)).toBeInTheDocument()
      expect(panel()).toHaveAttribute('data-phase', 'warmup')
    })

    it('flashes the decoy colours and then pink, instantly and with no text to give it away', async () => {
      setup()
      start()
      await run(1100)
      expect(panel().style.background).toBe(rgb(GREEN.hex))
      expect(panel()).toHaveTextContent('')
      await run(500) // 1.6 s
      expect(panel().style.background).toBe(rgb(RED.hex))
      await run(300) // 1.9 s
      expect(panel().style.background).toBe(rgb(PINK.hex))
      expect(panel()).toHaveTextContent('')
    })
  })

  describe('failing a try', () => {
    it('fails if you press before anything has flashed', async () => {
      setup()
      start()
      await run(400)
      expect(fireEvent.keyDown(window, { key: ' ' })).toBe(false) // stops the page scrolling
      expect(screen.getByText('Try failed.')).toBeInTheDocument()
      expect(screen.getByText('Too soon! Nothing had flashed yet.')).toBeInTheDocument()
      expect(screen.getByText('2 tries left')).toBeInTheDocument()
      expect(play).toHaveBeenCalledWith('wrong')
    })

    it('fails on green, and tells you what it was', async () => {
      setup()
      start()
      await run(1100)
      space()
      expect(screen.getByText('That was green! Only press when it is pink.')).toBeInTheDocument()
    })

    it('fails on any other colour, such as red', async () => {
      setup()
      start()
      await run(1600)
      space()
      expect(screen.getByText('That was red! Only press when it is pink.')).toBeInTheDocument()
    })

    it('fails on pink if you are too slow, and shows how slow', async () => {
      setup()
      start()
      await untilPink()
      await run(400)
      space()
      expect(screen.getByText(/Pink, but \d{3} ms is too slow\. You need under 350 ms\./)).toBeInTheDocument()
      expect(screen.getByText('2 tries left')).toBeInTheDocument()
    })

    it('fails if pink comes and goes and you never press', async () => {
      setup()
      start()
      await untilPink()
      await run(1600)
      expect(screen.getByText('Pink came and went. You never pressed.')).toBeInTheDocument()
    })

    it('does not carry on flashing once a try has failed', async () => {
      setup()
      start()
      await run(400)
      space()
      await run(5000)
      expect(screen.getByText('Try failed.')).toBeInTheDocument()
      expect(panel().style.background).toBe(rgb('#0b1030'))
      expect(panel()).toHaveAttribute('data-phase', 'result')
    })
  })

  describe('winning', () => {
    it('wins by pressing on pink in under 350 ms, and reports the time', async () => {
      const { onFinish } = setup()
      start()
      await untilPink()
      await run(100)
      space()

      const title = screen.getByText(/You did it! \d+ ms/)
      expect(Number(title.textContent.match(/\d+/)[0])).toBeLessThan(350)
      expect(screen.getByText(/Pink! \d+ ms is under 350 ms\./)).toBeInTheDocument()
      expect(screen.getByText('+$1,000')).toBeInTheDocument()
      expect(onFinish).toHaveBeenCalledTimes(1)
      expect(onFinish).toHaveBeenCalledWith(true)
      expect(play).toHaveBeenCalledWith('win')
    })

    it('counts a tap on the panel as a press, not only the keyboard', async () => {
      const { onFinish } = setup()
      start()
      await untilPink()
      await run(80)
      fireEvent.pointerDown(panel())
      expect(onFinish).toHaveBeenCalledWith(true)
    })

    it('counts Enter as a press too', async () => {
      const { onFinish } = setup()
      start()
      await untilPink()
      await run(80)
      fireEvent.keyDown(window, { key: 'Enter' })
      expect(onFinish).toHaveBeenCalledWith(true)
    })

    it('ignores a key that is being held down', async () => {
      const { onFinish } = setup()
      start()
      await untilPink()
      fireEvent.keyDown(window, { key: ' ', repeat: true })
      expect(onFinish).not.toHaveBeenCalled()
      expect(panel()).toHaveAttribute('data-phase', 'pink')
    })

    it('can be won on the third try after two failures', async () => {
      const { onFinish } = setup()
      start()
      await run(400)
      space() // too soon
      start()
      await run(1100)
      space() // green
      start()
      await untilPink()
      await run(100)
      space() // pink, fast

      expect(onFinish).toHaveBeenCalledTimes(1)
      expect(onFinish).toHaveBeenCalledWith(true)
      const tries = screen.getByRole('list', { name: 'Tries' })
      expect(tries).toHaveTextContent('Try 1: failed')
      expect(tries).toHaveTextContent('Try 2: failed')
      expect(tries).toHaveTextContent('Try 3: passed')
    })
  })

  describe('losing', () => {
    async function failOnce() {
      start()
      await run(400)
      space()
    }

    it('shows tries running out, and loses after the third failure', async () => {
      const { onFinish } = setup()
      await failOnce()
      expect(screen.getByText('2 tries left')).toBeInTheDocument()
      expect(onFinish).not.toHaveBeenCalled()
      await failOnce()
      expect(screen.getByText('1 try left')).toBeInTheDocument()
      await failOnce()

      expect(screen.getByText('Out of tries.')).toBeInTheDocument()
      expect(screen.getByText('−$1,000')).toBeInTheDocument()
      expect(onFinish).toHaveBeenCalledTimes(1)
      expect(onFinish).toHaveBeenCalledWith(false)
      expect(screen.queryByRole('button', { name: /^start try/i })).not.toBeInTheDocument()
    })

    it('plays a buzzer for each failed try and the trombone for the last', async () => {
      setup()
      await failOnce()
      await failOnce()
      expect(play.mock.calls.filter(([n]) => n === 'wrong')).toHaveLength(2)
      await failOnce()
      expect(play).toHaveBeenCalledWith('lose')
      expect(play.mock.calls.filter(([n]) => n === 'wrong')).toHaveLength(2)
    })

    it('stops responding to presses once the game is over', async () => {
      const { onFinish } = setup()
      await failOnce()
      await failOnce()
      await failOnce()
      space()
      await run(5000)
      expect(onFinish).toHaveBeenCalledTimes(1)
    })

    it('hands control back through the result card button', async () => {
      const { onExit } = setup()
      await failOnce()
      await failOnce()
      await failOnce()
      fireEvent.click(screen.getByRole('button', { name: 'Back to board' }))
      expect(onExit).toHaveBeenCalledTimes(1)
    })
  })

  describe('the decoys', () => {
    it('use a different script for every try', async () => {
      const scripts = vi.fn(script)
      setup({ makeScript: scripts })
      start()
      await run(400)
      space()
      start()
      expect(scripts).toHaveBeenCalledTimes(2)
    })

    it('slow right down for people who asked for less motion', async () => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn().mockImplementation(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
      )
      setup({
        makeScript: () => ({
          warmupMs: 1000,
          flashes: [
            { color: GREEN, ms: 150 }, // a quick flicker normally
            { color: RED, ms: 300 },
          ],
        }),
      })
      start()
      await run(1250) // normally red by now, but a flicker is held for at least 400 ms
      expect(panel().style.background).toBe(rgb(GREEN.hex))
      await run(250) // 1.5 s
      expect(panel().style.background).toBe(rgb(RED.hex))
    })
  })

  describe('leaving early', () => {
    it('reports nothing if it is closed mid-try, and stops flashing', async () => {
      const { onFinish, unmount } = setup()
      start()
      await run(700)
      unmount()
      await run(10000)
      expect(onFinish).not.toHaveBeenCalled()
    })
  })
})
