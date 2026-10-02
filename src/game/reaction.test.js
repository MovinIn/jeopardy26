import { describe, expect, it } from 'vitest'
import {
  DECOYS,
  PINK,
  PINK_WINDOW_MS,
  REACTION_LIMIT_MS,
  TRIES,
  createGame,
  describeTry,
  makeSequence,
  miss,
  press,
  refinePink,
  showColor,
  showPink,
  startAttempt,
  triesLeft,
} from './reaction.js'

const GREEN = DECOYS.find((c) => c.name === 'green')
const RED = DECOYS.find((c) => c.name === 'red')

/** A try that is showing a decoy colour. */
const flashing = (color = GREEN) => showColor(startAttempt(createGame()), color)
/** A try where pink appeared at `at`. */
const pinkAt = (at = 1000) => showPink(startAttempt(createGame()), at)

describe('the rules', () => {
  it('is 350 ms, three tries, and the screen has to be pink', () => {
    expect(REACTION_LIMIT_MS).toBe(350)
    expect(TRIES).toBe(3)
    expect(PINK.name).toBe('pink')
  })

  it('has no pink among the decoys, and has green among them', () => {
    expect(DECOYS.some((c) => c.name === 'pink' || c.hex === PINK.hex)).toBe(false)
    expect(DECOYS.some((c) => c.name === 'green')).toBe(true)
    expect(new Set(DECOYS.map((c) => c.hex)).size).toBe(DECOYS.length)
  })
})

describe('makeSequence', () => {
  const rolls = (values) => {
    let i = 0
    return () => values[i++ % values.length]
  }

  it('never shows pink as a decoy', () => {
    for (let seed = 1; seed <= 300; seed++) {
      let x = seed
      const rng = () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646
      const { flashes } = makeSequence(rng)
      expect(flashes.every((f) => f.color.name !== 'pink')).toBe(true)
    }
  })

  it('has 4 to 8 flashes, a warm-up of 1 to 2.5 seconds, and sensible flash lengths', () => {
    for (let seed = 1; seed <= 300; seed++) {
      let x = seed
      const rng = () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646
      const seq = makeSequence(rng)
      expect(seq.flashes.length).toBeGreaterThanOrEqual(4)
      expect(seq.flashes.length).toBeLessThanOrEqual(8)
      expect(seq.warmupMs).toBeGreaterThanOrEqual(1000)
      expect(seq.warmupMs).toBeLessThanOrEqual(2500)
      for (const flash of seq.flashes) {
        expect(flash.ms).toBeGreaterThanOrEqual(150)
        expect(flash.ms).toBeLessThanOrEqual(1100)
      }
    }
  })

  it('never repeats a colour back to back', () => {
    for (let seed = 1; seed <= 300; seed++) {
      let x = seed
      const rng = () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646
      const { flashes } = makeSequence(rng)
      for (let i = 1; i < flashes.length; i++) {
        expect(flashes[i].color).not.toBe(flashes[i - 1].color)
      }
    }
  })

  it('always includes at least one green, to catch out anyone who presses on it', () => {
    for (let seed = 1; seed <= 500; seed++) {
      let x = seed
      const rng = () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646
      const { flashes } = makeSequence(rng)
      expect(flashes.some((f) => f.color.name === 'green'), `seed ${seed}`).toBe(true)
    }
  })

  it('mixes in quick flickers as well as longer flashes', () => {
    let quick = 0
    let long = 0
    for (let seed = 1; seed <= 200; seed++) {
      let x = seed
      const rng = () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646
      for (const f of makeSequence(rng).flashes) {
        if (f.ms <= 260) quick += 1
        else long += 1
      }
    }
    expect(quick).toBeGreaterThan(100)
    expect(long).toBeGreaterThan(quick)
  })

  it('is different from one call to the next', () => {
    const a = JSON.stringify(makeSequence(rolls([0.11, 0.52, 0.87])))
    const b = JSON.stringify(makeSequence(rolls([0.93, 0.07, 0.4])))
    expect(a).not.toBe(b)
  })
})

describe('a game before it starts', () => {
  it('ignores everything but starting', () => {
    const game = createGame()
    expect(game).toMatchObject({ status: 'ready', phase: 'idle', attempt: 0, tries: [] })
    expect(press(game, 100)).toBe(game)
    expect(showColor(game, GREEN)).toBe(game)
    expect(showPink(game, 100)).toBe(game)
    expect(miss(game)).toBe(game)
    expect(triesLeft(game)).toBe(3)
  })

  it('starts the first try', () => {
    expect(startAttempt(createGame())).toMatchObject({ status: 'playing', phase: 'warmup', attempt: 1 })
  })
})

describe('pressing at the wrong moment', () => {
  it('fails if you press before anything has flashed', () => {
    const game = press(startAttempt(createGame()), 500)
    expect(game.last).toMatchObject({ ok: false, reason: 'early' })
    expect(game).toMatchObject({ status: 'playing', phase: 'result' })
    expect(triesLeft(game)).toBe(2)
  })

  it('fails on green', () => {
    const game = press(flashing(GREEN), 700)
    expect(game.last).toMatchObject({ ok: false, reason: 'wrong-color', color: GREEN })
    expect(describeTry(game.last)).toBe('That was green! Only press when it is pink.')
  })

  it('fails on any other colour too', () => {
    for (const color of DECOYS) {
      const game = press(flashing(color), 700)
      expect(game.last, color.name).toMatchObject({ ok: false, reason: 'wrong-color', color })
    }
  })
})

describe('pressing on pink', () => {
  it('wins when it is under 350 ms', () => {
    const game = press(pinkAt(1000), 1180)
    expect(game.last).toMatchObject({ ok: true, ms: 180 })
    expect(game.status).toBe('won')
    expect(game.phase).toBe('result')
    expect(describeTry(game.last)).toBe('Pink! 180 ms is under 350 ms.')
  })

  it('wins at 349 ms but not at exactly 350', () => {
    expect(press(pinkAt(1000), 1349).status).toBe('won')
    const slow = press(pinkAt(1000), 1350)
    expect(slow.status).toBe('playing')
    expect(slow.last).toMatchObject({ ok: false, reason: 'slow', ms: 350 })
  })

  it('fails when it is too slow, and says how slow', () => {
    const game = press(pinkAt(1000), 1400)
    expect(game.last).toMatchObject({ ok: false, reason: 'slow', ms: 400 })
    expect(describeTry(game.last)).toBe('Pink, but 400 ms is too slow. You need under 350 ms.')
  })

  it('never reports a negative time', () => {
    expect(press(pinkAt(1000), 990).last.ms).toBe(0)
  })

  it('fails if pink goes by with no press', () => {
    const game = miss(pinkAt())
    expect(game.last).toMatchObject({ ok: false, reason: 'missed' })
    expect(describeTry(game.last)).toBe('Pink came and went. You never pressed.')
    expect(PINK_WINDOW_MS).toBeGreaterThan(REACTION_LIMIT_MS)
  })

  it('uses the later, painted start time when it is refined', () => {
    const game = refinePink(pinkAt(1000), 1012)
    expect(game.pinkAt).toBe(1012)
    expect(press(game, 1240).last.ms).toBe(228)
  })

  it('never moves the start time earlier or outside pink', () => {
    const game = pinkAt(1000)
    expect(refinePink(game, 900)).toBe(game)
    const result = press(game, 1100)
    expect(refinePink(result, 2000)).toBe(result)
  })

  it('treats a press as a one-off: a second press does nothing', () => {
    const done = press(pinkAt(1000), 1100)
    expect(press(done, 1150)).toBe(done)
  })
})

describe('three tries', () => {
  const fail = (game) => press(startAttempt(game), 500) // too early: a quick way to fail a try

  it('lets you fail twice and still win on the third', () => {
    let game = fail(createGame())
    expect(game.status).toBe('playing')
    expect(triesLeft(game)).toBe(2)
    game = fail(game)
    expect(game.status).toBe('playing')
    expect(triesLeft(game)).toBe(1)
    game = showPink(startAttempt(game), 5000)
    game = press(game, 5200)
    expect(game.status).toBe('won')
    expect(game.attempt).toBe(3)
    expect(game.tries.map((t) => t.ok)).toEqual([false, false, true])
  })

  it('loses after the third failed try', () => {
    let game = createGame()
    for (let i = 0; i < 3; i++) {
      game = fail(game)
    }
    expect(game.status).toBe('lost')
    expect(game.tries).toHaveLength(3)
    expect(triesLeft(game)).toBe(0)
  })

  it('counts every kind of failure as a try', () => {
    let game = fail(createGame()) // too soon
    game = press(showColor(startAttempt(game), RED), 1) // wrong colour
    game = miss(showPink(startAttempt(game), 0)) // missed
    expect(game.status).toBe('lost')
    expect(game.tries.map((t) => t.reason)).toEqual(['early', 'wrong-color', 'missed'])
  })

  it('stops the moment it is won or lost', () => {
    const won = press(pinkAt(0), 100)
    expect(startAttempt(won)).toBe(won)
    expect(press(won, 200)).toBe(won)

    let lost = createGame()
    for (let i = 0; i < 3; i++) {
      lost = fail(lost)
    }
    expect(startAttempt(lost)).toBe(lost)
  })

  it('will not start a try while one is running', () => {
    const running = startAttempt(createGame())
    expect(startAttempt(running)).toBe(running)
    const pink = pinkAt()
    expect(startAttempt(pink)).toBe(pink)
  })

  it('clears the colour and pink time for the next try', () => {
    const next = startAttempt(press(pinkAt(1000), 1400))
    expect(next).toMatchObject({ phase: 'warmup', color: null, pinkAt: null, last: null, attempt: 2 })
  })
})
