/**
 * Snake, like the one in Google search: a 17 x 15 board, the snake keeps moving once you press a
 * direction, eating an apple grows it, and hitting a wall or itself ends the game.
 * Collect APPLES_TO_WIN apples to win.
 */

export const COLS = 17
export const ROWS = 15
export const APPLES_TO_WIN = 10
export const TICK_MS = 140

export const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' }
const MAX_QUEUED_TURNS = 2

const same = (a, b) => a.x === b.x && a.y === b.y

/** A random empty cell for the next apple, or null if the snake fills the board. */
export function placeApple(snake, rng = Math.random) {
  const empty = []
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!snake.some((part) => part.x === x && part.y === y)) {
        empty.push({ x, y })
      }
    }
  }
  if (empty.length === 0) {
    return null
  }
  return empty[Math.floor(rng() * empty.length)]
}

/**
 * status: 'ready' (waiting for the first key) | 'playing' | 'won' | 'lost'
 * `snake[0]` is the head. `queue` holds turns waiting for their tick.
 */
export function createGame(rng = Math.random) {
  const snake = [
    { x: 4, y: 7 },
    { x: 3, y: 7 },
    { x: 2, y: 7 },
  ]
  return {
    snake,
    dir: 'right',
    queue: [],
    apple: placeApple(snake, rng),
    score: 0,
    status: 'ready',
    reason: null,
  }
}

/**
 * Steer the snake. The first valid key also starts the game. A turn straight back into the
 * snake is ignored, and at most two turns are buffered so quick taps aren't lost.
 */
export function turn(game, dir) {
  if (game.status === 'won' || game.status === 'lost' || !DIRS[dir]) {
    return game
  }
  if (game.status === 'ready') {
    if (dir === OPPOSITE[game.dir]) {
      return game
    }
    return { ...game, status: 'playing', queue: dir === game.dir ? [] : [dir] }
  }
  const last = game.queue.length > 0 ? game.queue[game.queue.length - 1] : game.dir
  if (dir === last || dir === OPPOSITE[last] || game.queue.length >= MAX_QUEUED_TURNS) {
    return game
  }
  return { ...game, queue: [...game.queue, dir] }
}

/** Advance one tick. Does nothing unless the game is being played. */
export function step(game, rng = Math.random) {
  if (game.status !== 'playing') {
    return game
  }
  const dir = game.queue[0] ?? game.dir
  const queue = game.queue.slice(1)
  const head = game.snake[0]
  const next = { x: head.x + DIRS[dir].x, y: head.y + DIRS[dir].y }

  if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
    return { ...game, dir, queue, status: 'lost', reason: 'wall' }
  }

  const eating = game.apple !== null && same(next, game.apple)
  // The tail moves out of the way on a normal step, so only a growing snake can bite its tail.
  const body = eating ? game.snake : game.snake.slice(0, -1)
  if (body.some((part) => same(part, next))) {
    return { ...game, dir, queue, status: 'lost', reason: 'self' }
  }

  const snake = [next, ...body]
  const score = eating ? game.score + 1 : game.score
  if (score >= APPLES_TO_WIN) {
    return { ...game, snake, dir, queue, apple: null, score, status: 'won', reason: null }
  }
  return {
    ...game,
    snake,
    dir,
    queue,
    score,
    apple: eating ? placeApple(snake, rng) : game.apple,
  }
}
