import { describe, expect, it } from 'vitest'
import { createInitialBoard } from './board.js'
import { validateBoardJson } from './validateBoard.js'
import { makeCategories } from '../test/fixtures.js'

function boardWith(mutate) {
  const categories = makeCategories()
  mutate(categories)
  return { title: 'Test Game', categories }
}

describe('clue animations in board data', () => {
  it('keeps the animation and its word on a clue, and nowhere else', () => {
    const result = validateBoardJson(
      boardWith((cats) => {
        cats[1].clues[4].animation = 'spellingChaos'
        cats[1].clues[4].spellingWord = 'Ezekiel'
      }),
    )
    expect(result.ok).toBe(true)
    expect(result.warnings).toEqual([])
    expect(result.data.categories[1].clues[4]).toMatchObject({
      animation: 'spellingChaos',
      spellingWord: 'Ezekiel',
    })
    expect(result.data.categories[1].clues[3].animation).toBeUndefined()
    expect(result.data.categories[0].clues[0].spellingWord).toBeUndefined()
  })

  it('trims both fields', () => {
    const result = validateBoardJson(
      boardWith((cats) => {
        cats[0].clues[0].animation = ' spellingChaos '
        cats[0].clues[0].spellingWord = '  Ezekiel '
      }),
    )
    expect(result.data.categories[0].clues[0]).toMatchObject({ animation: 'spellingChaos', spellingWord: 'Ezekiel' })
  })

  it('rejects a blank or non-text animation or word', () => {
    for (const field of ['animation', 'spellingWord']) {
      for (const bad of ['', '   ', 7, null]) {
        const result = validateBoardJson(
          boardWith((cats) => {
            cats[2].clues[2][field] = bad
          }),
        )
        expect(result.ok, `${field}=${String(bad)}`).toBe(false)
        expect(result.errors.some((e) => e.includes(`"${field}"`))).toBe(true)
      }
    }
  })

  it('warns about an animation it does not know, without refusing the board', () => {
    const result = validateBoardJson(
      boardWith((cats) => {
        cats[0].clues[0].animation = 'confetti'
      }),
    )
    expect(result.ok).toBe(true)
    expect(result.warnings.some((w) => w.includes('confetti'))).toBe(true)
  })

  it('sits alongside pictures, mini games and Daily Doubles on one board', () => {
    const result = validateBoardJson(
      boardWith((cats) => {
        cats[1].clues[4].animation = 'spellingChaos'
        cats[4].clues[1].image = '/clues/diagram.png'
        cats[3].clues[0].minigame = 'snake'
        cats[0].clues[2].dailyDouble = true
      }),
    )
    expect(result.ok).toBe(true)
    expect(result.data.categories[4].clues[1].image).toBe('/clues/diagram.png')
    expect(result.data.categories[3].clues[0].minigame).toBe('snake')
    expect(result.data.categories[0].clues[2].dailyDouble).toBe(true)
  })

  it('puts the fields on the board cell, and null on cells without them', () => {
    const board = createInitialBoard([
      {
        name: 'A',
        clues: [
          { value: 200, clue: 'c', answer: 'a', animation: 'spellingChaos', spellingWord: 'Ezekiel' },
          { value: 400, clue: 'c', answer: 'a' },
        ],
      },
    ])
    expect(board.cells[0]).toMatchObject({ animation: 'spellingChaos', spellingWord: 'Ezekiel' })
    expect(board.cells[1]).toMatchObject({ animation: null, spellingWord: null })
  })
})
