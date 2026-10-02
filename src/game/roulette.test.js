import { describe, expect, it } from 'vitest'
import {
  OUTSIDE_BETS,
  isValidRange,
  rangeMultiplier,
  resolveBet,
  POCKET_COUNT,
  POCKET_RADIUS,
  STRAIGHT_MULTIPLIER,
  TRACK_RADIUS,
  WHEEL_ORDER,
  betWins,
  colorOf,
  payoutFor,
  pocketAngle,
  spinFrame,
  spinWheel,
  winAmount,
  winChance,
} from './roulette.js'

describe('wheel layout', () => {
  it('has every number 0-36 exactly once', () => {
    expect([...WHEEL_ORDER].sort((a, b) => a - b)).toEqual(Array.from({ length: 37 }, (_, i) => i))
  })

  it('colours the pockets like a real wheel', () => {
    expect(colorOf(0)).toBe('green')
    expect(colorOf(32)).toBe('red')
    expect(colorOf(15)).toBe('black')
    const counts = { red: 0, black: 0, green: 0 }
    WHEEL_ORDER.forEach((n) => (counts[colorOf(n)] += 1))
    expect(counts).toEqual({ red: 18, black: 18, green: 1 })
  })

  it('alternates red and black around the wheel', () => {
    for (let i = 1; i < POCKET_COUNT - 1; i++) {
      expect(colorOf(WHEEL_ORDER[i])).not.toBe(colorOf(WHEEL_ORDER[i + 1]))
    }
  })
})

describe('spinWheel', () => {
  it('maps the random range onto 0-36', () => {
    expect(spinWheel(() => 0)).toBe(0)
    expect(spinWheel(() => 0.999999)).toBe(36)
  })
})

describe('bets', () => {
  it('covers the right pockets', () => {
    const byId = Object.fromEntries(OUTSIDE_BETS.map((b) => [b.id, b]))
    expect(byId.red.numbers).toHaveLength(18)
    expect(byId.black.numbers).toHaveLength(18)
    expect(byId.odd.numbers).toHaveLength(18)
    expect(byId.low.numbers).toHaveLength(18)
    expect(byId.dozen2.numbers).toEqual([13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24])
    expect(byId.even.numbers).not.toContain(0)
  })

  it('never lets the zero win an outside bet, except the green zero itself', () => {
    for (const bet of OUTSIDE_BETS.filter((b) => b.id !== 'green')) {
      expect(betWins({ id: bet.id }, 0)).toBe(false)
    }
    expect(betWins({ id: 'green' }, 0)).toBe(true)
    expect(betWins({ id: 'straight', number: 0 }, 0)).toBe(true)
  })

  it('pays true odds: 36 divided by the pockets covered, minus the stake', () => {
    for (const bet of OUTSIDE_BETS) {
      expect(bet.multiplier).toBe(rangeMultiplier(bet.numbers.length))
    }
    expect(STRAIGHT_MULTIPLIER).toBe(rangeMultiplier(1))
    expect(STRAIGHT_MULTIPLIER).toBe(35)
  })

  it('covers the three columns', () => {
    const byId = Object.fromEntries(OUTSIDE_BETS.map((b) => [b.id, b]))
    expect(byId.col1.numbers.slice(0, 4)).toEqual([1, 4, 7, 10])
    expect(byId.col3.numbers.slice(-2)).toEqual([33, 36])
    expect([...byId.col1.numbers, ...byId.col2.numbers, ...byId.col3.numbers]).toHaveLength(36)
  })

  it('bets on a custom range of numbers', () => {
    const bet = { id: 'range', from: 7, to: 12 }
    expect(resolveBet(bet)).toMatchObject({ label: '7–12', multiplier: 5 })
    expect(resolveBet(bet).numbers).toEqual([7, 8, 9, 10, 11, 12])
    expect(betWins(bet, 9)).toBe(true)
    expect(betWins(bet, 13)).toBe(false)
    expect(winAmount(bet, 100)).toBe(500)
    expect(winChance(bet)).toBeCloseTo(6 / 37)
    expect(payoutFor(bet, 20, 100)).toBe(-100)
  })

  it('only accepts sensible custom ranges', () => {
    expect(isValidRange(7, 12)).toBe(true)
    expect(isValidRange(1, 18)).toBe(true)
    expect(isValidRange(5, 5)).toBe(false) // one number is a straight bet
    expect(isValidRange(1, 19)).toBe(false) // would pay nothing
    expect(isValidRange(0, 5)).toBe(false)
    expect(isValidRange(30, 37)).toBe(false)
    expect(isValidRange(12, 7)).toBe(false)
    expect(isValidRange(1.5, 6)).toBe(false)
    expect(isValidRange(NaN, 6)).toBe(false)
  })

  it('never lets a custom range beat the house edge', () => {
    for (let from = 1; from <= 36; from++) {
      for (let to = from; to <= 36; to++) {
        if (!isValidRange(from, to)) {
          continue
        }
        const bet = { id: 'range', from, to }
        const edge = winChance(bet) * (resolveBet(bet).multiplier + 1) - 1
        expect(edge).toBeLessThanOrEqual(1e-9)
      }
    }
  })

  it('computes win chance and win amount', () => {
    expect(winChance({ id: 'straight', number: 7 })).toBeCloseTo(1 / 37)
    expect(winChance({ id: 'red' })).toBeCloseTo(18 / 37)
    expect(winAmount({ id: 'straight', number: 7 }, 100)).toBe(3500)
    expect(winAmount({ id: 'dozen1' }, 100)).toBe(200)
    expect(winAmount({ id: 'black' }, 150)).toBe(150)
  })
})

describe('payoutFor', () => {
  it('pays the profit on a hit and loses the wager on a miss', () => {
    expect(payoutFor({ id: 'straight', number: 17 }, 17, 100)).toBe(3500)
    expect(payoutFor({ id: 'straight', number: 17 }, 18, 100)).toBe(-100)
    expect(payoutFor({ id: 'red' }, 32, 50)).toBe(50)
    expect(payoutFor({ id: 'red' }, 0, 50)).toBe(-50)
  })
})

describe('spinFrame', () => {
  it('starts with the ball circling on the rim', () => {
    const frame = spinFrame(0, 17)
    expect(frame.wheelAngle).toBe(0)
    expect(frame.ballRadius).toBe(TRACK_RADIUS)
  })

  it('ends with the ball settled in the winning pocket', () => {
    for (const result of [0, 7, 17, 36]) {
      const end = spinFrame(1, result)
      // Ball and winning pocket line up (mod 360) and the ball sits in the pocket.
      const pocketAbs = end.wheelAngle + pocketAngle(result)
      expect((((end.ballAngle - pocketAbs) % 360) + 360) % 360).toBeCloseTo(0, 6)
      expect(end.ballRadius).toBeCloseTo(POCKET_RADIUS, 6)
    }
  })

  it('moves the ball against the wheel while it is on the rim', () => {
    const a = spinFrame(0.1, 5)
    const b = spinFrame(0.2, 5)
    expect(b.wheelAngle).toBeGreaterThan(a.wheelAngle)
    expect(b.ballAngle).toBeLessThan(a.ballAngle)
  })
})
