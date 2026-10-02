/**
 * Typing test. Type the passage exactly as written, and fast enough to keep up with 80 words a
 * minute. The passage is 40 words, so 80 WPM means finishing in 30 seconds; the clock starts on
 * the first key, and if time runs out before the passage is typed correctly the game is lost.
 */

export const PASSAGE =
  'In a quiet town by the sea, the old clock tower rang at noon while fishermen mended their nets and children raced along the pier, laughing in the bright salty wind as gulls circled overhead and the harbor bell chimed.'

export const WORDS = PASSAGE.split(' ').length
export const TARGET_WPM = 80
export const TIME_LIMIT_MS = (WORDS / TARGET_WPM) * 60000

/** Words per minute for `words` typed in `ms` milliseconds. */
export function wordsPerMinute(words, ms) {
  return ms > 0 ? words / (ms / 60000) : 0
}

/**
 * Where an 80 WPM typist would be after `ms`, as a count of characters into the passage.
 * This is what the pace marker on screen follows.
 */
export function paceIndex(ms) {
  const fraction = Math.max(0, ms) / TIME_LIMIT_MS
  return Math.min(PASSAGE.length, Math.floor(fraction * PASSAGE.length))
}

/** How many characters from the start match the passage, stopping at the first mistake. */
export function correctPrefix(typed) {
  let i = 0
  while (i < typed.length && i < PASSAGE.length && typed[i] === PASSAGE[i]) {
    i += 1
  }
  return i
}

/** Words typed correctly so far, counted fractionally by characters. */
export function wordsDone(typed) {
  return (correctPrefix(typed) / PASSAGE.length) * WORDS
}

/** Which word of the passage you have got to (the one you are typing, if it is typed correctly). */
export function wordsReached(typed) {
  const prefix = correctPrefix(typed)
  return prefix === 0 ? 0 : PASSAGE.slice(0, prefix).split(' ').length
}

/**
 * status: 'ready' (waiting for the first key) | 'playing' | 'won' | 'lost'
 * `finishedMs` is how long the run took once it ends; `reason` is 'time' for a loss.
 */
export function createGame() {
  return { typed: '', startedAt: null, status: 'ready', finishedMs: null, reason: null }
}

/**
 * A key press at time `now` (ms). A single character is typed, 'Backspace' deletes the last one,
 * and the first character starts the clock. Typing the whole passage correctly ends the game:
 * a win if it was done within the time limit.
 */
export function typeKey(game, key, now) {
  if (game.status === 'won' || game.status === 'lost') {
    return game
  }
  const isBackspace = key === 'Backspace'
  if (!isBackspace && key.length !== 1) {
    return game
  }

  let current = game
  if (game.status === 'ready') {
    if (isBackspace) {
      return game
    }
    current = { ...game, status: 'playing', startedAt: now }
  }

  let typed = current.typed
  if (isBackspace) {
    typed = typed.slice(0, -1)
  } else if (typed.length < PASSAGE.length) {
    typed += key
  }

  if (typed !== PASSAGE) {
    return { ...current, typed }
  }
  const elapsed = now - current.startedAt
  if (elapsed <= TIME_LIMIT_MS) {
    return { ...current, typed, status: 'won', finishedMs: elapsed }
  }
  return { ...current, typed, status: 'lost', finishedMs: elapsed, reason: 'time' }
}

/** Moves the start time forward by `ms`, so time spent on another tab is not held against the typist. */
export function shiftClock(game, ms) {
  if (game.status !== 'playing' || !(ms > 0)) {
    return game
  }
  return { ...game, startedAt: game.startedAt + ms }
}

/** Ends the game as lost once the time limit has passed. */
export function tick(game, now) {
  if (game.status !== 'playing' || now - game.startedAt <= TIME_LIMIT_MS) {
    return game
  }
  return { ...game, status: 'lost', finishedMs: TIME_LIMIT_MS, reason: 'time' }
}
