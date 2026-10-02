import { describe, expect, it } from 'vitest'
import { MAX_CATCH_UP_MS, PAUSE_GAP_MS, catchUpMs } from './flappy.js'
import {
  DECOYS,
  createGame as createReaction,
  interruptAttempt,
  press,
  restartAttempt,
  showColor,
  showPink,
  startAttempt,
  triesLeft,
} from './reaction.js'
import { PASSAGE, TIME_LIMIT_MS, createGame as createTyping, shiftClock, tick, typeKey } from './typing.js'

describe('Flappy Bird after the tab was hidden', () => {
  it('plays an ordinary frame in full', () => {
    expect(catchUpMs(0)).toBe(0)
    expect(catchUpMs(16)).toBe(16)
    expect(catchUpMs(60)).toBe(60)
  })

  it('caps a slow frame at 100 ms', () => {
    expect(catchUpMs(180)).toBe(MAX_CATCH_UP_MS)
    expect(catchUpMs(PAUSE_GAP_MS)).toBe(MAX_CATCH_UP_MS)
  })

  it('skips a long gap altogether: that was a hidden or frozen tab, not a slow frame', () => {
    expect(catchUpMs(PAUSE_GAP_MS + 1)).toBe(0)
    expect(catchUpMs(5000)).toBe(0)
    expect(catchUpMs(10 * 60 * 1000)).toBe(0)
  })

  it('never goes negative', () => {
    expect(catchUpMs(-20)).toBe(0)
  })
})

describe('the typing clock after the tab was hidden', () => {
  const started = () => typeKey(createTyping(), PASSAGE[0], 1000)

  it('moves the start time forward by the time spent away', () => {
    expect(shiftClock(started(), 20000).startedAt).toBe(21000)
  })

  it('stops the time away from counting against the typist', () => {
    // Started at 1 s, away for a whole minute, back at 61 s.
    const back = shiftClock(started(), 60000)
    expect(tick(back, 61000)).toBe(back) // still playing
    expect(tick(back, 1000 + 60000 + TIME_LIMIT_MS + 1).status).toBe('lost') // 30 s of real play later
  })

  it('without the shift, that minute would have lost the game', () => {
    expect(tick(started(), 61000).status).toBe('lost')
  })

  it('does nothing before the game starts, once it is over, or for no time away', () => {
    const ready = createTyping()
    expect(shiftClock(ready, 5000)).toBe(ready)
    const lost = tick(started(), 1000 + TIME_LIMIT_MS + 5)
    expect(shiftClock(lost, 5000)).toBe(lost)
    expect(shiftClock(started(), 0).startedAt).toBe(1000)
    expect(shiftClock(started(), -5).startedAt).toBe(1000)
    expect(shiftClock(started(), NaN).startedAt).toBe(1000)
  })
})

describe('the reaction test when the tab is hidden mid-try', () => {
  const GREEN = DECOYS[0]

  it('calls off a try that was in the warm-up, with no penalty', () => {
    const game = interruptAttempt(startAttempt(createReaction()))
    expect(game.phase).toBe('interrupted')
    expect(game.tries).toHaveLength(0)
    expect(triesLeft(game)).toBe(3)
    expect(game.status).toBe('playing')
  })

  it('calls off a try that was showing a decoy colour, or pink', () => {
    const flashing = interruptAttempt(showColor(startAttempt(createReaction()), GREEN))
    expect(flashing).toMatchObject({ phase: 'interrupted', color: null })
    const pink = interruptAttempt(showPink(startAttempt(createReaction()), 1000))
    expect(pink).toMatchObject({ phase: 'interrupted', color: null, pinkAt: null })
    expect(pink.tries).toHaveLength(0)
  })

  it('ignores presses while interrupted: they are not a fail and not a win', () => {
    const game = interruptAttempt(showPink(startAttempt(createReaction()), 1000))
    expect(press(game, 1100)).toBe(game)
  })

  it('restarts the same try with a fresh start, keeping the try number', () => {
    const interrupted = interruptAttempt(showColor(startAttempt(createReaction()), GREEN))
    const again = restartAttempt(interrupted)
    expect(again).toMatchObject({ phase: 'warmup', attempt: 1, color: null, pinkAt: null, status: 'playing' })
    expect(again.tries).toHaveLength(0)
  })

  it('leaves everything else alone: not started, a finished try, or a game that is over', () => {
    const ready = createReaction()
    expect(interruptAttempt(ready)).toBe(ready)
    expect(restartAttempt(ready)).toBe(ready)

    const finishedTry = press(startAttempt(createReaction()), 100) // pressed too soon: a failed try
    expect(finishedTry.phase).toBe('result')
    expect(interruptAttempt(finishedTry)).toBe(finishedTry)

    const warmup = startAttempt(createReaction())
    expect(restartAttempt(warmup)).toBe(warmup)
  })
})
