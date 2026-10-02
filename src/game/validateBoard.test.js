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

  it('rejects board when category count is not six', () => {
    const data = makeValidBoard()
    data.categories = data.categories.slice(0, 5)
    const result = validateBoardJson(data)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('6 categories'))).toBe(true)
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

  it('preserves author-flagged Daily Doubles', () => {
    const data = makeValidBoard()
    data.categories[1].clues[2].dailyDouble = true
    const result = validateBoardJson(data)
    expect(result.data.categories[1].clues[2].dailyDouble).toBe(true)
    expect(result.data.categories[0].clues[0].dailyDouble).toBe(false)
  })
})
