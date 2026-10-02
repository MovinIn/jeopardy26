import { describe, expect, it } from 'vitest'
import { getClueAmounts } from './scoring.js'

describe('getClueAmounts', () => {
  it('returns base win and loss when hint not used', () => {
    expect(getClueAmounts(500, false)).toEqual({ win: 500, loss: 500 })
  })

  it('returns reduced win and increased loss when hint used on $500 clue', () => {
    expect(getClueAmounts(500, true)).toEqual({ win: 400, loss: 600 })
  })

  it('returns adjusted amounts when hint used on $200 clue', () => {
    expect(getClueAmounts(200, true)).toEqual({ win: 100, loss: 300 })
  })
})
