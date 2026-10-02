import { describe, expect, it } from 'vitest'
import {
  canPlayFinal,
  clampDailyDoubleWager,
  clampFinalWager,
  formatMoney,
  maxDailyDoubleWager,
} from './scoring.js'

describe('Daily Double wagers', () => {
  it('caps at the round top value when the score is lower', () => {
    expect(maxDailyDoubleWager(200, 1000)).toBe(1000)
  })

  it('caps at the score when it exceeds the round top value', () => {
    expect(maxDailyDoubleWager(4000, 1000)).toBe(4000)
  })

  it('clamps to the $5 minimum and the maximum', () => {
    expect(clampDailyDoubleWager(1, 500, 1000)).toBe(5)
    expect(clampDailyDoubleWager(5000, 500, 1000)).toBe(1000)
    expect(clampDailyDoubleWager('abc', 500, 1000)).toBe(5)
  })
})

describe('Final Jeopardy wagers', () => {
  it('only lets positive scores play', () => {
    expect(canPlayFinal(1)).toBe(true)
    expect(canPlayFinal(0)).toBe(false)
    expect(canPlayFinal(-100)).toBe(false)
  })

  it('clamps between zero and the score', () => {
    expect(clampFinalWager(-5, 800)).toBe(0)
    expect(clampFinalWager(900, 800)).toBe(800)
    expect(clampFinalWager(250, 800)).toBe(250)
  })
})

describe('formatMoney', () => {
  it('formats positive and negative amounts', () => {
    expect(formatMoney(1200)).toBe('$1,200')
    expect(formatMoney(-400)).toBe('-$400')
  })
})
