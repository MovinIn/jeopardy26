import { describe, expect, it } from 'vitest'
import {
  BIRD_R,
  BIRD_X,
  FLAP_VELOCITY,
  GRAVITY,
  GROUND_Y,
  POLES_TO_WIN,
  POLE_GAP,
  POLE_SPACING,
  POLE_SPEED,
  POLE_W,
  START_Y,
  WORLD_W,
  createGame,
  flap,
  hitsPole,
  makePole,
  step,
} from './flappy.js'

/** A game being played, with the bird and poles where the test wants them. */
function playing(overrides = {}) {
  return { ...createGame(), status: 'playing', ...overrides }
}

/** A pole far to the right so it can't interfere. */
const farPole = () => ({ x: WORLD_W + 500, y: 250, scored: false })

describe('createGame', () => {
  it('starts hovering and waiting for the first flap', () => {
    const game = createGame()
    expect(game).toMatchObject({ status: 'ready', score: 0, poles: [] })
    expect(game.bird.y).toBe(START_Y)
  })

  it('does not move until the first flap', () => {
    const game = createGame()
    expect(step(game)).toBe(game)
  })
})

describe('flap', () => {
  it('starts the game, kicks the bird up and puts the first pole ahead', () => {
    const game = flap(createGame(), () => 0.5)
    expect(game.status).toBe('playing')
    expect(game.bird.vy).toBe(FLAP_VELOCITY)
    expect(game.poles).toHaveLength(1)
    expect(game.poles[0].x).toBeGreaterThan(WORLD_W)
  })

  it('kicks the bird up again while playing, whatever its speed', () => {
    const game = flap(playing({ bird: { y: 200, vy: 6 }, poles: [farPole()] }))
    expect(game.bird.vy).toBe(FLAP_VELOCITY)
    expect(game.bird.y).toBe(200)
  })

  it('does nothing once the game is over', () => {
    const lost = playing({ status: 'lost' })
    expect(flap(lost)).toBe(lost)
    const won = playing({ status: 'won' })
    expect(flap(won)).toBe(won)
  })
})

describe('makePole', () => {
  it('always leaves a gap well clear of the sky and the ground', () => {
    for (let i = 0; i <= 100; i++) {
      const pole = makePole(300, () => i / 100)
      expect(pole.y - POLE_GAP / 2).toBeGreaterThanOrEqual(40)
      expect(pole.y + POLE_GAP / 2).toBeLessThanOrEqual(GROUND_Y - 40)
    }
  })

  it('varies the gap height', () => {
    expect(makePole(300, () => 0).y).toBeLessThan(makePole(300, () => 1).y)
  })
})

describe('step: flying', () => {
  it('pulls the bird down faster and faster', () => {
    let game = playing({ poles: [farPole()] })
    game = step(game)
    expect(game.bird.vy).toBeCloseTo(GRAVITY)
    expect(game.bird.y).toBeCloseTo(START_Y + GRAVITY)
    game = step(game)
    expect(game.bird.vy).toBeCloseTo(GRAVITY * 2)
  })

  it('rises after a flap, peaks, then falls', () => {
    let game = flap(playing({ poles: [farPole()] }))
    const heights = []
    for (let i = 0; i < 60; i++) {
      game = step(game)
      heights.push(game.bird.y)
    }
    const peak = Math.min(...heights)
    expect(peak).toBeLessThan(START_Y - 40)
    expect(heights[heights.length - 1]).toBeGreaterThan(peak)
  })

  it('limits how fast the bird can fall', () => {
    const game = step(playing({ bird: { y: 100, vy: 50 }, poles: [farPole()] }))
    expect(game.bird.vy).toBeLessThanOrEqual(9)
  })

  it('scrolls the poles left each tick', () => {
    const game = step(playing({ poles: [{ x: 200, y: 250, scored: false }] }))
    expect(game.poles[0].x).toBe(200 - POLE_SPEED)
  })

  it('spawns a new pole once the last one has moved on, and drops poles that left the screen', () => {
    const game = step(
      playing({
        poles: [
          { x: -POLE_W + 1, y: 250, scored: true },
          { x: WORLD_W - POLE_SPACING + 1, y: 250, scored: false },
        ],
      }),
    )
    expect(game.poles).toHaveLength(2)
    expect(game.poles[game.poles.length - 1].x).toBe(WORLD_W)
  })

  it('stops the bird at the ceiling without hurting it', () => {
    const game = step(playing({ bird: { y: BIRD_R + 1, vy: -9 }, poles: [farPole()] }))
    expect(game.status).toBe('playing')
    expect(game.bird.y).toBe(BIRD_R)
  })
})

describe('step: crashing', () => {
  it('loses on hitting the ground', () => {
    const game = step(playing({ bird: { y: GROUND_Y - BIRD_R - 1, vy: 5 }, poles: [farPole()] }))
    expect(game).toMatchObject({ status: 'lost', reason: 'ground' })
  })

  it('loses on hitting the top section of a pole', () => {
    const pole = { x: BIRD_X - 10, y: 300, scored: false } // gap is far below the bird
    const game = step(playing({ bird: { y: 100, vy: 0 }, poles: [pole] }))
    expect(game).toMatchObject({ status: 'lost', reason: 'pole' })
  })

  it('loses on hitting the bottom section of a pole', () => {
    const pole = { x: BIRD_X - 10, y: 120, scored: false } // gap is far above the bird
    const game = step(playing({ bird: { y: 330, vy: 0 }, poles: [pole] }))
    expect(game).toMatchObject({ status: 'lost', reason: 'pole' })
  })

  it('flies safely through the gap', () => {
    const pole = { x: BIRD_X - 10, y: START_Y, scored: false }
    const game = step(playing({ poles: [pole] }))
    expect(game.status).toBe('playing')
  })

  it('stops completely once it has lost', () => {
    const lost = step(playing({ bird: { y: GROUND_Y - BIRD_R - 1, vy: 5 }, poles: [farPole()] }))
    expect(step(lost)).toBe(lost)
  })
})

describe('hitsPole', () => {
  it('only counts a touch when the bird is beside the pole', () => {
    const pole = { x: 200, y: 300, scored: false }
    expect(hitsPole({ y: 100, vy: 0 }, pole)).toBe(false) // pole is far to the right
    expect(hitsPole({ y: 100, vy: 0 }, { ...pole, x: BIRD_X - 10 })).toBe(true)
  })

  it('lets the bird clip past the edge of the gap by a hair', () => {
    const pole = { x: BIRD_X - 10, y: 250, scored: false }
    const gapTop = 250 - POLE_GAP / 2
    expect(hitsPole({ y: gapTop + BIRD_R, vy: 0 }, pole)).toBe(false)
    expect(hitsPole({ y: gapTop + BIRD_R - 3, vy: 0 }, pole)).toBe(true)
  })
})

describe('step: scoring', () => {
  it('scores a pole once the bird is past its middle', () => {
    // The pole's middle is about to cross the bird.
    const pole = { x: BIRD_X - POLE_W / 2 + 1, y: START_Y, scored: false }
    const game = step(playing({ poles: [pole] }))
    expect(game.score).toBe(1)
    expect(game.poles[0].scored).toBe(true)
  })

  it('does not score before the bird is past, or twice for the same pole', () => {
    const early = step(playing({ poles: [{ x: BIRD_X + 40, y: START_Y, scored: false }] }))
    expect(early.score).toBe(0)

    const done = step(playing({ score: 3, poles: [{ x: BIRD_X - 40, y: START_Y, scored: true }] }))
    expect(done.score).toBe(3)
  })

  it('wins on passing the fifteenth pole', () => {
    expect(POLES_TO_WIN).toBe(15)
    const pole = { x: BIRD_X - POLE_W / 2 + 1, y: START_Y, scored: false }
    const game = step(playing({ score: POLES_TO_WIN - 1, poles: [pole] }))
    expect(game).toMatchObject({ status: 'won', score: POLES_TO_WIN })
  })

  it('can be beaten by flapping to hold a steady height', () => {
    // A simple autopilot: flap whenever the bird drops below the middle of the next gap.
    let game = flap(createGame(), () => 0.5)
    for (let tick = 0; tick < 6000 && game.status === 'playing'; tick++) {
      const next = game.poles.find((p) => p.x + POLE_W > BIRD_X - BIRD_R)
      const target = next ? next.y + 10 : START_Y
      if (game.bird.y > target && game.bird.vy > 0) {
        game = flap(game)
      }
      game = step(game, () => 0.5)
    }
    expect(game.status).toBe('won')
  })
})
