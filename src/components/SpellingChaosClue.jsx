import { useEffect, useState } from 'react'
import {
  SPELLING_CHAOS_TIMING,
  nextSpellingChaosState,
  spellingChaosMcqOptions,
} from '../game/spellingChaos.js'

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}

function fluidWordFontSize(charCount) {
  const n = Math.max(charCount, 1)
  const px = Math.min(72, Math.max(18, Math.floor(520 / n)))
  return `clamp(1.1rem, ${px}px, 4.5rem)`
}

function SpellingChaosMcq({ displayLength, selected, onSelect }) {
  const options = spellingChaosMcqOptions(displayLength)
  return (
    <div className="spelling-chaos-mcq" role="group" aria-label="Letter count choices">
      {options.map((value) => {
        const pressed = selected === value
        return (
          <button
            key={value}
            type="button"
            className={pressed ? 'spelling-chaos-mcq-option spelling-chaos-mcq-option--selected' : 'spelling-chaos-mcq-option'}
            aria-pressed={pressed}
            onClick={() => onSelect(value)}
          >
            {value}
          </button>
        )
      })}
    </div>
  )
}

export function SpellingChaosClue({ word = 'Ezekiel' }) {
  const reducedMotion = usePrefersReducedMotion()
  const [display, setDisplay] = useState(word)
  const [phase, setPhase] = useState(reducedMotion ? 'static' : 'initial')
  const [selectedMcq, setSelectedMcq] = useState(null)

  useEffect(() => {
    if (reducedMotion) {
      return undefined
    }

    const timeouts = []
    const schedule = (fn, ms) => {
      const id = setTimeout(fn, ms)
      timeouts.push(id)
    }

    // A different word remounts this component (see `key` where it is used), so state starts fresh.
    let current = word

    const {
      initialDelayMs,
      iterationIntervalMs,
      iterationCount,
      postMutationPauseMs,
    } = SPELLING_CHAOS_TIMING

    schedule(() => {
      setPhase('mutating')
      for (let i = 0; i < iterationCount; i += 1) {
        schedule(() => {
          current = nextSpellingChaosState(current, Math.random, word)
          setDisplay(current)
        }, i * iterationIntervalMs)
      }
    }, initialDelayMs)

    const mutationDuration = iterationCount * iterationIntervalMs
    schedule(() => {
      setPhase('bounce')
    }, initialDelayMs + mutationDuration + postMutationPauseMs)

    return () => {
      timeouts.forEach(clearTimeout)
    }
  }, [word, reducedMotion])

  const mcq = (
    <SpellingChaosMcq
      displayLength={display.length}
      selected={selectedMcq}
      onSelect={setSelectedMcq}
    />
  )

  if (reducedMotion) {
    return (
      <div className="spelling-chaos spelling-chaos--reduced" data-testid="spelling-chaos">
        <div className="spelling-chaos-stage spelling-chaos-stage--static">
          <p
            className="spelling-chaos-word spelling-chaos-word--static spelling-chaos-word--fit"
            style={{ fontSize: fluidWordFontSize(word.length) }}
          >
            {word}
          </p>
        </div>
        {mcq}
        <p className="spelling-chaos-reduced-note">
          Animated effect (disabled for reduced motion): letters randomly add and remove at the end
          of the word, then the word bounces around the clue area.
        </p>
      </div>
    )
  }

  const bouncing = phase === 'bounce'

  return (
    <div
      className={bouncing ? 'spelling-chaos spelling-chaos--bounce' : 'spelling-chaos'}
      data-testid="spelling-chaos"
    >
      <div className="spelling-chaos-stage" aria-hidden={false}>
        <p
          className={
            bouncing
              ? 'spelling-chaos-word spelling-chaos-word--bouncing spelling-chaos-word--fit'
              : 'spelling-chaos-word spelling-chaos-word--fit'
          }
          style={{ fontSize: fluidWordFontSize(display.length) }}
        >
          {display}
        </p>
      </div>
      {mcq}
    </div>
  )
}
