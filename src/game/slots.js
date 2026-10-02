/**
 * Three-reel slot machine.
 *
 * Each spin first picks an outcome from OUTCOMES (so the win, break-even and lose rates are
 * exactly what the table says), then shows reels that match it.
 *
 *   win 38%  ·  break even 32% (a single cherry returns the wager)  ·  lose 30%
 *
 * Payouts follow the odds: the likelier a win, the less it pays, and the rarest pays 5 to 1, so
 * even the biggest wager can't win more than the top clue on the board ($1,000). That keeps the
 * machine close to fair (see expectedReturn).
 */

export const SYMBOLS = [
  { id: 'cherry', glyph: '🍒', label: 'Cherry', plural: 'Cherries' },
  { id: 'lemon', glyph: '🍋', label: 'Lemon', plural: 'Lemons' },
  { id: 'bell', glyph: '🔔', label: 'Bell', plural: 'Bells' },
  { id: 'star', glyph: '⭐', label: 'Star', plural: 'Stars' },
  { id: 'diamond', glyph: '💎', label: 'Diamond', plural: 'Diamonds' },
  { id: 'seven', glyph: '7️⃣', label: 'Seven', plural: 'Sevens' },
]

export const REEL_COUNT = 3

/**
 * Every way a spin can end. `multiplier` is profit per point wagered: positive wins,
 * 0 breaks even, -1 loses the wager. Chances add up to 1.
 */
export const OUTCOMES = [
  { id: 'three-seven', kind: 'three', symbol: 'seven', chance: 0.001, multiplier: 5 },
  { id: 'three-diamond', kind: 'three', symbol: 'diamond', chance: 0.005, multiplier: 4 },
  { id: 'three-star', kind: 'three', symbol: 'star', chance: 0.012, multiplier: 3 },
  { id: 'three-bell', kind: 'three', symbol: 'bell', chance: 0.022, multiplier: 1.5 },
  { id: 'three-cherry', kind: 'three', symbol: 'cherry', chance: 0.03, multiplier: 1 },
  { id: 'three-lemon', kind: 'three', symbol: 'lemon', chance: 0.03, multiplier: 0.5 },
  { id: 'cherries', kind: 'cherries', chance: 0.28, multiplier: 0.5 },
  { id: 'cherry', kind: 'cherry', chance: 0.32, multiplier: 0 },
  { id: 'none', kind: 'none', chance: 0.3, multiplier: -1 },
]

export function getSymbol(id) {
  return SYMBOLS.find((s) => s.id === id)
}

function outcomeById(id) {
  return OUTCOMES.find((o) => o.id === id)
}

/** Maps a roll in [0, 1) onto an outcome, in table order. */
export function pickOutcome(roll) {
  let remaining = roll
  for (const outcome of OUTCOMES) {
    remaining -= outcome.chance
    if (remaining < 0) {
      return outcome
    }
  }
  return OUTCOMES[OUTCOMES.length - 1]
}

// Symbols used to fill the reels around a cherry or in a loss, commonest first.
const FILLER = [
  { id: 'lemon', weight: 35 },
  { id: 'bell', weight: 30 },
  { id: 'star', weight: 20 },
  { id: 'diamond', weight: 10 },
  { id: 'seven', weight: 5 },
]

function pickFiller(rng, exclude = []) {
  const options = FILLER.filter((f) => !exclude.includes(f.id))
  const total = options.reduce((sum, f) => sum + f.weight, 0)
  let roll = rng() * total
  for (const option of options) {
    roll -= option.weight
    if (roll < 0) {
      return option.id
    }
  }
  return options[options.length - 1].id
}

/** Reels that evaluate() will score as the given outcome. */
export function reelsFor(outcome, rng = Math.random) {
  if (outcome.kind === 'three') {
    return [outcome.symbol, outcome.symbol, outcome.symbol]
  }
  if (outcome.kind === 'cherries') {
    const odd = Math.floor(rng() * REEL_COUNT)
    const filler = pickFiller(rng)
    return Array.from({ length: REEL_COUNT }, (_, i) => (i === odd ? filler : 'cherry'))
  }
  if (outcome.kind === 'cherry') {
    const at = Math.floor(rng() * REEL_COUNT)
    const first = pickFiller(rng)
    const second = pickFiller(rng, [first])
    const others = [first, second]
    return Array.from({ length: REEL_COUNT }, (_, i) =>
      i === at ? 'cherry' : others[i < at ? i : i - 1],
    )
  }
  // A loss: no cherries and not three alike (a near-miss pair is fine).
  const a = pickFiller(rng)
  const b = pickFiller(rng)
  const c = a === b ? pickFiller(rng, [a]) : pickFiller(rng)
  return [a, b, c]
}

export function spinReels(rng = Math.random) {
  return reelsFor(pickOutcome(rng()), rng)
}

/**
 * Scores a set of reels. `kind` says which rule applied so the UI can explain it.
 * Three of a kind pays that symbol's multiplier; exactly two cherries and exactly one cherry
 * have their own; anything else loses.
 */
export function evaluate(reels) {
  if (reels.every((id) => id === reels[0])) {
    const outcome = outcomeById(`three-${reels[0]}`)
    return {
      kind: 'three',
      multiplier: outcome.multiplier,
      label: `Three ${getSymbol(reels[0]).plural}`,
    }
  }
  const cherries = reels.filter((id) => id === 'cherry').length
  if (cherries === 2) {
    return { kind: 'cherries', multiplier: outcomeById('cherries').multiplier, label: 'Two cherries' }
  }
  if (cherries === 1) {
    return { kind: 'cherry', multiplier: outcomeById('cherry').multiplier, label: 'One cherry' }
  }
  return { kind: 'none', multiplier: outcomeById('none').multiplier, label: 'No match' }
}

/** Net points change for one spin at the given wager. */
export function payoutFor(reels, wager) {
  return evaluate(reels).multiplier * wager
}

/** Every outcome in pay-table order, with the glyphs to show and its label. */
export function payTable() {
  return OUTCOMES.map((outcome) => {
    if (outcome.kind === 'three') {
      const symbol = getSymbol(outcome.symbol)
      return {
        ...outcome,
        glyphs: [symbol.glyph, symbol.glyph, symbol.glyph],
        label: `Three ${symbol.plural}`,
      }
    }
    if (outcome.kind === 'cherries') {
      return { ...outcome, glyphs: ['🍒', '🍒', '·'], label: 'Any two cherries' }
    }
    if (outcome.kind === 'cherry') {
      return { ...outcome, glyphs: ['🍒', '·', '·'], label: 'Any one cherry (wager back)' }
    }
    return { ...outcome, glyphs: ['·', '·', '·'], label: 'No match' }
  })
}

/** Chance of each result type: winning, breaking even, losing. */
export function resultRates() {
  const rates = { win: 0, push: 0, lose: 0 }
  for (const outcome of OUTCOMES) {
    if (outcome.multiplier > 0) {
      rates.win += outcome.chance
    } else if (outcome.multiplier === 0) {
      rates.push += outcome.chance
    } else {
      rates.lose += outcome.chance
    }
  }
  return rates
}

/** Average profit per point wagered across all outcomes (slightly negative: the house edge). */
export function expectedReturn() {
  return OUTCOMES.reduce((sum, o) => sum + o.chance * o.multiplier, 0)
}

export const REEL_SPIN_MS = [2200, 3200, 4200]
/** Full trips round the strip each reel makes, so faster-stopping reels still look fast. */
export const REEL_LOOPS = [5, 7, 9]

function easeOutBack(u) {
  const c1 = 0.9
  const c3 = c1 + 1
  return 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2
}

/** How far a reel has travelled (0 to 1 of its trip) at progress u, with a small settle bounce. */
export function reelProgress(u) {
  if (u >= 1) {
    return 1
  }
  return easeOutBack(Math.max(0, u))
}
