import { useEffect, useRef, useState } from 'react'
import {
  PASSAGE,
  TARGET_WPM,
  TIME_LIMIT_MS,
  WORDS,
  correctPrefix,
  createGame,
  paceIndex,
  shiftClock,
  tick,
  typeKey,
  wordsDone,
  wordsPerMinute,
  wordsReached,
} from '../game/typing.js'
import { formatMoney } from '../game/scoring.js'
import { play } from '../audio/sfx.js'

const CLOCK_STEP_MS = 100

function paceMessage(aheadWords) {
  if (Math.abs(aheadWords) < 0.5) {
    return { text: 'Right on pace', tone: 'even' }
  }
  const words = Math.abs(aheadWords).toFixed(1)
  return aheadWords > 0
    ? { text: `Ahead of pace by ${words} words`, tone: 'ahead' }
    : { text: `Behind pace by ${words} words`, tone: 'behind' }
}

/**
 * Typing test for `team`, played for `stake` points: type the 40-word passage at 80 WPM or
 * faster to win; run out of time and lose. Like SnakeGame it reports to the parent instead of
 * touching scores: `onStart` on the first key, `onFinish(won)` once at the end, `onExit` from the
 * result card.
 */
export function TypingGame({ team, stake, onStart, onFinish, onExit, makeGame = createGame }) {
  const [game, setGame] = useState(() => makeGame())
  const [now, setNow] = useState(0)
  const onStartRef = useRef(onStart)
  const onFinishRef = useRef(onFinish)
  const startedRef = useRef(false)
  const finishedRef = useRef(false)
  const prevTypedRef = useRef(game.typed)

  useEffect(() => {
    onStartRef.current = onStart
    onFinishRef.current = onFinish
  })

  // Typing: every character goes into the passage, Backspace deletes.
  useEffect(() => {
    function onKeyDown(event) {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return
      }
      const key = event.key
      if (key !== 'Backspace' && key.length !== 1) {
        return
      }
      event.preventDefault() // no page scroll on space, no browser "back" on backspace
      const at = performance.now()
      setGame((g) => typeKey(g, key, at))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Time spent on another tab is not held against the typist: the clock is shifted by it.
  useEffect(() => {
    let hiddenAt = null
    function onVisibilityChange() {
      if (document.hidden) {
        hiddenAt = performance.now()
        return
      }
      if (hiddenAt === null) {
        return
      }
      const away = performance.now() - hiddenAt
      hiddenAt = null
      setGame((g) => shiftClock(g, away))
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  // The clock: refreshes the pace marker and ends the game when time runs out.
  useEffect(() => {
    if (game.status !== 'playing') {
      return undefined
    }
    const timer = window.setInterval(() => {
      if (document.hidden) {
        return // the clock is stopped while the tab is hidden
      }
      const at = performance.now()
      setNow(at)
      setGame((g) => tick(g, at))
    }, CLOCK_STEP_MS)
    return () => window.clearInterval(timer)
  }, [game.status])

  // Tell the parent when play begins (so it can lock the exit) and once when it ends.
  useEffect(() => {
    if (game.status === 'playing' && !startedRef.current) {
      startedRef.current = true
      onStartRef.current?.()
    }
    if ((game.status === 'won' || game.status === 'lost') && !finishedRef.current) {
      finishedRef.current = true
      play(game.status === 'won' ? 'win' : 'lose')
      onFinishRef.current?.(game.status === 'won')
    }
  }, [game.status])

  // A keystroke click for every right letter, a buzz for a wrong one, a tick for backspace.
  useEffect(() => {
    const before = prevTypedRef.current
    prevTypedRef.current = game.typed
    if (game.typed.length > before.length) {
      const i = game.typed.length - 1
      play(game.typed[i] === PASSAGE[i] ? 'key' : 'typo')
    } else if (game.typed.length < before.length) {
      play('tick')
    }
  }, [game.typed])

  const over = game.status === 'won' || game.status === 'lost'
  const won = game.status === 'won'
  const started = game.startedAt !== null

  let elapsed = 0
  if (over) {
    elapsed = game.finishedMs
  } else if (started) {
    elapsed = Math.max(0, now - game.startedAt)
  }

  const done = correctPrefix(game.typed)
  const words = wordsDone(game.typed)
  const pace = started ? paceIndex(elapsed) : 0
  const paceWords = (pace / PASSAGE.length) * WORDS
  const liveWpm = elapsed >= 1000 ? Math.round(wordsPerMinute(words, elapsed)) : 0
  const timeLeft = Math.max(0, TIME_LIMIT_MS - elapsed) / 1000
  const message = paceMessage(words - paceWords)
  const finalWpm = won
    ? Math.round(wordsPerMinute(WORDS, game.finishedMs))
    : Math.round(wordsPerMinute(words, game.finishedMs ?? 0))

  return (
    <div className="tp-room">
      <p className="rl-team">
        <strong>{team.name}</strong>: type all {WORDS} words at {TARGET_WPM} WPM or faster to win{' '}
        {formatMoney(stake)}. Too slow and you lose {formatMoney(stake)}.
      </p>

      <div className="tp-stats">
        <div className="tp-stat">
          <p className="tp-stat-label">Time left</p>
          <p className="tp-stat-value" aria-label="Time left">
            {timeLeft.toFixed(1)}s
          </p>
        </div>
        <div className="tp-stat">
          <p className="tp-stat-label">Your speed</p>
          <p className="tp-stat-value" aria-label="Your speed">
            {liveWpm} <small>WPM</small>
          </p>
        </div>
        <div className="tp-stat">
          <p className="tp-stat-label">Needed</p>
          <p className="tp-stat-value tp-target">
            {TARGET_WPM} <small>WPM</small>
          </p>
        </div>
      </div>

      <div className="tp-lanes" aria-hidden="true">
        <div className="tp-lane">
          <span className="tp-lane-name">You</span>
          <div className="tp-track">
            <div className="tp-fill you" style={{ width: `${(done / PASSAGE.length) * 100}%` }} />
          </div>
        </div>
        <div className="tp-lane">
          <span className="tp-lane-name">{TARGET_WPM} WPM</span>
          <div className="tp-track">
            <div className="tp-fill pace" style={{ width: `${(pace / PASSAGE.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <p className={`tp-pace tp-pace-${message.tone}`} aria-live="off">
        {started && !over ? message.text : ' '}
      </p>

      <div className="tp-text-frame">
        <p className="tp-text" aria-label="Passage to type">
          {Array.from(PASSAGE).map((char, i) => {
            const typedChar = game.typed[i]
            let state = 'todo'
            if (typedChar !== undefined) {
              state = typedChar === char ? 'ok' : 'wrong'
            }
            const classes = ['tp-char', `tp-${state}`]
            if (!over && i === game.typed.length) {
              classes.push('tp-cursor')
            }
            if (started && i === pace) {
              classes.push('tp-ghost')
            }
            return (
              <span key={i} className={classes.join(' ')} data-index={i}>
                {char}
              </span>
            )
          })}
          {started && pace >= PASSAGE.length && (
            <span className="tp-char tp-ghost" data-index={PASSAGE.length}>
              {'​'}
            </span>
          )}
        </p>

        {game.status === 'ready' && (
          <div className="tp-overlay">
            <p>Start typing to begin. The clock starts on your first key.</p>
          </div>
        )}
      </div>

      {over && (
        <div className="rl-result" data-outcome={won ? 'win' : 'lose'}>
          <p className="rl-message">
            {won
              ? `You typed ${WORDS} words at ${finalWpm} WPM!`
              : `Time's up. You needed ${TARGET_WPM} WPM.`}
          </p>
          <p className="sn-final">
            {won
              ? `Beat the ${TARGET_WPM} WPM pace`
              : `Got to word ${wordsReached(game.typed)} of ${WORDS} (${finalWpm} WPM)`}
          </p>
          <p className="rl-delta">
            {won ? '+' : '−'}
            {formatMoney(stake)}
          </p>
          <button type="button" onClick={onExit}>
            Back to board
          </button>
        </div>
      )}
    </div>
  )
}
