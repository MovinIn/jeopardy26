import { describe, expect, it } from 'vitest'
import { APPLES_TO_WIN, COLS, ROWS, createGame, placeApple, step, turn } from './snake.js'

/** A game that is already being played, with the snake and apple where the test wants them. */
function playing(overrides = {}) {
  return {
    snake: [
      { x: 4, y: 7 },
      { x: 3, y: 7 },
      { x: 2, y: 7 },
    ],
    dir: 'right',
    queue: [],
    apple: { x: 0, y: 0 },
    score: 0,
    status: 'playing',
    reason: null,
    ...overrides,
  }
}

describe('placeApple', () => {
  it('never lands on the snake', () => {
    const snake = [
      { x: 4, y: 7 },
      { x: 3, y: 7 },
      { x: 2, y: 7 },
    ]
    for (let i = 0; i < 300; i++) {
      const apple = placeApple(snake, () => i / 300)
      expect(apple.x).toBeGreaterThanOrEqual(0)
      expect(apple.x).toBeLessThan(COLS)
      expect(apple.y).toBeGreaterThanOrEqual(0)
      expect(apple.y).toBeLessThan(ROWS)
      expect(snake.some((part) => part.x === apple.x && part.y === apple.y)).toBe(false)
    }
  })

  it('returns null when the snake fills the board', () => {
    const full = Array.from({ length: COLS * ROWS }, (_, i) => ({ x: i % COLS, y: Math.floor(i / COLS) }))
    expect(placeApple(full)).toBe(null)
  })
})

describe('createGame', () => {
  it('starts waiting for the first key, three long, facing right', () => {
    const game = createGame()
    expect(game).toMatchObject({ status: 'ready', score: 0, dir: 'right' })
    expect(game.snake).toHaveLength(3)
    expect(game.apple).not.toBe(null)
  })

  it('does not move until a key is pressed', () => {
    const game = createGame()
    expect(step(game)).toBe(game)
  })
})

describe('turn', () => {
  it('starts the game on the first valid key', () => {
    expect(turn(createGame(), 'up')).toMatchObject({ status: 'playing', queue: ['up'] })
    expect(turn(createGame(), 'right')).toMatchObject({ status: 'playing', queue: [] })
  })

  it('ignores a first key that points back into the snake', () => {
    const game = createGame()
    expect(turn(game, 'left')).toBe(game)
  })

  it('ignores reversing, repeating and unknown keys', () => {
    const game = playing()
    expect(turn(game, 'left')).toBe(game)
    expect(turn(game, 'right')).toBe(game)
    expect(turn(game, 'sideways')).toBe(game)
  })

  it('checks reversals against the turn already queued', () => {
    let game = turn(playing(), 'up')
    expect(turn(game, 'down')).toBe(game)
    game = turn(game, 'left')
    expect(game.queue).toEqual(['up', 'left'])
  })

  it('buffers at most two turns', () => {
    let game = turn(playing(), 'up')
    game = turn(game, 'left')
    expect(turn(game, 'down')).toBe(game)
  })

  it('does nothing once the game is over', () => {
    const lost = playing({ status: 'lost' })
    expect(turn(lost, 'up')).toBe(lost)
  })
})

describe('step', () => {
  it('moves the snake one cell and keeps its length', () => {
    const next = step(playing())
    expect(next.snake).toEqual([
      { x: 5, y: 7 },
      { x: 4, y: 7 },
      { x: 3, y: 7 },
    ])
  })

  it('takes queued turns one per tick', () => {
    let game = turn(turn(playing(), 'up'), 'left')
    game = step(game)
    expect(game.snake[0]).toEqual({ x: 4, y: 6 })
    game = step(game)
    expect(game.snake[0]).toEqual({ x: 3, y: 6 })
    expect(game.dir).toBe('left')
  })

  it('loses on hitting a wall', () => {
    const game = step(playing({ snake: [{ x: COLS - 1, y: 7 }, { x: COLS - 2, y: 7 }, { x: COLS - 3, y: 7 }] }))
    expect(game).toMatchObject({ status: 'lost', reason: 'wall' })
  })

  it('loses on hitting the top, bottom and left walls too', () => {
    expect(step(playing({ snake: [{ x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 2 }], dir: 'up' })).reason).toBe('wall')
    expect(step(playing({ snake: [{ x: 5, y: ROWS - 1 }, { x: 5, y: ROWS - 2 }, { x: 5, y: ROWS - 3 }], dir: 'down' })).reason).toBe('wall')
    expect(step(playing({ snake: [{ x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }], dir: 'left' })).reason).toBe('wall')
  })

  it('loses on running into itself', () => {
    // A long snake curled so that heading up bites its own body.
    const snake = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 4, y: 4 },
      { x: 5, y: 4 },
      { x: 6, y: 4 },
    ]
    const game = step(playing({ snake, dir: 'up' }))
    expect(game).toMatchObject({ status: 'lost', reason: 'self' })
  })

  it('can follow its own tail without dying', () => {
    // Head at (5,5) moving up into (5,4) where the tail is about to leave.
    const snake = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 4, y: 4 },
      { x: 5, y: 4 },
    ]
    expect(step(playing({ snake, dir: 'up' })).status).toBe('playing')
  })

  it('eats an apple: grows by one, scores, and places a new apple off the snake', () => {
    const game = step(playing({ apple: { x: 5, y: 7 } }), () => 0)
    expect(game.snake).toHaveLength(4)
    expect(game.score).toBe(1)
    expect(game.snake.some((p) => p.x === game.apple.x && p.y === game.apple.y)).toBe(false)
    expect(game.status).toBe('playing')
  })

  it('wins on collecting the tenth apple', () => {
    const game = step(playing({ apple: { x: 5, y: 7 }, score: APPLES_TO_WIN - 1 }))
    expect(game).toMatchObject({ status: 'won', score: APPLES_TO_WIN, apple: null })
  })

  it('stops once the game is over', () => {
    const won = step(playing({ apple: { x: 5, y: 7 }, score: APPLES_TO_WIN - 1 }))
    expect(step(won)).toBe(won)
  })

  it('needs ten apples to win', () => {
    expect(APPLES_TO_WIN).toBe(10)
  })
})
