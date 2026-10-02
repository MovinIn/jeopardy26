/** European (single-zero) roulette: the wheel, the bets you can place, and the ball's motion. */

/** Pocket order around the wheel, clockwise from the zero. */
export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20,
  14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
]

export const POCKET_COUNT = WHEEL_ORDER.length
export const POCKET_STEP = 360 / POCKET_COUNT

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
])

export function colorOf(n) {
  if (n === 0) {
    return 'green'
  }
  return RED_NUMBERS.has(n) ? 'red' : 'black'
}

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i)

/**
 * Zones you can bet on. `multiplier` is the profit per point wagered, set to the true odds
 * so the house edge is just the zero. A zone that covers 1 in 37 pockets pays 35 to 1.
 */
export const OUTSIDE_BETS = [
  { id: 'red', label: 'Red', numbers: range(1, 36).filter((n) => colorOf(n) === 'red'), multiplier: 1 },
  { id: 'black', label: 'Black', numbers: range(1, 36).filter((n) => colorOf(n) === 'black'), multiplier: 1 },
  { id: 'odd', label: 'Odd', numbers: range(1, 36).filter((n) => n % 2 === 1), multiplier: 1 },
  { id: 'even', label: 'Even', numbers: range(1, 36).filter((n) => n % 2 === 0), multiplier: 1 },
  { id: 'low', label: '1–18', numbers: range(1, 18), multiplier: 1 },
  { id: 'high', label: '19–36', numbers: range(19, 36), multiplier: 1 },
  { id: 'green', label: 'Green (0)', numbers: [0], multiplier: 35 },
  { id: 'dozen1', label: '1st 12', numbers: range(1, 12), multiplier: 2 },
  { id: 'dozen2', label: '2nd 12', numbers: range(13, 24), multiplier: 2 },
  { id: 'dozen3', label: '3rd 12', numbers: range(25, 36), multiplier: 2 },
  { id: 'col1', label: 'Column 1', numbers: range(1, 36).filter((n) => n % 3 === 1), multiplier: 2 },
  { id: 'col2', label: 'Column 2', numbers: range(1, 36).filter((n) => n % 3 === 2), multiplier: 2 },
  { id: 'col3', label: 'Column 3', numbers: range(1, 36).filter((n) => n % 3 === 0), multiplier: 2 },
]

export const STRAIGHT_MULTIPLIER = 35

export const MIN_RANGE_SIZE = 2
export const MAX_RANGE_SIZE = 18

/** True-odds profit multiplier for a bet covering `count` pockets (36 / count, minus the stake). */
export function rangeMultiplier(count) {
  return Math.floor(36 / count) - 1
}

/** A custom range must be whole numbers within 1-36 covering 2 to 18 pockets. */
export function isValidRange(from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to > 36 || from > to) {
    return false
  }
  const size = to - from + 1
  return size >= MIN_RANGE_SIZE && size <= MAX_RANGE_SIZE
}

/** A bet is { id: 'straight', number }, { id: 'range', from, to } or { id: <outside bet id> }. */
export function resolveBet(bet) {
  if (bet.id === 'straight') {
    return {
      id: 'straight',
      label: `Number ${bet.number}`,
      numbers: [bet.number],
      multiplier: STRAIGHT_MULTIPLIER,
    }
  }
  if (bet.id === 'range') {
    const numbers = range(bet.from, bet.to)
    return {
      id: 'range',
      label: `${bet.from}–${bet.to}`,
      numbers,
      multiplier: rangeMultiplier(numbers.length),
    }
  }
  return OUTSIDE_BETS.find((b) => b.id === bet.id)
}

export function betWins(bet, result) {
  return resolveBet(bet).numbers.includes(result)
}

/** Chance (0 to 1) that a bet wins on one spin. */
export function winChance(bet) {
  return resolveBet(bet).numbers.length / POCKET_COUNT
}

/** Profit if the bet hits, e.g. a $100 wager on a dozen pays +$200. */
export function winAmount(bet, wager) {
  return wager * resolveBet(bet).multiplier
}

/** Net points change for one spin: the profit on a hit, otherwise the wager is lost. */
export function payoutFor(bet, result, wager) {
  return betWins(bet, result) ? winAmount(bet, wager) : -wager
}

export function spinWheel(rng = Math.random) {
  return Math.floor(rng() * POCKET_COUNT)
}

/** Clockwise angle (degrees, from 12 o'clock) of a number's pocket in the wheel's own frame. */
export function pocketAngle(n) {
  return WHEEL_ORDER.indexOf(n) * POCKET_STEP
}

export const WHEEL_TURNS = 4
export const BALL_TURNS = 7
export const TRACK_RADIUS = 169
export const POCKET_RADIUS = 146

function easeOut(u, power) {
  return 1 - (1 - u) ** power
}

function smoothstep(s) {
  return s * s * (3 - 2 * s)
}

/**
 * Where everything is at progress `u` (0 to 1) of a spin that ends on `result`.
 * The wheel turns clockwise and slows to a stop. The ball starts out circling the other way
 * on the rim, then loses speed, drops toward the pockets, bounces, and settles in the winning
 * pocket exactly as the wheel stops.
 */
export function spinFrame(u, result) {
  const wheelFinal = WHEEL_TURNS * 360
  const ballFinal = wheelFinal + pocketAngle(result)

  const wheelAngle = wheelFinal * easeOut(u, 3)
  const ballAngle = ballFinal + BALL_TURNS * 360 * (1 - easeOut(u, 2.2))

  let ballRadius = TRACK_RADIUS
  if (u > 0.5) {
    const s = (u - 0.5) / 0.5
    const drop = 1 - smoothstep(s)
    const bounce = 7 * Math.sin(s * Math.PI * 5) * (1 - s) ** 2
    ballRadius = POCKET_RADIUS + (TRACK_RADIUS - POCKET_RADIUS) * drop + Math.max(0, bounce)
  }

  return { wheelAngle, ballAngle, ballRadius }
}
