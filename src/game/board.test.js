import { describe, expect, it } from 'vitest'
import {
  allCluesResolved,
  createInitialBoard,
  markClueResolved,
} from './board.js'

const sampleCategories = [
  {
    name: 'A',
    clues: [
      { value: 200, clue: 'c1', answer: 'a1' },
      { value: 400, clue: 'c2', answer: 'a2' },
    ],
  },
  {
    name: 'B',
    clues: [
      { value: 200, clue: 'c3', answer: 'a3' },
      { value: 400, clue: 'c4', answer: 'a4' },
    ],
  },
]

describe('createInitialBoard', () => {
  it('marks every clue as unresolved', () => {
    const board = createInitialBoard(sampleCategories)
    expect(board.cells.every((cell) => cell.resolved === false)).toBe(true)
  })

  it('preserves clue content and category names', () => {
    const board = createInitialBoard(sampleCategories)
    expect(board.categories[0].name).toBe('A')
    expect(board.cells[0].clue).toBe('c1')
    expect(board.cells[0].value).toBe(200)
  })
})

describe('mini game clues', () => {
  it('carry their game onto the board cell, and other cells have none', () => {
    const categories = [
      { name: 'A', clues: [{ value: 200, clue: 'c', answer: 'a', minigame: 'snake' }, { value: 400, clue: 'c', answer: 'a' }] },
    ]
    const board = createInitialBoard(categories)
    expect(board.cells[0].minigame).toBe('snake')
    expect(board.cells[1].minigame).toBe(null)
  })
})

describe('markClueResolved', () => {
  it('marks matching cell resolved with result', () => {
    const board = createInitialBoard(sampleCategories)
    const next = markClueResolved(board, 0, 1, 'correct')
    const cell = next.cells.find((c) => c.categoryIndex === 0 && c.rowIndex === 1)
    expect(cell.resolved).toBe(true)
    expect(cell.result).toBe('correct')
  })
})

describe('allCluesResolved', () => {
  it('returns false when any clue remains open', () => {
    const board = createInitialBoard(sampleCategories)
    expect(allCluesResolved(board)).toBe(false)
  })

  it('returns true when every clue is resolved', () => {
    let board = createInitialBoard(sampleCategories)
    for (let cat = 0; cat < 2; cat++) {
      for (let row = 0; row < 2; row++) {
        board = markClueResolved(board, cat, row, 'correct')
      }
    }
    expect(allCluesResolved(board)).toBe(true)
  })
})
