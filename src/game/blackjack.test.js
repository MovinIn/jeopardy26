import { describe, expect, it } from 'vitest'
import { handValue, hit, isNaturalBlackjack, newGame, scoreDelta, stand } from './blackjack.js'

const c = (rank, suit = '♠') => ({ rank, suit })

function game(player, dealer, deck = []) {
  return { deck, player, dealer, status: 'player', outcome: null, message: '' }
}

describe('handValue', () => {
  it('counts face cards as 10', () => {
    expect(handValue([c('K'), c('Q')])).toBe(20)
  })

  it('counts an ace as 11 unless that busts', () => {
    expect(handValue([c('A'), c('6')])).toBe(17)
    expect(handValue([c('A'), c('6'), c('9')])).toBe(16)
    expect(handValue([c('A'), c('A'), c('9')])).toBe(21)
  })
})

describe('isNaturalBlackjack', () => {
  it('needs exactly two cards totalling 21', () => {
    expect(isNaturalBlackjack([c('A'), c('K')])).toBe(true)
    expect(isNaturalBlackjack([c('7'), c('7'), c('7')])).toBe(false)
  })
})

describe('newGame', () => {
  it('deals two cards each from a full deck', () => {
    const g = newGame(() => 0.3)
    expect(g.player).toHaveLength(2)
    expect(g.dealer).toHaveLength(2)
    expect(g.deck).toHaveLength(48)
  })
})

describe('hit', () => {
  it('loses on a bust', () => {
    const next = hit(game([c('10'), c('9')], [c('7'), c('8')], [c('5')]))
    expect(next.status).toBe('done')
    expect(next.outcome).toBe('lose')
  })

  it('keeps playing below 21', () => {
    const next = hit(game([c('2'), c('3')], [c('7'), c('8')], [c('4')]))
    expect(next.status).toBe('player')
    expect(next.player).toHaveLength(3)
  })

  it('stands automatically on 21', () => {
    const next = hit(game([c('5'), c('6')], [c('10'), c('9')], [c('10')]))
    expect(next.status).toBe('done')
    expect(next.outcome).toBe('win')
  })
})

describe('stand', () => {
  it('has the dealer draw to 17 and wins when the dealer busts', () => {
    const next = stand(game([c('10'), c('8')], [c('10'), c('6')], [c('9')]))
    expect(next.outcome).toBe('win')
  })

  it('dealer stands on 17 and a higher player hand wins', () => {
    const next = stand(game([c('10'), c('8')], [c('10'), c('7')]))
    expect(next.dealer).toHaveLength(2)
    expect(next.outcome).toBe('win')
  })

  it('loses to a higher dealer hand', () => {
    const next = stand(game([c('10'), c('7')], [c('10'), c('9')]))
    expect(next.outcome).toBe('lose')
  })

  it('pushes on a tie', () => {
    const next = stand(game([c('10'), c('8')], [c('9'), c('9')]))
    expect(next.outcome).toBe('push')
  })

  it('ignores actions once the hand is over', () => {
    const done = stand(game([c('10'), c('8')], [c('9'), c('9')]))
    expect(stand(done)).toBe(done)
    expect(hit(done)).toBe(done)
  })
})

describe('scoreDelta', () => {
  it('is +200 for a win, -200 for a loss, 0 for a push', () => {
    expect(scoreDelta('win')).toBe(200)
    expect(scoreDelta('lose')).toBe(-200)
    expect(scoreDelta('push')).toBe(0)
  })
})
