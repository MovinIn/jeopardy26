import { describe, expect, it } from 'vitest'
import {
  PASSAGE,
  TARGET_WPM,
  TIME_LIMIT_MS,
  WORDS,
  correctPrefix,
  createGame,
  paceIndex,
  tick,
  typeKey,
  wordsDone,
  wordsReached,
  wordsPerMinute,
} from './typing.js'

/** Types a string one key at a time, all at `now`. */
function typeAll(game, text, now) {
  let g = game
  for (const ch of text) {
    g = typeKey(g, ch, now)
  }
  return g
}

describe('the passage', () => {
  it('is exactly 40 words', () => {
    expect(WORDS).toBe(40)
    expect(PASSAGE.trim().split(/\s+/)).toHaveLength(40)
  })

  it('uses only plain keys: letters, spaces, commas and a full stop', () => {
    expect(PASSAGE).toMatch(/^[A-Za-z ,.]+$/)
    expect(PASSAGE).not.toMatch(/ {2}/)
  })

  it('gives 30 seconds at 80 words a minute', () => {
    expect(TARGET_WPM).toBe(80)
    expect(TIME_LIMIT_MS).toBe(30000)
  })
})

describe('wordsPerMinute', () => {
  it('works out the speed', () => {
    expect(wordsPerMinute(40, 30000)).toBeCloseTo(80)
    expect(wordsPerMinute(40, 20000)).toBeCloseTo(120)
    expect(wordsPerMinute(40, 60000)).toBeCloseTo(40)
  })

  it('is zero before any time has passed', () => {
    expect(wordsPerMinute(10, 0)).toBe(0)
  })
})

describe('paceIndex', () => {
  it('moves steadily through the passage and finishes at 30 seconds', () => {
    expect(paceIndex(0)).toBe(0)
    expect(paceIndex(15000)).toBe(Math.floor(PASSAGE.length / 2))
    expect(paceIndex(30000)).toBe(PASSAGE.length)
    expect(paceIndex(60000)).toBe(PASSAGE.length)
    expect(paceIndex(-5)).toBe(0)
  })
})

describe('correctPrefix and wordsDone', () => {
  it('counts matching characters up to the first mistake', () => {
    expect(correctPrefix('')).toBe(0)
    expect(correctPrefix('In a q')).toBe(6)
    expect(correctPrefix('In a x')).toBe(5)
    expect(correctPrefix('Xn a q')).toBe(0)
  })

  it('turns that into words', () => {
    expect(wordsDone(PASSAGE)).toBeCloseTo(40)
    expect(wordsDone(PASSAGE.slice(0, PASSAGE.length / 2))).toBeCloseTo(20, 0)
    expect(wordsDone('')).toBe(0)
  })
})

describe('wordsReached', () => {
  it('says which word you are on', () => {
    expect(wordsReached('')).toBe(0)
    expect(wordsReached('I')).toBe(1)
    expect(wordsReached('In a')).toBe(2)
    expect(wordsReached('In a quiet')).toBe(3)
    expect(wordsReached(PASSAGE)).toBe(40)
  })

  it('stops counting at a mistake', () => {
    expect(wordsReached('In a quxet')).toBe(3) // still on word 3: only the correct part counts
    expect(wordsReached('In x quiet')).toBe(2)
    expect(wordsReached('X')).toBe(0)
  })
})

describe('typeKey', () => {
  it('waits for a character before starting, and ignores Backspace and other keys at first', () => {
    const game = createGame()
    expect(typeKey(game, 'Backspace', 100)).toBe(game)
    expect(typeKey(game, 'Shift', 100)).toBe(game)
    expect(typeKey(game, 'Enter', 100)).toBe(game)
  })

  it('starts the clock on the first character', () => {
    const game = typeKey(createGame(), 'I', 1234)
    expect(game).toMatchObject({ status: 'playing', startedAt: 1234, typed: 'I' })
  })

  it('keeps wrong characters so they can be seen and fixed', () => {
    let game = typeAll(createGame(), 'In x', 0)
    expect(game.typed).toBe('In x')
    game = typeKey(game, 'Backspace', 10)
    expect(game.typed).toBe('In ')
  })

  it('ignores multi-character keys while playing', () => {
    const game = typeKey(createGame(), 'I', 0)
    expect(typeKey(game, 'Shift', 5)).toBe(game)
    expect(typeKey(game, 'ArrowLeft', 5)).toBe(game)
  })

  it('does not type past the end of the passage', () => {
    let game = typeAll(createGame(), PASSAGE.slice(0, -1) + 'x', 0)
    expect(game.typed).toHaveLength(PASSAGE.length)
    expect(typeKey(game, 'y', 1).typed).toBe(game.typed)
  })

  it('wins by typing it all correctly within 30 seconds', () => {
    let game = typeKey(createGame(), PASSAGE[0], 1000)
    game = typeAll(game, PASSAGE.slice(1), 1000 + 25000)
    expect(game).toMatchObject({ status: 'won', finishedMs: 25000 })
    expect(wordsPerMinute(WORDS, game.finishedMs)).toBeCloseTo(96)
  })

  it('wins on exactly 80 words a minute', () => {
    let game = typeKey(createGame(), PASSAGE[0], 0)
    game = typeAll(game, PASSAGE.slice(1), TIME_LIMIT_MS)
    expect(game.status).toBe('won')
  })

  it('does not win while a typo is left in', () => {
    let game = typeKey(createGame(), 'X', 0)
    game = typeAll(game, PASSAGE.slice(1), 5000)
    expect(game.typed).toHaveLength(PASSAGE.length)
    expect(game.status).toBe('playing')
    // Fix the first letter and it completes.
    for (let i = 0; i < PASSAGE.length; i++) {
      game = typeKey(game, 'Backspace', 6000)
    }
    game = typeAll(game, PASSAGE, 8000)
    expect(game.status).toBe('won')
  })

  it('loses by finishing after the limit', () => {
    let game = typeKey(createGame(), PASSAGE[0], 0)
    game = typeAll(game, PASSAGE.slice(1), TIME_LIMIT_MS + 1)
    expect(game).toMatchObject({ status: 'lost', reason: 'time' })
  })

  it('stops once the game is over', () => {
    const won = typeAll(createGame(), PASSAGE, 0)
    expect(won.status).toBe('won')
    expect(typeKey(won, 'a', 1)).toBe(won)
    expect(typeKey(won, 'Backspace', 1)).toBe(won)
  })
})

describe('tick', () => {
  it('does nothing before the first key or within the limit', () => {
    const ready = createGame()
    expect(tick(ready, 99999)).toBe(ready)
    const playing = typeKey(ready, 'I', 0)
    expect(tick(playing, TIME_LIMIT_MS)).toBe(playing)
  })

  it('loses once the 30 seconds are up', () => {
    const playing = typeKey(createGame(), 'I', 500)
    const lost = tick(playing, 500 + TIME_LIMIT_MS + 1)
    expect(lost).toMatchObject({ status: 'lost', reason: 'time', finishedMs: TIME_LIMIT_MS })
  })

  it('stops ticking once over', () => {
    const lost = tick(typeKey(createGame(), 'I', 0), TIME_LIMIT_MS + 5)
    expect(tick(lost, TIME_LIMIT_MS * 3)).toBe(lost)
  })
})
