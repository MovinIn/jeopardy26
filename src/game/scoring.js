const HINT_WIN_PENALTY = 100
const HINT_LOSS_PENALTY = 100

export function getClueAmounts(baseValue, hintUsed) {
  if (!hintUsed) {
    return { win: baseValue, loss: baseValue }
  }
  return {
    win: baseValue - HINT_WIN_PENALTY,
    loss: baseValue + HINT_LOSS_PENALTY,
  }
}
