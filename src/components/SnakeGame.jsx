import { memo, useEffect, useRef, useState } from 'react'
import { APPLES_TO_WIN, COLS, DIRS, ROWS, TICK_MS, createGame, step, turn } from '../game/snake.js'
import { formatMoney } from '../game/scoring.js'
import { usePageVisible } from '../hooks/usePageVisible.js'
import { play } from '../audio/sfx.js'

const KEY_DIRECTIONS = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
}

const LOSS_REASONS = {
  wall: 'You hit the wall.',
  self: 'You ran into yourself.',
}

/** The checkerboard never changes, so draw it once. */
const Checkerboard = memo(function Checkerboard() {
  return Array.from({ length: COLS * ROWS }, (_, i) => {
    const x = i % COLS
    const y = Math.floor(i / COLS)
    return (
      <rect
        key={i}
        x={x}
        y={y}
        width="1"
        height="1"
        fill={(x + y) % 2 === 0 ? '#aad751' : '#a2d149'}
      />
    )
  })
})

function Apple({ x, y }) {
  const cx = x + 0.5
  const cy = y + 0.56
  return (
    <g aria-hidden="true">
      <ellipse cx={cx} cy={y + 0.9} rx="0.32" ry="0.08" fill="#000" opacity="0.18" />
      <circle cx={cx} cy={cy} r="0.37" fill="#e7471d" />
      <circle cx={cx - 0.12} cy={cy - 0.12} r="0.09" fill="#fff" opacity="0.55" />
      <path
        d={`M${cx} ${cy - 0.32} q0.04 -0.16 0.12 -0.22`}
        stroke="#5b3a1e"
        strokeWidth="0.07"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx={cx + 0.17} cy={cy - 0.4} rx="0.16" ry="0.07" fill="#3f9a2b" transform={`rotate(-25 ${cx + 0.17} ${cy - 0.4})`} />
    </g>
  )
}

function Snake({ snake, dir }) {
  const points = [...snake].reverse().map((part) => `${part.x + 0.5},${part.y + 0.5}`).join(' ')
  const head = snake[0]
  const hx = head.x + 0.5
  const hy = head.y + 0.5
  const { x: fx, y: fy } = DIRS[dir]
  // Eyes sit either side of the heading and a little forward.
  const sideX = Math.abs(fy) * 0.22
  const sideY = Math.abs(fx) * 0.22
  const eyes = [-1, 1].map((sign) => ({
    x: hx + fx * 0.14 + sideX * sign,
    y: hy + fy * 0.14 + sideY * sign,
  }))

  return (
    <g aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="#4a7cf3"
        strokeWidth="0.78"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {eyes.map((eye, i) => (
        <g key={i}>
          <circle cx={eye.x} cy={eye.y} r="0.15" fill="#fff" />
          <circle cx={eye.x + fx * 0.05} cy={eye.y + fy * 0.05} r="0.075" fill="#1a1a2e" />
        </g>
      ))}
    </g>
  )
}

/**
 * Snake for `team`, played for `stake` points: collect 10 apples to win, or crash into a wall or
 * yourself and lose. Reports to the parent instead of touching scores itself:
 * `onStart` fires on the first key, `onFinish(won)` once when the game ends, and `onExit` is the
 * button on the result card.
 */
export function SnakeGame({ team, stake, onStart, onFinish, onExit, makeGame = createGame }) {
  const [game, setGame] = useState(() => makeGame())
  const visible = usePageVisible()
  const onStartRef = useRef(onStart)
  const onFinishRef = useRef(onFinish)
  const startedRef = useRef(false)
  const finishedRef = useRef(false)
  const lastScoreRef = useRef(game.score)

  useEffect(() => {
    onStartRef.current = onStart
    onFinishRef.current = onFinish
  })

  // Steering: arrow keys or WASD.
  useEffect(() => {
    function onKeyDown(event) {
      const dir = KEY_DIRECTIONS[event.key] ?? KEY_DIRECTIONS[event.key.toLowerCase?.()]
      if (!dir) {
        return
      }
      event.preventDefault()
      setGame((g) => turn(g, dir))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // The clock only runs while the snake is alive and moving, and the tab is on screen.
  useEffect(() => {
    if (game.status !== 'playing' || !visible) {
      return undefined
    }
    const timer = window.setInterval(() => setGame((g) => step(g)), TICK_MS)
    return () => window.clearInterval(timer)
  }, [game.status, visible])

  // Tell the parent when play begins (so it can lock the exit) and once when it ends.
  useEffect(() => {
    if (game.status === 'playing' && !startedRef.current) {
      startedRef.current = true
      onStartRef.current?.()
    }
    if ((game.status === 'won' || game.status === 'lost') && !finishedRef.current) {
      finishedRef.current = true
      if (game.status === 'lost') {
        play('crash')
      }
      play(game.status === 'won' ? 'win' : 'lose')
      onFinishRef.current?.(game.status === 'won')
    }
  }, [game.status])

  // A bright blip for every apple.
  useEffect(() => {
    if (game.score > lastScoreRef.current) {
      play('eat')
    }
    lastScoreRef.current = game.score
  }, [game.score])

  const over = game.status === 'won' || game.status === 'lost'
  const won = game.status === 'won'

  return (
    <div className="sn-room">
      <p className="rl-team">
        <strong>{team.name}</strong>: collect {APPLES_TO_WIN} apples to win {formatMoney(stake)}.
        Crash and you lose {formatMoney(stake)}.
      </p>

      <div className="sn-frame">
        <div className="sn-header">
          <span className="sn-apple-icon" aria-hidden="true">
            🍎
          </span>
          <span className="sn-score" aria-label="Apples collected">
            {game.score}
          </span>
          <span className="sn-goal">/ {APPLES_TO_WIN}</span>
        </div>

        <div className="sn-board-wrap">
          <svg
            className="sn-board"
            viewBox={`0 0 ${COLS} ${ROWS}`}
            role="img"
            aria-label="Snake board"
          >
            <Checkerboard />
            {game.apple && <Apple x={game.apple.x} y={game.apple.y} />}
            <Snake snake={game.snake} dir={game.dir} />
          </svg>

          {game.status === 'ready' && (
            <div className="sn-overlay">
              <p>Press an arrow key or W A S D to start</p>
            </div>
          )}
        </div>
      </div>

      {!over && (
        <div className="sn-dpad" role="group" aria-label="Steering">
          <button type="button" className="secondary sn-up" aria-label="Up" onClick={() => setGame((g) => turn(g, 'up'))}>
            ▲
          </button>
          <button type="button" className="secondary sn-left" aria-label="Left" onClick={() => setGame((g) => turn(g, 'left'))}>
            ◀
          </button>
          <button type="button" className="secondary sn-down" aria-label="Down" onClick={() => setGame((g) => turn(g, 'down'))}>
            ▼
          </button>
          <button type="button" className="secondary sn-right" aria-label="Right" onClick={() => setGame((g) => turn(g, 'right'))}>
            ▶
          </button>
        </div>
      )}

      {over && (
        <div className="rl-result" data-outcome={won ? 'win' : 'lose'}>
          <p className="rl-message">
            {won ? `You collected all ${APPLES_TO_WIN} apples!` : LOSS_REASONS[game.reason]}
          </p>
          <p className="sn-final">
            Apples: {game.score} / {APPLES_TO_WIN}
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
