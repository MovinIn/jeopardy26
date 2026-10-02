import { describe, expect, it } from 'vitest'
import { SHOP_ITEMS, getShopItem, wagerLimit } from './shop.js'

const blackjack = getShopItem('blackjack') // $100 to $1,000 in $100 steps
const roulette = getShopItem('roulette') // $50 to $200 in $50 steps

describe('wagerLimit', () => {
  it('is the game maximum when the team can afford it', () => {
    expect(wagerLimit(blackjack, 5000)).toBe(1000)
    expect(wagerLimit(roulette, 200)).toBe(200)
  })

  it('never exceeds the points the team has', () => {
    expect(wagerLimit(blackjack, 600)).toBe(600)
    expect(wagerLimit(roulette, 100)).toBe(100)
  })

  it('rounds down to a legal step', () => {
    expect(wagerLimit(blackjack, 650)).toBe(600)
    expect(wagerLimit(roulette, 175)).toBe(150)
  })

  it('is zero when the team cannot cover the minimum wager', () => {
    expect(wagerLimit(blackjack, 99)).toBe(0)
    expect(wagerLimit(roulette, 49)).toBe(0)
    expect(wagerLimit(blackjack, 0)).toBe(0)
    expect(wagerLimit(blackjack, -300)).toBe(0)
  })

  it('always returns a wager the team can pay, for every item', () => {
    for (const item of SHOP_ITEMS) {
      for (let score = -100; score <= 3000; score += 25) {
        const limit = wagerLimit(item, score)
        expect(limit).toBeLessThanOrEqual(Math.max(score, 0))
        expect(limit === 0 || limit >= item.minWager).toBe(true)
      }
    }
  })
})
