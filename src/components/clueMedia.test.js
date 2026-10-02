import { describe, expect, it } from 'vitest'
import { resolveClueImageSrc } from './clueMedia.js'

describe('resolveClueImageSrc', () => {
  it('returns null when image is missing or blank', () => {
    expect(resolveClueImageSrc(undefined)).toBe(null)
    expect(resolveClueImageSrc(null)).toBe(null)
    expect(resolveClueImageSrc('   ')).toBe(null)
    expect(resolveClueImageSrc(42)).toBe(null)
  })

  it('returns absolute public path when image starts with slash', () => {
    expect(resolveClueImageSrc('/clues/math-400-sack-balls.svg')).toBe('/clues/math-400-sack-balls.svg')
  })

  it('prefixes slash when image is a relative public path', () => {
    expect(resolveClueImageSrc('clues/diagram.svg')).toBe('/clues/diagram.svg')
  })

  it('trims stray spaces', () => {
    expect(resolveClueImageSrc('  /clues/a.png ')).toBe('/clues/a.png')
  })
})
