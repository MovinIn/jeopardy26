import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { validateBoardJson } from '../game/validateBoard.js'
import { countLettersInWord } from '../game/spellingChaos.js'

const result = validateBoardJson(JSON.parse(readFileSync('public/board.json', 'utf8')))
const clues = result.data.categories.flatMap((c) => c.clues.map((clue) => ({ category: c.name, ...clue })))

describe('the spelling animation in public/board.json', () => {
  it('is on Spelling Bee $1,000, with the word Ezekiel', () => {
    const spelling = result.data.categories.find((c) => c.name === 'Spelling Bee')
    expect(spelling.clues[4]).toMatchObject({
      value: 1000,
      animation: 'spellingChaos',
      spellingWord: 'Ezekiel',
    })
  })

  it('is on that clue and no other', () => {
    expect(clues.filter((c) => c.animation).map((c) => `${c.category} $${c.value}`)).toEqual(['Spelling Bee $1000'])
  })

  it('has an answer that matches the word it animates: seven letters', () => {
    const clue = clues.find((c) => c.animation)
    expect(countLettersInWord(clue.spellingWord)).toBe(7)
    expect(clue.answer).toMatch(/7/)
  })

  it('loads with no errors or warnings', () => {
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
  })
})
