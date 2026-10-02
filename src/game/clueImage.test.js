import { describe, expect, it } from 'vitest'
import { createInitialBoard } from './board.js'
import { validateBoardJson } from './validateBoard.js'
import { makeCategories } from '../test/fixtures.js'

function boardWith(mutate) {
  const categories = makeCategories()
  mutate(categories)
  return { title: 'Test Game', categories }
}

describe('clue images in board data', () => {
  it('keeps an image on a clue and leaves the other clues without one', () => {
    const result = validateBoardJson(
      boardWith((cats) => {
        cats[4].clues[1].image = '/clues/diagram.png'
      }),
    )
    expect(result.ok).toBe(true)
    expect(result.data.categories[4].clues[1].image).toBe('/clues/diagram.png')
    expect(result.data.categories[4].clues[0].image).toBeUndefined()
    expect(result.data.categories[0].clues[0].image).toBeUndefined()
  })

  it('trims the path', () => {
    const result = validateBoardJson(
      boardWith((cats) => {
        cats[0].clues[0].image = '  /clues/a.svg '
      }),
    )
    expect(result.data.categories[0].clues[0].image).toBe('/clues/a.svg')
  })

  it('rejects a blank or non-text image', () => {
    for (const bad of ['', '   ', 42, null, {}]) {
      const result = validateBoardJson(
        boardWith((cats) => {
          cats[2].clues[3].image = bad
        }),
      )
      expect(result.ok, String(bad)).toBe(false)
      expect(result.errors.some((e) => e.includes('"image"'))).toBe(true)
    }
  })

  it('does not disturb mini games or Daily Doubles on the same board', () => {
    const result = validateBoardJson(
      boardWith((cats) => {
        cats[3].clues[0].minigame = 'snake'
        cats[1].clues[2].dailyDouble = true
        cats[4].clues[1].image = '/clues/diagram.png'
      }),
    )
    expect(result.ok).toBe(true)
    expect(result.data.categories[3].clues[0].minigame).toBe('snake')
    expect(result.data.categories[1].clues[2].dailyDouble).toBe(true)
  })

  it('puts the image on the board cell, and null on cells without one', () => {
    const board = createInitialBoard([
      {
        name: 'A',
        clues: [
          { value: 200, clue: 'c', answer: 'a', image: '/clues/diagram.png' },
          { value: 400, clue: 'c', answer: 'a' },
        ],
      },
    ])
    expect(board.cells[0].image).toBe('/clues/diagram.png')
    expect(board.cells[1].image).toBe(null)
  })
})
