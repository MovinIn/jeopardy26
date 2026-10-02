import { useEffect, useRef, useState } from 'react'
import {
  PINK_WINDOW_MS,
  REACTION_LIMIT_MS,
  TRIES,
  createGame,
  describeTry,
  interruptAttempt,
  makeSequence,
  miss,
  press,
  refinePink,
  restartAttempt,
  showColor,
  showPink,
  startAttempt,
  triesLeft,
} from '../game/reaction.js'
import { formatMoney } from '../game/scoring.js'
import { play } from '../audio/sfx.js'

const NEUTRAL = '#0b1030'
const ACTIVE_PHASES = ['warmup', 'flash', 'pink']
// For people who asked their system for less motion: no quick flickers.
const CALM_MIN_FLASH_MS = 400

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
}

function Tries({ game }) {
  return (
    <ol className="rx-tries" aria-label="Tries">
      {Array.from({ length: TRIES }, (_, i) => {
        const result = game.tries[i]
        let state = 'pending'
        if (result) {
          state = result.ok ? 'win' : 'fail'
        } else if (game.status === 'playing' && i === game.tries.length) {
          state = 'current'
        }
        return (
          <li key={i} className="rx-try" data-state={state}>
            <span aria-hidden="true">{result ? (result.ok ? '✓' : '✕') : i + 1}</span>
            <span className="rx-sr">
              Try {i + 1}: {state === 'win' ? 'passed' : state === 'fail' ? 'failed' : state === 'current' ? 'in progress' : 'not used yet'}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Reaction test for `team`, played for `stake` points: press only when the screen turns PINK, and
 * within 350 ms. Random colours flash first to fool you; pressing on any of them fails the try.
 * Three tries. Like SnakeGame it reports to the parent instead of touching scores: `onStart` when
 * the first try begins, `onFinish(won)` once at the end, `onExit` from the result card.
 */
export function ReactionGame({ team, stake, onStart, onFinish, onExit, makeGame = createGame, makeScript = makeSequence }) {
  const [game, setGame] = useState(() => makeGame())
  const onStartRef = useRef(onStart)
  const onFinishRef = useRef(onFinish)
  const startedRef = useRef(false)
  const finishedRef = useRef(false)
  const triesSeenRef = useRef(game.tries.length)

  useEffect(() => {
    onStartRef.current = onStart
    onFinishRef.current = onFinish
  })

  const active = ACTIVE_PHASES.includes(game.phase)

  function pressNow() {
    const at = performance.now()
    setGame((g) => press(g, at))
  }

  // Switching to another tab calls the try off (hidden tabs don't keep time properly), unpenalised.
  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) {
        setGame((g) => interruptAttempt(g))
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  // Space or Enter counts as a press while a try is running; otherwise they work as normal.
  useEffect(() => {
    function onKeyDown(event) {
      if ((event.key !== ' ' && event.key !== 'Enter') || event.repeat) {
        return
      }
      if (!active) {
        return
      }
      event.preventDefault()
      pressNow()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active])

  // The script for a try: a quiet warm-up, a run of decoy colours, then pink.
  const scripting = game.phase === 'warmup' || game.phase === 'flash'
  useEffect(() => {
    if (!scripting) {
      return undefined
    }
    const script = makeScript()
    const calm = prefersReducedMotion()
    const timers = []
    let at = script.warmupMs
    for (const flash of script.flashes) {
      timers.push(window.setTimeout(() => setGame((g) => showColor(g, flash.color)), at))
      at += calm ? Math.max(flash.ms, CALM_MIN_FLASH_MS) : flash.ms
    }
    timers.push(window.setTimeout(() => setGame((g) => showPink(g, performance.now())), at))
    return () => timers.forEach((id) => window.clearTimeout(id))
    // A new try (a new attempt number) gets a fresh script.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scripting, game.attempt])

  // Pink: time from when it is really on screen, and give up waiting after a while.
  const pinkShowing = game.phase === 'pink'
  useEffect(() => {
    if (!pinkShowing) {
      return undefined
    }
    const frame = window.requestAnimationFrame(() => setGame((g) => refinePink(g, performance.now())))
    const giveUp = window.setTimeout(() => setGame((g) => miss(g)), PINK_WINDOW_MS)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(giveUp)
    }
  }, [pinkShowing, game.attempt])

  // Tell the parent when play begins (so it can lock the exit) and once when it ends.
  useEffect(() => {
    if (game.status === 'playing' && !startedRef.current) {
      startedRef.current = true
      onStartRef.current?.()
    }
    if ((game.status === 'won' || game.status === 'lost') && !finishedRef.current) {
      finishedRef.current = true
      onFinishRef.current?.(game.status === 'won')
    }
  }, [game.status])

  // A sound for each try: a win jingle, a buzzer, and the trombone when the last try is lost.
  useEffect(() => {
    if (game.tries.length === triesSeenRef.current) {
      return
    }
    triesSeenRef.current = game.tries.length
    const last = game.tries[game.tries.length - 1]
    if (last.ok) {
      play('win')
      play('coin')
    } else if (game.status === 'lost') {
      play('lose')
    } else {
      play('wrong')
    }
  }, [game.tries, game.status])

  const over = game.status === 'won' || game.status === 'lost'
  const won = game.status === 'won'
  const left = triesLeft(game)

  let content = null
  if (game.status === 'ready') {
    content = (
      <div className="rx-card">
        <p className="rx-card-title">Ready?</p>
        <p>
          Colours will flash. <strong>Only press when the screen turns pink.</strong> Press on green, or
          any other colour, and that try fails.
        </p>
        <p className="rx-warning">Warning: flashing colours.</p>
        <button type="button" onClick={() => setGame((g) => startAttempt(g))}>
          Start try 1
        </button>
      </div>
    )
  } else if (game.phase === 'warmup') {
    content = <p className="rx-wait">Get ready… wait for pink</p>
  } else if (game.phase === 'interrupted') {
    content = (
      <div className="rx-card">
        <p className="rx-card-title">Paused</p>
        <p>You switched away, so that try was called off. It does not count against you.</p>
        <button type="button" onClick={() => setGame((g) => restartAttempt(g))}>
          Restart try {game.attempt}
        </button>
      </div>
    )
  } else if (game.phase === 'result') {
    content = (
      <div className="rx-card" data-outcome={game.last.ok ? 'win' : 'lose'}>
        <p className="rx-card-title">
          {won && `You did it! ${game.last.ms} ms`}
          {game.status === 'lost' && 'Out of tries.'}
          {game.status === 'playing' && 'Try failed.'}
        </p>
        <p>{describeTry(game.last)}</p>
        {game.status === 'playing' && (
          <>
            <p className="rx-left">
              {left} {left === 1 ? 'try' : 'tries'} left
            </p>
            <button type="button" onClick={() => setGame((g) => startAttempt(g))}>
              Start try {game.attempt + 1}
            </button>
          </>
        )}
        {over && (
          <>
            <p className="rl-delta">
              {won ? '+' : '−'}
              {formatMoney(stake)}
            </p>
            <button type="button" onClick={onExit}>
              Back to board
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="rx-room">
      <h3 className="rx-title">
        Only press when <span className="rx-pink">pink</span>!
      </h3>
      <p className="rl-team">
        <strong>{team.name}</strong>: react in under {REACTION_LIMIT_MS} ms to win {formatMoney(stake)}.
        You get {TRIES} tries; fail them all and you lose {formatMoney(stake)}.
      </p>

      <Tries game={game} />

      <div
        className="rx-panel"
        role="button"
        tabIndex={0}
        aria-label="Reaction panel"
        data-phase={game.phase}
        style={{ background: game.color?.hex ?? NEUTRAL }}
        onPointerDown={() => {
          if (active) {
            pressNow()
          }
        }}
      >
        {content}
      </div>
    </div>
  )
}
