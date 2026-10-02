/**
 * Flappy Bird. The bird falls, each flap kicks it upward, and pairs of poles scroll past with a gap
 * to fly through. Pass POLES_TO_WIN poles to win; touching a pole or the ground ends the game.
 *
 * Everything is in world units on a 288 x 512 playfield, advanced in fixed 1/60 s ticks so the
 * game plays the same on any screen.
 */

export const WORLD_W = 288
export const WORLD_H = 512
export const GROUND_H = 112
export const GROUND_Y = WORLD_H - GROUND_H

export const BIRD_X = 72
export const BIRD_R = 12
export const START_Y = 230

export const GRAVITY = 0.42
export const FLAP_VELOCITY = -7.2
export const MAX_FALL_SPEED = 9

export const POLE_W = 52
export const POLE_GAP = 130
export const POLE_SPACING = 168
export const POLE_SPEED = 2.4
const POLE_MARGIN = 48 // keeps the gap clear of the sky and the ground
const FIRST_POLE_X = WORLD_W + 110

export const POLES_TO_WIN = 15

/** The most real time one frame is allowed to advance the game by. */
export const MAX_CATCH_UP_MS = 100
/** A frame this long after the last one means the page was hidden or frozen, not just slow. */
export const PAUSE_GAP_MS = 250

/**
 * How much game time to run for a frame that arrived `gap` ms after the previous one. Short gaps are
 * played (up to a cap); a long gap is skipped so coming back to the tab doesn't fast-forward the bird.
 */
export function catchUpMs(gap) {
  return gap > PAUSE_GAP_MS ? 0 : Math.max(0, Math.min(gap, MAX_CATCH_UP_MS))
}

export const TICK_MS = 1000 / 60

/** A new pole whose gap is at a random height. `y` is the centre of the gap. */
export function makePole(x, rng = Math.random) {
  const low = POLE_MARGIN + POLE_GAP / 2
  const high = GROUND_Y - POLE_MARGIN - POLE_GAP / 2
  return { x, y: Math.round(low + rng() * (high - low)), scored: false }
}

/**
 * status: 'ready' (bird hovering, waiting for the first flap) | 'playing' | 'won' | 'lost'
 * `distance` is how far the world has scrolled, used to animate the ground.
 */
export function createGame() {
  return {
    status: 'ready',
    bird: { y: START_Y, vy: 0 },
    poles: [],
    score: 0,
    distance: 0,
    reason: null,
  }
}

/** The first flap starts the game; after that each flap kicks the bird up. */
export function flap(game, rng = Math.random) {
  if (game.status === 'won' || game.status === 'lost') {
    return game
  }
  const bird = { ...game.bird, vy: FLAP_VELOCITY }
  if (game.status === 'ready') {
    const poles = game.poles.length > 0 ? game.poles : [makePole(FIRST_POLE_X, rng)]
    return { ...game, status: 'playing', bird, poles }
  }
  return { ...game, bird }
}

/** Does the bird (a circle) overlap this pole's top or bottom section? */
export function hitsPole(bird, pole) {
  const r = BIRD_R - 1 // a touch forgiving, like the real game's hitbox
  const gapTop = pole.y - POLE_GAP / 2
  const gapBottom = pole.y + POLE_GAP / 2
  const overlapsSection = (top, bottom) => {
    const nearestX = Math.max(pole.x, Math.min(BIRD_X, pole.x + POLE_W))
    const nearestY = Math.max(top, Math.min(bird.y, bottom))
    return (BIRD_X - nearestX) ** 2 + (bird.y - nearestY) ** 2 < r * r
  }
  return overlapsSection(-1000, gapTop) || overlapsSection(gapBottom, GROUND_Y)
}

/** Advance one tick. Does nothing unless the game is being played. */
export function step(game, rng = Math.random) {
  if (game.status !== 'playing') {
    return game
  }

  const vy = Math.min(game.bird.vy + GRAVITY, MAX_FALL_SPEED)
  let y = game.bird.y + vy
  let birdVy = vy
  if (y < BIRD_R) {
    // The ceiling stops the bird but doesn't hurt it.
    y = BIRD_R
    birdVy = Math.max(birdVy, 0)
  }
  const bird = { y, vy: birdVy }
  const distance = game.distance + POLE_SPEED

  if (y + BIRD_R >= GROUND_Y) {
    return {
      ...game,
      bird: { y: GROUND_Y - BIRD_R, vy: 0 },
      distance,
      status: 'lost',
      reason: 'ground',
    }
  }

  let poles = game.poles
    .map((pole) => ({ ...pole, x: pole.x - POLE_SPEED }))
    .filter((pole) => pole.x + POLE_W > 0)
  const last = poles[poles.length - 1]
  if (!last || last.x <= WORLD_W - POLE_SPACING) {
    poles = [...poles, makePole(WORLD_W, rng)]
  }

  if (poles.some((pole) => hitsPole(bird, pole))) {
    return { ...game, bird, poles, distance, status: 'lost', reason: 'pole' }
  }

  // A pole counts once the bird is past its middle.
  let score = game.score
  poles = poles.map((pole) => {
    if (!pole.scored && pole.x + POLE_W / 2 < BIRD_X) {
      score += 1
      return { ...pole, scored: true }
    }
    return pole
  })

  const status = score >= POLES_TO_WIN ? 'won' : 'playing'
  return { ...game, bird, poles, distance, score, status }
}
