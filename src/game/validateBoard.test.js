import { describe, expect, it } from 'vitest'
import { validateBoardJson } from './validateBoard.js'

function makeValidBoard() {
  const categories = Array.from({ length: 6 }, (_, ci) => ({
    name: `Category ${ci + 1}`,
    clues: [200, 400, 600, 800, 1000].map((value) => ({
      value,
      clue: `Clue ${ci}-${value}`,
      answer: `Answer ${ci}-${value}`,
    })),
  }))
  return {
    title: 'Test Game',
    categories,
    spinnerEvents: ['Event A'],
  }
}

describe('validateBoardJson', () => {
  it('accepts a standard 6x5 board', () => {
    const result = validateBoardJson(makeValidBoard())
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.data.title).toBe('Test Game')
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
})
