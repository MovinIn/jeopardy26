import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { validateBoardJson } from '../game/validateBoard.js'

const board = JSON.parse(readFileSync('public/board.json', 'utf8'))
const result = validateBoardJson(board)

describe('public/board.json', () => {
  it('is a valid board', () => {
    expect(result.errors).toEqual([])
    expect(result.ok).toBe(true)
  })

  it('has a Live Games category and no Gambling category', () => {
    const names = result.data.categories.map((c) => c.name)
    expect(names).toContain('Live Games')
    expect(names).not.toContain('Gambling')
  })

  it('makes every Live Games clue a mini game: Snake, Flappy Bird, Typing, Tetris and the reaction test', () => {
    const live = result.data.categories.find((c) => c.name === 'Live Games')
    expect(live.clues[0]).toMatchObject({ value: 200, minigame: 'snake' })
    expect(live.clues[1]).toMatchObject({ value: 400, minigame: 'flappy' })
    expect(live.clues[3]).toMatchObject({ value: 800, minigame: 'tetris' })
    expect(live.clues[2]).toMatchObject({ value: 600, minigame: 'typing' })
    expect(live.clues[4]).toMatchObject({ value: 1000, minigame: 'reaction' })

    const others = result.data.categories
      .filter((c) => c.name !== 'Live Games')
      .flatMap((c) => c.clues)
    expect(others.every((clue) => clue.minigame === undefined)).toBe(true)
  })
})
