import { describe, expect, it } from 'vitest'
import {
  OUTCOMES,
  REEL_COUNT,
  evaluate,
  expectedReturn,
  payTable,
  payoutFor,
  pickOutcome,
  reelProgress,
  reelsFor,
  resultRates,
  spinReels,
} from './slots.js'

/** An rng that returns `first`, then walks a fixed cycle so every branch of reelsFor is hit. */
function rngFrom(first, step) {
  let calls = 0
  let value = step
  return () => {
    calls += 1
    if (calls === 1) {
      return first
    }
    value = (value + step) % 1
    return value
  }
}

describe('outcome table', () => {
  it('has chances that add up to one', () => {
    expect(OUTCOMES.reduce((sum, o) => sum + o.chance, 0)).toBeCloseTo(1, 10)
  })

  it('wins 38% of the time, breaks even 32% and loses 30%', () => {
    const rates = resultRates()
    expect(rates.win).toBeCloseTo(0.38, 10)
    expect(rates.push).toBeCloseTo(0.32, 10)
    expect(rates.lose).toBeCloseTo(0.3, 10)
  })

  it('has a small house edge: it returns 95-100% of wagers over time', () => {
    const edge = expectedReturn()
    expect(edge).toBeLessThan(0)
    expect(edge).toBeGreaterThan(-0.05)
  })

  it('never pays more than the top clue on the board, even at the biggest wager', () => {
    const biggestWager = 200
    const topClue = 1000
    for (const outcome of OUTCOMES) {
      expect(outcome.multiplier * biggestWager).toBeLessThanOrEqual(topClue)
    }
  })

  it('pays less the more often a win happens', () => {
    const wins = OUTCOMES.filter((o) => o.multiplier > 0)
    for (const a of wins) {
      for (const b of wins) {
        if (a.chance < b.chance) {
          expect(a.multiplier).toBeGreaterThanOrEqual(b.multiplier)
        }
      }
    }
  })

  it('pays more for rarer three-of-a-kinds', () => {
    const threes = OUTCOMES.filter((o) => o.kind === 'three')
    for (let i = 1; i < threes.length; i++) {
      expect(threes[i].chance).toBeGreaterThanOrEqual(threes[i - 1].chance)
      expect(threes[i].multiplier).toBeLessThanOrEqual(threes[i - 1].multiplier)
    }
  })
})

describe('pickOutcome', () => {
  it('walks the table in order', () => {
    expect(pickOutcome(0).id).toBe('three-seven')
    expect(pickOutcome(0.2).id).toBe('cherries')
    expect(pickOutcome(0.5).id).toBe('cherry')
    expect(pickOutcome(0.9).id).toBe('none')
    expect(pickOutcome(0.999999).id).toBe('none')
  })

  it('produces the advertised rates across the whole roll range', () => {
    const counts = { win: 0, push: 0, lose: 0 }
    const rolls = 100000
    for (let i = 0; i < rolls; i++) {
      const { multiplier } = pickOutcome((i + 0.5) / rolls)
      counts[multiplier > 0 ? 'win' : multiplier === 0 ? 'push' : 'lose'] += 1
    }
    expect(counts.win / rolls).toBeCloseTo(0.38, 3)
    expect(counts.push / rolls).toBeCloseTo(0.32, 3)
    expect(counts.lose / rolls).toBeCloseTo(0.3, 3)
  })
})

describe('reelsFor', () => {
  it('shows reels that score as the outcome that was picked, for every outcome', () => {
    for (const outcome of OUTCOMES) {
      for (const step of [0.07, 0.31, 0.53, 0.77, 0.91]) {
        const reels = reelsFor(outcome, rngFrom(0, step))
        expect(reels).toHaveLength(REEL_COUNT)
        const scored = evaluate(reels)
        expect(scored.kind).toBe(outcome.kind)
        expect(scored.multiplier).toBe(outcome.multiplier)
      }
    }
  })

  it('never shows a lone cherry or a triple on a losing spin', () => {
    const none = OUTCOMES.find((o) => o.id === 'none')
    for (let i = 0; i < 200; i++) {
      const reels = reelsFor(none, rngFrom(0, ((i * 37) % 100) / 100 + 0.003))
      expect(reels).not.toContain('cherry')
      expect(new Set(reels).size).toBeGreaterThan(1)
    }
  })

  it('shows distinct fillers beside a single cherry', () => {
    const one = OUTCOMES.find((o) => o.id === 'cherry')
    for (let i = 0; i < 200; i++) {
      const reels = reelsFor(one, rngFrom(0, ((i * 41) % 100) / 100 + 0.003))
      const others = reels.filter((id) => id !== 'cherry')
      expect(others).toHaveLength(2)
      expect(others[0]).not.toBe(others[1])
    }
  })
})

describe('spinReels', () => {
  it('spins one symbol per reel', () => {
    expect(spinReels()).toHaveLength(REEL_COUNT)
  })

  it('lands on three sevens for the lowest roll', () => {
    expect(spinReels(() => 0)).toEqual(['seven', 'seven', 'seven'])
  })
})

describe('evaluate', () => {
  it('pays the symbol multiplier for three of a kind', () => {
    expect(evaluate(['seven', 'seven', 'seven']).multiplier).toBe(5)
    expect(evaluate(['bell', 'bell', 'bell']).multiplier).toBe(1.5)
    expect(evaluate(['cherry', 'cherry', 'cherry']).multiplier).toBe(1)
    expect(evaluate(['lemon', 'lemon', 'lemon']).label).toBe('Three Lemons')
    expect(evaluate(['cherry', 'cherry', 'cherry']).label).toBe('Three Cherries')
  })

  it('pays half the wager for exactly two cherries, in any position', () => {
    for (const reels of [
      ['cherry', 'cherry', 'lemon'],
      ['cherry', 'lemon', 'cherry'],
      ['lemon', 'cherry', 'cherry'],
    ]) {
      expect(evaluate(reels)).toMatchObject({ kind: 'cherries', multiplier: 0.5 })
    }
  })

  it('returns the wager for a single cherry', () => {
    expect(evaluate(['lemon', 'cherry', 'bell'])).toMatchObject({ kind: 'cherry', multiplier: 0 })
  })

  it('loses the wager otherwise', () => {
    expect(evaluate(['lemon', 'bell', 'star'])).toMatchObject({ kind: 'none', multiplier: -1 })
    expect(evaluate(['lemon', 'lemon', 'bell']).multiplier).toBe(-1)
  })
})

describe('payoutFor', () => {
  it('scales with the wager', () => {
    expect(payoutFor(['seven', 'seven', 'seven'], 200)).toBe(1000)
    expect(payoutFor(['cherry', 'cherry', 'bell'], 100)).toBe(50)
    expect(payoutFor(['cherry', 'bell', 'star'], 100)).toBe(0)
    expect(payoutFor(['bell', 'star', 'lemon'], 150)).toBe(-150)
  })

  it('always pays whole points at the shop wager steps', () => {
    for (const outcome of OUTCOMES) {
      for (const wager of [50, 100, 150, 200]) {
        expect(Number.isInteger(outcome.multiplier * wager)).toBe(true)
      }
    }
  })
})

describe('payTable', () => {
  it('lists every outcome once with glyphs and a label', () => {
    const rows = payTable()
    expect(rows).toHaveLength(OUTCOMES.length)
    for (const row of rows) {
      expect(row.glyphs).toHaveLength(REEL_COUNT)
      expect(row.label).toBeTruthy()
    }
  })

  it('agrees with evaluate on each row', () => {
    const rows = Object.fromEntries(payTable().map((r) => [r.id, r.multiplier]))
    expect(rows['three-seven']).toBe(evaluate(['seven', 'seven', 'seven']).multiplier)
    expect(rows.cherries).toBe(evaluate(['cherry', 'cherry', 'lemon']).multiplier)
    expect(rows.none).toBe(evaluate(['lemon', 'bell', 'star']).multiplier)
  })
})

describe('reelProgress', () => {
  it('starts at 0 and ends exactly at 1', () => {
    expect(reelProgress(0)).toBeCloseTo(0, 10)
    expect(reelProgress(1)).toBe(1)
  })

  it('overshoots slightly before settling', () => {
    const peak = Math.max(...Array.from({ length: 100 }, (_, i) => reelProgress(i / 100)))
    expect(peak).toBeGreaterThan(1)
    expect(peak).toBeLessThan(1.1)
  })
})
