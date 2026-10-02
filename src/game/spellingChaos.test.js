import { describe, expect, it } from 'vitest'
import {
  SPELLING_CHAOS_ANIMATION,
  SPELLING_CHAOS_APPEND_CHANCE,
  countLettersInWord,
  nextSpellingChaosState,
  runSpellingChaosMutations,
  spellingChaosMcqOptions,
} from './spellingChaos.js'

describe('countLettersInWord', () => {
  it('returns 7 when word is Ezekiel', () => {
    expect(countLettersInWord('Ezekiel')).toBe(7)
  })

  it('returns 0 when word is empty', () => {
    expect(countLettersInWord('')).toBe(0)
  })
})

describe('nextSpellingChaosState', () => {
  const base = 'Ezekiel'

  it('uses 66% append and 33% remove when random is above append chance', () => {
    expect(SPELLING_CHAOS_APPEND_CHANCE).toBe(0.66)
  })

  it('appends a lowercase letter when random is below append chance', () => {
    let call = 0
    const rng = () => {
      const values = [0.5, 0]
      return values[call++]
    }
    expect(nextSpellingChaosState(base, rng, base)).toBe('Ezekiela')
  })

  it('removes the last suffix letter when random is at least append chance and length exceeds base', () => {
    const rng = () => 0.9
    expect(nextSpellingChaosState('Ezekielx', rng, base)).toBe('Ezekiel')
  })

  it('keeps base word unchanged when remove is chosen but length equals base', () => {
    const rng = () => 0.9
    expect(nextSpellingChaosState(base, rng, base)).toBe(base)
  })
})

describe('runSpellingChaosMutations', () => {
  it('returns 101 entries when running 100 mutations from the base word', () => {
    const draws = [0.5, 0, 0.9, 0.5, 0]
    let i = 0
    const rng = () => draws[i++] ?? 0.9
    const states = runSpellingChaosMutations('Ezekiel', 2, rng)
    expect(states).toHaveLength(3)
    expect(states[0]).toBe('Ezekiel')
    expect(states[1]).toBe('Ezekiela')
    expect(states[2]).toBe('Ezekiel')
  })

  it('returns initial state plus one entry per mutation when count is 100', () => {
    const states = runSpellingChaosMutations('Ezekiel', 100, () => 0.5)
    expect(states).toHaveLength(101)
    expect(states[0]).toBe('Ezekiel')
  })
})

describe('spellingChaosMcqOptions', () => {
  it('returns 5, 6, 7, and 8 when display length is 7', () => {
    expect(spellingChaosMcqOptions(7)).toEqual([5, 6, 7, 8])
  })

  it('includes display length when display length is 10', () => {
    expect(spellingChaosMcqOptions(10)).toEqual([8, 9, 10, 11])
  })

  it('includes display length when display length is 12', () => {
    const options = spellingChaosMcqOptions(12)
    expect(options).toContain(12)
    expect(options).toHaveLength(4)
  })
})

describe('SPELLING_CHAOS_ANIMATION', () => {
  it('equals spellingChaos for board.json animation field', () => {
    expect(SPELLING_CHAOS_ANIMATION).toBe('spellingChaos')
  })
})
