export const BLACKJACK_STAKE = 200

const SUITS = ['♠', '♥', '♦', '♣']
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

export function createDeck() {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })))
}

export function shuffle(deck, rng = Math.random) {
  const cards = [...deck]
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  return cards
}

/** Best total for a hand: aces count 11 unless that would bust. */
export function handValue(hand) {
  let total = 0
  let aces = 0
  for (const { rank } of hand) {
    if (rank === 'A') {
      aces += 1
      total += 11
    } else if (rank === 'J' || rank === 'Q' || rank === 'K') {
      total += 10
    } else {
      total += Number(rank)
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10
    aces -= 1
  }
  return total
}

export function isNaturalBlackjack(hand) {
  return hand.length === 2 && handValue(hand) === 21
}

function settle(game, outcome, message) {
  return { ...game, status: 'done', outcome, message }
}

/** Standard rules: dealer stands on any 17; a tie is a push. */
function compare(game) {
  const player = handValue(game.player)
  const dealer = handValue(game.dealer)
  if (dealer > 21) {
    return settle(game, 'win', 'Dealer busts. You win!')
  }
  if (player > dealer) {
    return settle(game, 'win', `${player} beats ${dealer}. You win!`)
  }
  if (player < dealer) {
    return settle(game, 'lose', `${dealer} beats ${player}. You lose.`)
  }
  return settle(game, 'push', `Both have ${player}. Push.`)
}

export function newGame(rng = Math.random) {
  const deck = shuffle(createDeck(), rng)
  const game = {
    deck: deck.slice(4),
    player: [deck[0], deck[2]],
    dealer: [deck[1], deck[3]],
    status: 'player',
    outcome: null,
    message: '',
  }

  const playerNatural = isNaturalBlackjack(game.player)
  const dealerNatural = isNaturalBlackjack(game.dealer)
  if (playerNatural && dealerNatural) {
    return settle(game, 'push', 'Both have Blackjack. Push.')
  }
  if (playerNatural) {
    return settle(game, 'win', 'Blackjack! You win!')
  }
  if (dealerNatural) {
    return settle(game, 'lose', 'Dealer has Blackjack. You lose.')
  }
  return game
}

export function hit(game) {
  if (game.status !== 'player') {
    return game
  }
  const [card, ...deck] = game.deck
  const next = { ...game, deck, player: [...game.player, card] }
  const total = handValue(next.player)
  if (total > 21) {
    return settle(next, 'lose', `Bust with ${total}. You lose.`)
  }
  if (total === 21) {
    return stand(next)
  }
  return next
}

export function stand(game) {
  if (game.status !== 'player') {
    return game
  }
  let current = game
  while (handValue(current.dealer) < 17) {
    const [card, ...deck] = current.deck
    current = { ...current, deck, dealer: [...current.dealer, card] }
  }
  return compare(current)
}

export function scoreDelta(outcome) {
  if (outcome === 'win') {
    return BLACKJACK_STAKE
  }
  if (outcome === 'lose') {
    return -BLACKJACK_STAKE
  }
  return 0
}
