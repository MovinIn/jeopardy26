export const MIN_WAGER = 5

/** Daily Double cap: the player's score or the round's top clue value, whichever is higher. */
export function maxDailyDoubleWager(score, roundMaxValue) {
  return Math.max(score, roundMaxValue)
}

export function clampDailyDoubleWager(amount, score, roundMaxValue) {
  const n = Math.floor(Number(amount))
  if (!Number.isFinite(n)) {
    return MIN_WAGER
  }
  return Math.min(Math.max(n, MIN_WAGER), maxDailyDoubleWager(score, roundMaxValue))
}

/** Final Jeopardy: only positive scores play, and you may wager up to your whole score. */
export function canPlayFinal(score) {
  return score > 0
}

export function clampFinalWager(amount, score) {
  const n = Math.floor(Number(amount))
  if (!Number.isFinite(n)) {
    return 0
  }
  return Math.min(Math.max(n, 0), Math.max(score, 0))
}

export function formatMoney(amount) {
  const abs = Math.abs(amount).toLocaleString('en-US')
  return amount < 0 ? `-$${abs}` : `$${abs}`
}
