import { existsSync, readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { resolveClueImageSrc } from '../components/clueMedia.js'
import { validateBoardJson } from '../game/validateBoard.js'

const board = JSON.parse(readFileSync('public/board.json', 'utf8'))
const result = validateBoardJson(board)
const allClues = result.data.categories.flatMap((c) => c.clues.map((clue) => ({ category: c.name, ...clue })))
const withImages = allClues.filter((clue) => clue.image)

describe('the pictures in public/board.json', () => {
  it('give the Math $400 and $800 clues their pictures', () => {
    const math = result.data.categories.find((c) => c.name === 'Math')
    expect(math.clues[1]).toMatchObject({ value: 400, image: '/clues/math-400-sack-balls.svg' })
    expect(math.clues[3]).toMatchObject({ value: 800, image: '/clues/math-800-shapes.png' })
  })

  it('are on those two clues and no others', () => {
    expect(withImages.map((c) => `${c.category} $${c.value}`)).toEqual(['Math $400', 'Math $800'])
  })

  it.each(withImages.map((c) => [`${c.category} $${c.value}`, c.image]))(
    '%s points at a real, non-empty file (%s)',
    (_label, image) => {
      const file = `public${resolveClueImageSrc(image)}`
      expect(existsSync(file)).toBe(true)
      expect(statSync(file).size).toBeGreaterThan(500)
    },
  )

  it('are the right kind of file: an SVG that is really SVG, a PNG that is really a PNG', () => {
    expect(readFileSync('public/clues/math-400-sack-balls.svg', 'utf8')).toMatch(/<svg[\s>]/)
    const png = readFileSync('public/clues/math-800-shapes.png')
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  })
})
