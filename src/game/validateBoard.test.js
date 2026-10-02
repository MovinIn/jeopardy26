import { describe, expect, it } from 'vitest'
import { validateBoardJson } from './validateBoard.js'
import { makeCategories } from '../test/fixtures.js'

function makeValidBoard() {
  return { title: 'Test Game', categories: makeCategories() }
}

describe('validateBoardJson', () => {
  it('accepts a standard 6x5 board', () => {
    const result = validateBoardJson(makeValidBoard())
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.data.title).toBe('Test Game')
    expect(result.data.doubleJeopardy).toBe(null)
    expect(result.data.finalJeopardy).toBe(null)
  })

  it('accepts five categories as well as six', () => {
    for (const count of [5, 6]) {
      const data = makeValidBoard()
      data.categories = data.categories.slice(0, count)
      const result = validateBoardJson(data)
      expect(result.ok, `${count} categories`).toBe(true)
      expect(result.data.categories).toHaveLength(count)
    }
  })

  it('rejects a board with fewer than five or more than six categories', () => {
    for (const count of [0, 3, 4]) {
      const data = makeValidBoard()
      data.categories = data.categories.slice(0, count)
      const result = validateBoardJson(data)
      expect(result.ok, `${count} categories`).toBe(false)
      expect(result.errors.some((e) => e.includes('5 or 6 categories'))).toBe(true)
    }
    const seven = makeValidBoard()
    seven.categories = [...seven.categories, { ...seven.categories[0], name: 'Extra' }]
    const result = validateBoardJson(seven)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('5 or 6 categories (found 7)'))).toBe(true)
  })

  it('applies the same rule to a Double Jeopardy round', () => {
    const data = makeValidBoard()
    data.doubleJeopardy = { categories: makeCategories([400, 800, 1200, 1600, 2000]).slice(0, 5) }
    expect(validateBoardJson(data).ok).toBe(true)
    data.doubleJeopardy = { categories: makeCategories([400, 800, 1200, 1600, 2000]).slice(0, 3) }
    const result = validateBoardJson(data)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('Double Jeopardy!') && e.includes('5 or 6 categories'))).toBe(true)
  })

  it('rejects board when a category does not have five clues', () => {
    const data = makeValidBoard()
    data.categories[0].clues = data.categories[0].clues.slice(0, 4)
    const result = validateBoardJson(data)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('5 clues'))).toBe(true)
  })

  it('returns warnings for non-standard clue values', () => {
    const data = makeValidBoard()
    data.categories[0].clues[0].value = 250
    const result = validateBoardJson(data)
    expect(result.ok).toBe(true)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('accepts a Double Jeopardy round and Final Jeopardy clue', () => {
    const data = {
      ...makeValidBoard(),
      doubleJeopardy: { categories: makeCategories([400, 800, 1200, 1600, 2000]) },
      finalJeopardy: { category: 'C', clue: 'Q', answer: 'A' },
    }
    const result = validateBoardJson(data)
    expect(result.ok).toBe(true)
    expect(result.warnings).toEqual([])
    expect(result.data.doubleJeopardy).toHaveLength(6)
    expect(result.data.finalJeopardy.category).toBe('C')
  })

  it('warns when Double Jeopardy uses first-round values', () => {
    const data = { ...makeValidBoard(), doubleJeopardy: { categories: makeCategories() } }
    const result = validateBoardJson(data)
    expect(result.ok).toBe(true)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('rejects an incomplete Final Jeopardy clue', () => {
    const data = { ...makeValidBoard(), finalJeopardy: { category: 'C' } }
    const result = validateBoardJson(data)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('finalJeopardy'))).toBe(true)
  })

  it('accepts spinnerEvents as strings or token objects', () => {
    const data = {
      ...makeValidBoard(),
      spinnerEvents: ['Plain', { label: 'Five pack', tokens: 5 }],
    }
    const result = validateBoardJson(data)
    expect(result.ok).toBe(true)
    expect(result.data.spinnerEvents).toEqual(['Plain', { label: 'Five pack', tokens: 5 }])
  })

  it('accepts optional slotPowerups and diceFaces', () => {
    const data = {
      ...makeValidBoard(),
      slotPowerups: [{ id: 'peek', label: 'Peek' }],
      diceFaces: [2, 3, 4],
    }
    const result = validateBoardJson(data)
    expect(result.ok).toBe(true)
    expect(result.data.slotPowerups).toEqual([{ id: 'peek', label: 'Peek' }])
    expect(result.data.diceFaces).toEqual([2, 3, 4])
  })

  it('keeps a mini game flag on a clue', () => {
    const data = makeValidBoard()
    data.categories[3].clues[0].minigame = 'snake'
    const result = validateBoardJson(data)
    expect(result.ok).toBe(true)
    expect(result.data.categories[3].clues[0].minigame).toBe('snake')
    expect(result.data.categories[3].clues[1].minigame).toBeUndefined()
    expect(result.warnings).toEqual([])
  })

  it('accepts the Flappy Bird mini game too', () => {
    const data = makeValidBoard()
    data.categories[3].clues[1].minigame = 'flappy'
    const result = validateBoardJson(data)
    expect(result.data.categories[3].clues[1].minigame).toBe('flappy')
    expect(result.warnings).toEqual([])
  })

  it('accepts the Tetris mini game too', () => {
    const data = makeValidBoard()
    data.categories[3].clues[3].minigame = 'tetris'
    const result = validateBoardJson(data)
    expect(result.data.categories[3].clues[3].minigame).toBe('tetris')
    expect(result.warnings).toEqual([])
  })

  it('accepts the typing test mini game too', () => {
    const data = makeValidBoard()
    data.categories[3].clues[2].minigame = 'typing'
    const result = validateBoardJson(data)
    expect(result.data.categories[3].clues[2].minigame).toBe('typing')
    expect(result.warnings).toEqual([])
  })

  it('warns about an unknown mini game and plays that clue normally', () => {
    const data = makeValidBoard()
    data.categories[0].clues[0].minigame = 'pong'
    const result = validateBoardJson(data)
    expect(result.ok).toBe(true)
    expect(result.data.categories[0].clues[0].minigame).toBeUndefined()
    expect(result.warnings.some((w) => w.includes('pong'))).toBe(true)
  })

  it('preserves author-flagged Daily Doubles', () => {
    const data = makeValidBoard()
    data.categories[1].clues[2].dailyDouble = true
    const result = validateBoardJson(data)
    expect(result.data.categories[1].clues[2].dailyDouble).toBe(true)
    expect(result.data.categories[0].clues[0].dailyDouble).toBe(false)
  })
})
