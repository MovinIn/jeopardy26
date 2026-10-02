export const SPELLING_CHAOS_ANIMATION = 'spellingChaos'

export const SPELLING_CHAOS_TIMING = {
  initialDelayMs: 1500,
  iterationIntervalMs: 100,
  iterationCount: 100,
  postMutationPauseMs: 10_000,
}

export function countLettersInWord(word) {
  return word.length
}

/** Four sorted MCQ labels: always includes current on-screen length plus nearby decoys. */
export function spellingChaosMcqOptions(displayLength) {
  const target = Math.max(1, displayLength)
  const options = new Set([target])
  for (let delta = 1; options.size < 4; delta += 1) {
    if (target - delta >= 1) {
      options.add(target - delta)
    }
    if (options.size < 4) {
      options.add(target + delta)
    }
  }
  return [...options].sort((a, b) => a - b)
}

/** Chance each chaos step appends a letter (otherwise tries to drop a suffix letter). */
export const SPELLING_CHAOS_APPEND_CHANCE = 0.66

/**
 * One chaos step: 66% append random a–z; 33% drop last char if longer than baseWord.
 */
export function nextSpellingChaosState(current, rng, baseWord) {
  if (rng() < SPELLING_CHAOS_APPEND_CHANCE) {
    const letter = String.fromCharCode(97 + Math.floor(rng() * 26))
    return current + letter
  }
  if (current.length > baseWord.length) {
    return current.slice(0, -1)
  }
  return current
}

/** Returns initial state plus each state after `count` mutations. */
export function runSpellingChaosMutations(baseWord, count, rng) {
  const states = [baseWord]
  let current = baseWord
  for (let i = 0; i < count; i += 1) {
    current = nextSpellingChaosState(current, rng, baseWord)
    states.push(current)
  }
  return states
}
