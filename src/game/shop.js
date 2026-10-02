/**
 * Mini games a team can gamble on. Playing is free; the team wagers points on the result,
 * anywhere from minWager to maxWager in `step`s, but never more than the points it has.
 */
export const SHOP_ITEMS = [
  {
    id: 'blackjack',
    name: 'Blackjack',
    description: 'Beat the dealer to win your wager. Lose and you drop it. A tie is a push.',
    minWager: 100,
    maxWager: 1000,
    step: 100,
  },
  {
    id: 'roulette',
    name: 'Roulette',
    description:
      'Bet on a number or a zone, then watch the wheel. Smaller zones pay much more, and every payout is shown before you spin.',
    minWager: 50,
    maxWager: 200,
    step: 50,
  },
  {
    id: 'slots',
    name: 'Slot Machine',
    description:
      'Spin three reels. Win 38% of spins, break even on 32%. Rarer wins pay more, up to 5 to 1 on triple sevens. The full pay table is shown before you spin.',
    minWager: 50,
    maxWager: 200,
    step: 50,
  },
]

export function getShopItem(itemId) {
  return SHOP_ITEMS.find((item) => item.id === itemId)
}

/**
 * Highest wager a team may place: the game's maximum, capped at the team's score and rounded
 * down to a legal step. Returns 0 when the team can't cover the minimum wager.
 */
export function wagerLimit(item, score) {
  if (score < item.minWager) {
    return 0
  }
  const affordable = item.minWager + Math.floor((score - item.minWager) / item.step) * item.step
  return Math.min(item.maxWager, affordable)
}
