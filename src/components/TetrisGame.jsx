import { useEffect, useRef, useState } from 'react'
import {
  COLS,
  LINES_TO_WIN,
  PIECE_COLORS,
  ROWS,
  SHRINK_EVERY_MS,
  WALL,
  cellsOf,
  gravityMs,
  hardDrop,
  landingPiece,
  moveSideways,
  pieceCells,
  rotate,
  shrinkCeiling,
  start,
  tick,
  createGame,
} from '../game/tetris.js'
import { formatMoney } from '../game/scoring.js'
import { usePageVisible } from '../hooks/usePageVisible.js'
import { play } from '../audio/sfx.js'

const CELL = 30

const LOSS_MESSAGES = {
  topout: 'The stack reached the top.',
  squeezed: 'The ceiling crushed your stack.',
}

const KEY_ACTIONS = {
  ArrowLeft: 'left',
  a: 'left',
  A: 'left',
  ArrowRight: 'right',
  d: 'right',
  D: 'right',
  ArrowDown: 'down',
  s: 'down',
  S: 'down',
  ArrowUp: 'rotate',
  w: 'rotate',
  W: 'rotate',
  x: 'rotate',
  X: 'rotate',
  z: 'rotateBack',
  Z: 'rotateBack',
  ' ': 'drop',
}

// Holding a key repeats moves, but a held turn or drop would spin or slam every piece.
const REPEATABLE = new Set(['left', 'right', 'down'])

function apply(game, action) {
  switch (action) {
    case 'left':
      return moveSideways(game, -1)
    case 'right':
      return moveSideways(game, 1)
    case 'down':
      return tick(game)
    case 'rotate':
      return rotate(game, 1)
    case 'rotateBack':
      return rotate(game, -1)
    case 'drop':
      return hardDrop(game)
    default:
      return game
  }
}

// How close to a drop (ms) the warning flash starts on the row that is about to become wall.
const WARNING_MS = 3000

function Block({ x, y, color, ghost = false, wall = false }) {
  if (wall) {
    const wx = x * CELL
    const wy = y * CELL
    return (
      <g data-wall="true">
        <rect x={wx} y={wy} width={CELL} height={CELL} fill="#4a4f6e" stroke="#2b2e45" strokeWidth="1.5" />
        <path
          d={`M${wx} ${wy + CELL} L${wx + CELL} ${wy} M${wx} ${wy + CELL / 2} L${wx + CELL / 2} ${wy} M${wx + CELL / 2} ${wy + CELL} L${wx + CELL} ${wy + CELL / 2}`}
          stroke="#7d84ad"
          strokeWidth="2"
          opacity="0.55"
        />
      </g>
    )
  }
  if (ghost) {
    return (
      <rect
        x={x * CELL + 2}
        y={y * CELL + 2}
        width={CELL - 4}
        height={CELL - 4}
        rx="3"
        fill={color}
        fillOpacity="0.14"
        stroke={color}
        strokeOpacity="0.6"
        strokeWidth="2"
      />
    )
  }
  const px = x * CELL
  const py = y * CELL
  return (
    <g>
      <rect x={px + 1} y={py + 1} width={CELL - 2} height={CELL - 2} rx="3" fill={color} stroke="rgba(0,0,0,0.55)" strokeWidth="1.5" />
      <rect x={px + 4} y={py + 4} width={CELL - 8} height={CELL - 8} rx="2" fill="#fff" fillOpacity="0.2" />
      <rect x={px + 3} y={py + CELL - 7} width={CELL - 6} height="4" rx="2" fill="#000" fillOpacity="0.22" />
    </g>
  )
}

function NextPiece({ type }) {
  const cells = pieceCells(type, 0)
  const xs = cells.map(([x]) => x)
  const ys = cells.map(([, y]) => y)
  const width = Math.max(...xs) - Math.min(...xs) + 1
  const height = Math.max(...ys) - Math.min(...ys) + 1
  // Centre the piece in a 4 x 4 preview.
  const offsetX = (4 - width) / 2 - Math.min(...xs)
  const offsetY = (4 - height) / 2 - Math.min(...ys)
  return (
    <svg className="tt-next" viewBox={`0 0 ${4 * CELL} ${4 * CELL}`} role="img" aria-label={`Next piece: ${type}`}>
      {cells.map(([x, y]) => (
        <Block key={`${x},${y}`} x={x + offsetX} y={y + offsetY} color={PIECE_COLORS[type]} />
      ))}
    </svg>
  )
}

/**
 * Tetris for `team`, played for `stake` points: clear 5 lines to win, or let the stack reach the
 * top and lose. Like SnakeGame it reports to the parent instead of touching scores:
 * `onStart` on the first key, `onFinish(won)` once at the end, `onExit` from the result card.
 */
export function TetrisGame({ team, stake, onStart, onFinish, onExit, makeGame = createGame }) {
  const [game, setGame] = useState(() => makeGame())
  const [msLeft, setMsLeft] = useState(SHRINK_EVERY_MS)
  const visible = usePageVisible()
  const countdownRef = useRef(SHRINK_EVERY_MS)
  const onStartRef = useRef(onStart)
  const onFinishRef = useRef(onFinish)
  const startedRef = useRef(false)
  const finishedRef = useRef(false)
  const prevGameRef = useRef(game)
  const warnedSecondRef = useRef(null)

  useEffect(() => {
    onStartRef.current = onStart
    onFinishRef.current = onFinish
  })

  // Keyboard. The first control pressed starts the game and is applied too.
  useEffect(() => {
    function onKeyDown(event) {
      const action = KEY_ACTIONS[event.key]
      if (!action) {
        return
      }
      event.preventDefault()
      if (event.repeat && !REPEATABLE.has(action)) {
        return
      }
      setGame((g) => apply(start(g), action))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Gravity: the piece falls a row every gravityMs, faster as lines are cleared. It stands still
  // while the tab is hidden.
  useEffect(() => {
    if (game.status !== 'playing' || !visible) {
      return undefined
    }
    const timer = window.setInterval(() => setGame((g) => tick(g)), gravityMs(game.lines))
    return () => window.clearInterval(timer)
  }, [game.status, game.lines, visible])

  // The ceiling: every 15 seconds of play the top of the well is walled off one more row. The
  // countdown pauses while the tab is hidden, so coming back never drops the ceiling in a burst.
  useEffect(() => {
    if (game.status !== 'playing' || !visible) {
      return undefined
    }
    let last = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now()
      countdownRef.current -= now - last
      last = now
      if (countdownRef.current <= 0) {
        countdownRef.current += SHRINK_EVERY_MS
        warnedSecondRef.current = null
        setGame((g) => shrinkCeiling(g))
      } else {
        // A beep for each of the last three seconds before the ceiling drops.
        const seconds = Math.ceil(countdownRef.current / 1000)
        if (seconds <= 3 && seconds !== warnedSecondRef.current) {
          warnedSecondRef.current = seconds
          play('warning')
        }
      }
      setMsLeft(countdownRef.current)
    }, 250)
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
      play(game.status === 'won' ? 'win' : 'lose')
      onFinishRef.current?.(game.status === 'won')
    }
  }, [game.status])

  // Sounds follow what changed on the board: slides, turns, landings, cleared lines, the ceiling.
  useEffect(() => {
    const before = prevGameRef.current
    prevGameRef.current = game
    if (before === game) {
      return
    }
    if (game.lines > before.lines) {
      play('lineClear', { lines: game.lines - before.lines })
    } else if (game.bag !== before.bag) {
      play('lock') // a new piece was dealt, so the last one landed
    } else if (game.piece && before.piece && game.piece.type === before.piece.type) {
      if (game.piece.rot !== before.piece.rot) {
        play('rotate')
      } else if (game.piece.x !== before.piece.x) {
        play('move')
      }
    }
    if (game.ceiling > before.ceiling) {
      play('ceiling')
    }
  }, [game])

  const over = game.status === 'won' || game.status === 'lost'
  const won = game.status === 'won'
  const ghost = game.status === 'playing' && game.piece ? landingPiece(game) : null

  function press(action) {
    setGame((g) => apply(start(g), action))
  }

  return (
    <div className="tt-room">
      <p className="rl-team">
        <strong>{team.name}</strong>: clear {LINES_TO_WIN} lines to win {formatMoney(stake)}. Let the
        stack reach the top and you lose {formatMoney(stake)}. The ceiling drops a row every{' '}
        {SHRINK_EVERY_MS / 1000} seconds, so no stalling.
      </p>

      <div className="tt-layout">
        <div className="tt-frame">
          <svg
            className="tt-board"
            viewBox={`0 0 ${COLS * CELL} ${ROWS * CELL}`}
            role="img"
            aria-label="Tetris board"
          >
            <defs>
              <pattern id="tt-grid" width={CELL} height={CELL} patternUnits="userSpaceOnUse">
                <rect width={CELL} height={CELL} fill="#0a0e2a" />
                <path d={`M${CELL} 0V${CELL}H0`} fill="none" stroke="#1a2152" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width={COLS * CELL} height={ROWS * CELL} fill="url(#tt-grid)" />

            {game.board.map((row, y) =>
              row.map((cell, x) =>
                cell ? (
                  <Block key={`${x},${y}`} x={x} y={y} color={PIECE_COLORS[cell]} wall={cell === WALL} />
                ) : null,
              ),
            )}
            {game.status === 'playing' && msLeft <= WARNING_MS && game.ceiling < ROWS && (
              <rect
                className="tt-warning"
                x="0"
                y={game.ceiling * CELL}
                width={COLS * CELL}
                height={CELL}
                fill="#ff3b3b"
              />
            )}
            {ghost &&
              cellsOf(ghost).map(([x, y]) => (
                <Block key={`g${x},${y}`} x={x} y={y} color={PIECE_COLORS[ghost.type]} ghost />
              ))}
            {game.piece &&
              cellsOf(game.piece).map(([x, y]) =>
                y >= 0 ? <Block key={`p${x},${y}`} x={x} y={y} color={PIECE_COLORS[game.piece.type]} /> : null,
              )}
          </svg>

          {game.status === 'ready' && (
            <div className="tt-overlay">
              <p>Press any arrow key to start</p>
            </div>
          )}
        </div>

        <div className="tt-side">
          <div className="tt-panel">
            <p className="tt-panel-label">Lines</p>
            <p className="tt-lines" aria-label="Lines cleared">
              {game.lines}
              <span className="tt-lines-goal"> / {LINES_TO_WIN}</span>
            </p>
          </div>
          <div className={`tt-panel tt-ceiling${msLeft <= WARNING_MS && game.status === 'playing' ? ' is-warning' : ''}`}>
            <p className="tt-panel-label">Ceiling drops in</p>
            <p className="tt-ceiling-time">
              <span aria-label="Seconds until the ceiling drops">{Math.ceil(msLeft / 1000)}s</span>
            </p>
            <div className="tt-ceiling-track" aria-hidden="true">
              <div className="tt-ceiling-fill" style={{ width: `${(msLeft / SHRINK_EVERY_MS) * 100}%` }} />
            </div>
            <p className="tt-ceiling-rows">
              Rows lost: <strong aria-label="Rows walled off">{game.ceiling}</strong>
            </p>
          </div>
          <div className="tt-panel">
            <p className="tt-panel-label">Next</p>
            <NextPiece type={game.next} />
          </div>
          <div className="tt-panel tt-help">
            <p>← → move</p>
            <p>↑ rotate</p>
            <p>↓ soft drop</p>
            <p>Space drop</p>
          </div>
        </div>
      </div>

      {!over && (
        <div className="tt-controls" role="group" aria-label="Controls">
          <button type="button" className="secondary" aria-label="Move left" onClick={() => press('left')}>
            ◀
          </button>
          <button type="button" className="secondary" aria-label="Rotate" onClick={() => press('rotate')}>
            ⟳
          </button>
          <button type="button" className="secondary" aria-label="Move right" onClick={() => press('right')}>
            ▶
          </button>
          <button type="button" className="secondary" aria-label="Soft drop" onClick={() => press('down')}>
            ▼
          </button>
          <button type="button" className="secondary" aria-label="Hard drop" onClick={() => press('drop')}>
            ⤓
          </button>
        </div>
      )}

      {over && (
        <div className="rl-result" data-outcome={won ? 'win' : 'lose'}>
          <p className="rl-message">
            {won ? `You cleared ${LINES_TO_WIN} lines!` : LOSS_MESSAGES[game.reason]}
          </p>
          <p className="sn-final">
            Lines: {game.lines} / {LINES_TO_WIN}
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
