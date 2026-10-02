import { BLACKJACK_STAKE } from './blackjack.js'

/** Items a team can buy. Each is a mini game played right after purchase. */
export const SHOP_ITEMS = [
  {
    id: 'blackjack',
    name: 'Blackjack',
    description: `Beat the dealer to win $${BLACKJACK_STAKE}. Lose and you drop $${BLACKJACK_STAKE}. A tie is a push.`,
    price: 100,
  },
]

export function getShopItem(itemId) {
  return SHOP_ITEMS.find((item) => item.id === itemId)
}

export function canAfford(team, item) {
  return Boolean(team && item) && team.score >= item.price
}
