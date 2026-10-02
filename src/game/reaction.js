/**
 * Reaction test, with a prank. Colours flash on screen and you may only press when the screen turns
 * PINK, and within 350 ms. Press on any other colour (green, red, anything) and that try fails.
 * You get three tries; one fast enough press on pink wins, three failed tries lose.
 *
 * Random decoy colours flash first to fool you. Every try includes at least one green.
 */

export const REACTION_LIMIT_MS = 350
export const TRIES = 3
/** How long pink stays up waiting for a press before the try counts as missed. */
export const PINK_WINDOW_MS = 1500

export const PINK = { name: 'pink', hex: '#ff4fd8' }

/** Decoys: none of these is pink, though a few (violet, red) are there to be mistaken for it. */
export const DECOYS = [
  { name: 'green', hex: '#2ecc40' },
  { name: 'lime', hex: '#a6e22b' },
  { name: 'red', hex: '#e53935' },
  { name: 'orange', hex: '#ff8c1a' },
  { name: 'yellow', hex: '#ffd60a' },
  { name: 'blue', hex: '#2f6bff' },
  { name: 'cyan', hex: '#19d3da' },
  { name: 'purple', hex: '#8e3fd6' },
  { name: 'violet', hex: '#b57bff' },
  { name: 'white', hex: '#f4f4f4' },
]

const GREEN = DECOYS[0]

const between = (rng, min, max) => min + Math.floor(rng() * (max - min + 1))

/**
 * The script for one try: a quiet warm-up, then a run of decoy flashes (some of them quick
 * flickers), and finally the pink. `flashes` never contains pink and never repeats a colour back to
 * back, and it always includes green.
 */
export function makeSequence(rng = Math.random) {
  const count = between(rng, 4, 8)
  const flashes = []
  let previous = null
  for (let i = 0; i < count; i++) {
    const options = DECOYS.filter((color) => color !== previous)
    const color = options[Math.floor(rng() * options.length)]
    const flicker = rng() < 0.3
    flashes.push({ color, ms: flicker ? between(rng, 150, 260) : between(rng, 450, 1100) })
    previous = color
  }
  if (!flashes.some((flash) => flash.color === GREEN)) {
    const at = Math.floor(rng() * flashes.length)
    flashes[at] = { ...flashes[at], color: GREEN }
    // Keep no two greens or equal colours side by side after the swap.
    for (let i = 1; i < flashes.length; i++) {
      if (flashes[i].color === flashes[i - 1].color) {
        const other = DECOYS.find((c) => c !== flashes[i - 1].color && c !== (flashes[i + 1]?.color ?? null) && c !== GREEN)
        flashes[i] = { ...flashes[i], color: other }
      }
    }
  }
  return { warmupMs: between(rng, 1000, 2500), flashes }
}

/**
 * phase: 'idle' (no try running) | 'warmup' | 'flash' | 'pink' | 'result' (a try just ended)
 *        | 'interrupted' (the tab was hidden mid-try, so the try was called off)
 * status: 'ready' (nothing started) | 'playing' | 'won' | 'lost'
 * Each entry of `tries` is { ok, reason, ms, color }. `last` is the try that just ended.
 */
export function createGame() {
  return { status: 'ready', phase: 'idle', attempt: 0, color: null, pinkAt: null, tries: [], last: null }
}

export const triesLeft = (game) => TRIES - game.tries.length

/** Begin the next try (the first, or after a failed one). */
export function startAttempt(game) {
  const canStart = game.status === 'ready' || (game.status === 'playing' && game.phase === 'result')
  if (!canStart) {
    return game
  }
  return { ...game, status: 'playing', phase: 'warmup', attempt: game.attempt + 1, color: null, pinkAt: null, last: null }
}

/** A decoy colour appears. */
export function showColor(game, color) {
  if (game.phase !== 'warmup' && game.phase !== 'flash') {
    return game
  }
  return { ...game, phase: 'flash', color }
}

/** The screen turns pink at time `now` (ms). */
export function showPink(game, now) {
  if (game.phase !== 'warmup' && game.phase !== 'flash') {
    return game
  }
  return { ...game, phase: 'pink', color: PINK, pinkAt: now }
}

/** Moves the pink start time to when it was really painted, so a late frame never costs the player. */
export function refinePink(game, now) {
  if (game.phase !== 'pink' || now <= game.pinkAt) {
    return game
  }
  return { ...game, pinkAt: now }
}

function finish(game, last) {
  const tries = [...game.tries, last]
  let status = 'playing'
  if (last.ok) {
    status = 'won'
  } else if (tries.length >= TRIES) {
    status = 'lost'
  }
  return { ...game, status, phase: 'result', tries, last }
}

/** The player presses at time `now` (ms). What it means depends on what is on screen. */
export function press(game, now) {
  if (game.phase === 'warmup') {
    return finish(game, { ok: false, reason: 'early', ms: null, color: null })
  }
  if (game.phase === 'flash') {
    return finish(game, { ok: false, reason: 'wrong-color', ms: null, color: game.color })
  }
  if (game.phase === 'pink') {
    const ms = Math.max(0, Math.round(now - game.pinkAt))
    if (ms < REACTION_LIMIT_MS) {
      return finish(game, { ok: true, reason: 'fast', ms, color: PINK })
    }
    return finish(game, { ok: false, reason: 'slow', ms, color: PINK })
  }
  return game
}

/** Pink came and went and the player never pressed. */
export function miss(game) {
  if (game.phase !== 'pink') {
    return game
  }
  return finish(game, { ok: false, reason: 'missed', ms: null, color: PINK })
}

/**
 * The player switched to another tab in the middle of a try. Timers don't run properly in a hidden
 * tab, so the try is called off with no penalty and can be started over.
 */
export function interruptAttempt(game) {
  if (game.phase !== 'warmup' && game.phase !== 'flash' && game.phase !== 'pink') {
    return game
  }
  return { ...game, phase: 'interrupted', color: null, pinkAt: null }
}

/** Starts the interrupted try again from the beginning (same try number, a fresh script). */
export function restartAttempt(game) {
  if (game.phase !== 'interrupted') {
    return game
  }
  return { ...game, phase: 'warmup', color: null, pinkAt: null }
}

/** A one-line explanation of how a try ended. */
export function describeTry(last) {
  if (!last) {
    return ''
  }
  switch (last.reason) {
    case 'fast':
      return `Pink! ${last.ms} ms is under ${REACTION_LIMIT_MS} ms.`
    case 'slow':
      return `Pink, but ${last.ms} ms is too slow. You need under ${REACTION_LIMIT_MS} ms.`
    case 'missed':
      return 'Pink came and went. You never pressed.'
    case 'early':
      return 'Too soon! Nothing had flashed yet.'
    default:
      return `That was ${last.color.name}! Only press when it is pink.`
  }
}
