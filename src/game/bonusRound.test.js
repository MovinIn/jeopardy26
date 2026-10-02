import { describe, expect, it } from 'vitest'
import {
  BONUS_MULTIPLIER_RULE,
  computeBankedTokens,
  normalizeDiceFaces,
  normalizeSlotPowerups,
  normalizeSpinnerEvents,
  parseSpinnerEvent,
  pickIndex,
} from './bonusRound.js'

describe('parseSpinnerEvent', () => {
  it('returns label and default one token when entry is a plain string', () => {
    expect(parseSpinnerEvent('Victory dance!')).toEqual({ label: 'Victory dance!', tokens: 1 })
  })

  it('returns explicit tokens when entry is an object with tokens', () => {
    expect(parseSpinnerEvent({ label: 'Jackpot', tokens: 5 })).toEqual({
      label: 'Jackpot',
      tokens: 5,
    })
  })

  it('parses leading integer from label when tokens omitted on object', () => {
    expect(parseSpinnerEvent({ label: '3 bonus chips' })).toEqual({
      label: '3 bonus chips',
      tokens: 3,
    })
  })
})

describe('normalizeSpinnerEvents', () => {
  it('maps mixed string and object entries to normalized rewards', () => {
    const result = normalizeSpinnerEvents([
      'Plain event',
      { label: 'Rich', tokens: 4 },
    ])
    expect(result).toEqual([
      { label: 'Plain event', tokens: 1 },
      { label: 'Rich', tokens: 4 },
    ])
  })

  it('returns empty list when input is missing or empty', () => {
    expect(normalizeSpinnerEvents(undefined)).toEqual([])
    expect(normalizeSpinnerEvents([])).toEqual([])
  })
})

describe('computeBankedTokens', () => {
  it('returns product of base tokens and multiplier per bonus round rule', () => {
    expect(computeBankedTokens(4, 3)).toBe(12)
    expect(BONUS_MULTIPLIER_RULE).toContain('tokens')
  })

  it('returns zero when base tokens are zero', () => {
    expect(computeBankedTokens(0, 6)).toBe(0)
  })
})

describe('normalizeSlotPowerups', () => {
  it('returns defaults when slotPowerups is omitted', () => {
    const list = normalizeSlotPowerups(undefined)
    expect(list.length).toBeGreaterThanOrEqual(3)
    expect(list[0]).toMatchObject({ id: expect.any(String), label: expect.any(String) })
  })

  it('normalizes string entries to id and label', () => {
    expect(normalizeSlotPowerups(['Free peek'])).toEqual([
      { id: 'free-peek', label: 'Free peek' },
    ])
  })
})

describe('normalizeDiceFaces', () => {
  it('returns default six-sided multipliers when diceFaces is omitted', () => {
    expect(normalizeDiceFaces(undefined)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('coerces numeric dice face values from JSON', () => {
    expect(normalizeDiceFaces([2, 4, 6])).toEqual([2, 4, 6])
  })
})

describe('pickIndex', () => {
  it('returns zero when length is one', () => {
    expect(pickIndex(1, () => 0.5)).toBe(0)
  })

  it('returns index in range for random value below one', () => {
    expect(pickIndex(4, () => 0.75)).toBe(3)
  })
})
