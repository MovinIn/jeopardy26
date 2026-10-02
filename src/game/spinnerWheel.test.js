import { describe, expect, it } from 'vitest'
import {
  buildConicGradient,
  computeNextRotation,
  dividerRotateDeg,
  normalizeDeg,
  wedgeCenterDeg,
} from './spinnerWheel.js'

describe('dividerRotateDeg', () => {
  it('places first divider at 12 o-clock (0 degrees) when count is 5', () => {
    expect(dividerRotateDeg(0, 5)).toBe(0)
  })

  it('aligns each divider with the start of each wedge', () => {
    expect(dividerRotateDeg(1, 5)).toBe(72)
    expect(dividerRotateDeg(2, 5)).toBe(144)
    expect(dividerRotateDeg(3, 5)).toBe(216)
    expect(dividerRotateDeg(4, 5)).toBe(288)
  })
})

describe('wedgeCenterDeg', () => {
  it('places wedge center exactly halfway between its bounding dividers', () => {
    expect(wedgeCenterDeg(0, 5)).toBe(36)
    expect(wedgeCenterDeg(1, 5)).toBe(108)
    expect(wedgeCenterDeg(2, 5)).toBe(180)
    expect(wedgeCenterDeg(3, 5)).toBe(252)
    expect(wedgeCenterDeg(4, 5)).toBe(324)
  })
})

describe('buildConicGradient', () => {
  it('starts gradient at 0deg (12 o-clock) so color 0 matches wedge 0', () => {
    const gradient = buildConicGradient(5)
    expect(gradient).toMatch(/^conic-gradient\(from 0deg,/)
  })
})

describe('computeNextRotation', () => {
  it('lands wedge center exactly under pointer (12 o-clock / 0deg) from rest', () => {
    for (let i = 0; i < 5; i += 1) {
      const next = computeNextRotation(0, i, 5)
      const center = wedgeCenterDeg(i, 5)
      // When the wheel rotates by `next`, the point at `center` moves to (center + next) % 360
      expect(normalizeDeg(center + next)).toBe(0)
      expect(next).toBeGreaterThanOrEqual(360 * 7)
    }
  })

  it('advances in forward direction and lands wedge center under pointer from existing rotation', () => {
    let rotation = 0
    const sequence = [2, 0, 4, 1, 3, 3]
    for (const targetIndex of sequence) {
      const next = computeNextRotation(rotation, targetIndex, 5)
      expect(next).toBeGreaterThan(rotation)
      const center = wedgeCenterDeg(targetIndex, 5)
      expect(normalizeDeg(center + next)).toBe(0)
      rotation = next
    }
  })
})
