import { useEffect, useRef, useState } from 'react'
import {
  BIRD_X,
  GROUND_H,
  GROUND_Y,
  MAX_CATCH_UP_MS,
  POLES_TO_WIN,
  POLE_GAP,
  POLE_W,
  TICK_MS,
  WORLD_H,
  WORLD_W,
  catchUpMs,
  createGame,
  flap,
  step,
} from '../game/flappy.js'
import { formatMoney } from '../game/scoring.js'
import { play } from '../audio/sfx.js'

const FLAP_KEYS = new Set([' ', 'ArrowUp', 'w', 'W'])
const CAP_H = 24
const GRASS_PERIOD = 24

const LOSS_REASONS = {
  pole: 'You hit a pole.',
  ground: 'You hit the ground.',
}

const OUTLINE = '#543847'
const GREEN = '#73bf2e'
const GREEN_LIGHT = '#9ce659'
const GREEN_DARK = '#558022'

function Pole({ pole }) {
  const gapTop = pole.y - POLE_GAP / 2
  const gapBottom = pole.y + POLE_GAP / 2
  const bodyStyle = { fill: GREEN, stroke: OUTLINE, strokeWidth: 2 }
  return (
    <g aria-hidden="true">
      {/* top section */}
      <rect x={pole.x + 3} y={-4} width={POLE_W - 6} height={gapTop - CAP_H + 4} {...bodyStyle} />
      <rect x={pole.x} y={gapTop - CAP_H} width={POLE_W} height={CAP_H} {...bodyStyle} />
      <rect x={pole.x + 8} y={-2} width={8} height={gapTop - CAP_H} fill={GREEN_LIGHT} />
      <rect x={pole.x + 4} y={gapTop - CAP_H + 4} width={8} height={CAP_H - 8} fill={GREEN_LIGHT} />
      <rect x={pole.x + POLE_W - 14} y={-2} width={6} height={gapTop - CAP_H} fill={GREEN_DARK} />
      {/* bottom section */}
      <rect x={pole.x + 3} y={gapBottom + CAP_H} width={POLE_W - 6} height={GROUND_Y - gapBottom} {...bodyStyle} />
      <rect x={pole.x} y={gapBottom} width={POLE_W} height={CAP_H} {...bodyStyle} />
      <rect x={pole.x + 8} y={gapBottom + CAP_H} width={8} height={GROUND_Y - gapBottom - CAP_H} fill={GREEN_LIGHT} />
      <rect x={pole.x + 4} y={gapBottom + 4} width={8} height={CAP_H - 8} fill={GREEN_LIGHT} />
      <rect x={pole.x + POLE_W - 14} y={gapBottom + CAP_H} width={6} height={GROUND_Y - gapBottom - CAP_H} fill={GREEN_DARK} />
    </g>
  )
}

function Bird({ y, angle, wing }) {
  const wingY = [0, -3.5, 2][wing]
  return (
    <g transform={`translate(${BIRD_X} ${y}) rotate(${angle})`} aria-hidden="true">
      <ellipse cx="0" cy="0" rx="17" ry="12.5" fill="#f7d51d" stroke={OUTLINE} strokeWidth="2" />
      <ellipse cx="2" cy="5" rx="11" ry="5.5" fill="#fbeb7e" />
      <ellipse cx="-6" cy={2 + wingY} rx="9" ry="6" fill="#f2e6b8" stroke={OUTLINE} strokeWidth="1.8" />
      <circle cx="7" cy="-5" r="5.2" fill="#fff" stroke={OUTLINE} strokeWidth="1.6" />
      <circle cx="9" cy="-5" r="2.2" fill={OUTLINE} />
      <ellipse cx="15" cy="3" rx="8" ry="4.6" fill="#f6552d" stroke={OUTLINE} strokeWidth="1.6" />
      <path d="M8 4 Q15 7 22 4" stroke={OUTLINE} strokeWidth="1.2" fill="none" />
    </g>
  )
}

/** Sky, skyline, clouds and bushes: nothing here moves, so it is drawn once per render cheaply. */
function Backdrop() {
  return (
    <g aria-hidden="true">
      <rect width={WORLD_W} height={GROUND_Y} fill="url(#fb-sky)" />
      {[
        [40, 90, 1],
        [190, 140, 0.8],
        [110, 40, 0.7],
      ].map(([x, y, scale]) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${scale})`} fill="#fff" opacity="0.9">
          <ellipse cx="0" cy="0" rx="30" ry="12" />
          <ellipse cx="22" cy="-7" rx="20" ry="13" />
          <ellipse cx="-20" cy="-4" rx="16" ry="10" />
        </g>
      ))}
      {[
        [0, 70], [26, 44], [58, 86], [92, 52], [124, 76], [160, 40], [192, 90], [226, 58], [256, 80],
      ].map(([x, h]) => (
        <rect key={x} x={x} y={GROUND_Y - 16 - h} width="34" height={h + 6} fill="#a8dde2" />
      ))}
      {Array.from({ length: 11 }, (_, i) => (
        <circle key={i} cx={i * 28 + 6} cy={GROUND_Y - 6} r="16" fill="#7bd160" />
      ))}
    </g>
  )
}

function Ground({ distance }) {
  const offset = -(distance % GRASS_PERIOD)
  return (
    <g aria-hidden="true">
      <rect x="0" y={GROUND_Y} width={WORLD_W} height={GROUND_H} fill="#ded895" />
      <rect
        x="0"
        y={GROUND_Y}
        width={WORLD_W}
        height="16"
        fill="url(#fb-grass)"
        patternTransform={`translate(${offset} 0)`}
      />
      <line x1="0" y1={GROUND_Y} x2={WORLD_W} y2={GROUND_Y} stroke={OUTLINE} strokeWidth="3" />
      <line x1="0" y1={GROUND_Y + 16} x2={WORLD_W} y2={GROUND_Y + 16} stroke="#b4a860" strokeWidth="2" />
      <rect x="0" y={GROUND_Y + 18} width={WORLD_W} height="3" fill="#d4c46c" />
    </g>
  )
}

/**
 * Flappy Bird for `team`, played for `stake` points: fly through 15 poles to win, or hit a pole or
 * the ground and lose. Like SnakeGame it reports to the parent instead of touching scores:
 * `onStart` on the first flap, `onFinish(won)` once at the end, `onExit` from the result card.
 */
export function FlappyGame({ team, stake, onStart, onFinish, onExit, makeGame = createGame }) {
  // What is drawn: the game plus a frame count that drives the hover and wing animations.
  const [view, setView] = useState(() => ({ game: makeGame(), frames: 0 }))
  // The same game, for the loop and the key handler to read without waiting for a render.
  const gameRef = useRef(view.game)
  const framesRef = useRef(0)
  const finishedRef = useRef(false)
  const onStartRef = useRef(onStart)
  const onFinishRef = useRef(onFinish)

  useEffect(() => {
    onStartRef.current = onStart
    onFinishRef.current = onFinish
  })

  function doFlap() {
    const before = gameRef.current
    const after = flap(before)
    if (after === before) {
      return
    }
    gameRef.current = after
    if (before.status === 'ready') {
      onStartRef.current?.()
    }
    play('flap')
    setView((current) => ({ ...current, game: after }))
  }

  // Keyboard: space, up arrow or W.
  useEffect(() => {
    function onKeyDown(event) {
      if (!FLAP_KEYS.has(event.key)) {
        return
      }
      event.preventDefault()
      if (!event.repeat) {
        doFlap()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // The game loop: fixed 1/60 s physics ticks, drawn once per animation frame.
  useEffect(() => {
    let raf = 0
    let last = null
    let pending = 0

    function frame(now) {
      if (last === null) {
        last = now
      }
      pending = Math.min(pending + catchUpMs(now - last), MAX_CATCH_UP_MS)
      last = now

      const scoreBefore = gameRef.current.score
      let game = gameRef.current
      while (pending >= TICK_MS) {
        game = step(game)
        pending -= TICK_MS
      }
      gameRef.current = game
      if (game.score > scoreBefore) {
        play('point')
      }
      framesRef.current += 1
      setView({ game, frames: framesRef.current })

      if (game.status === 'won' || game.status === 'lost') {
        if (!finishedRef.current) {
          finishedRef.current = true
          if (game.status === 'lost') {
            play('hit')
          }
          play(game.status === 'won' ? 'win' : 'lose')
          onFinishRef.current?.(game.status === 'won')
        }
        return // the game is over: stop the loop
      }
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const { game, frames } = view
  const over = game.status === 'won' || game.status === 'lost'
  const won = game.status === 'won'

  // Hover while waiting, tilt with speed while flying, nose-down once crashed.
  const hover = game.status === 'ready' ? Math.sin(frames / 8) * 5 : 0
  let angle = 0
  if (game.status === 'lost') {
    angle = 90
  } else if (game.status === 'playing') {
    angle = Math.max(-28, Math.min(80, game.bird.vy * 5))
  }
  const wing = over ? 0 : Math.floor(frames / 5) % 3

  return (
    <div className="fb-room">
      <p className="rl-team">
        <strong>{team.name}</strong>: fly through {POLES_TO_WIN} poles to win {formatMoney(stake)}.
        Crash and you lose {formatMoney(stake)}.
      </p>

      <div className="fb-frame" onPointerDown={doFlap}>
        <svg className="fb-board" viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} role="img" aria-label="Flappy Bird">
          <defs>
            <linearGradient id="fb-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ec0ca" />
              <stop offset="100%" stopColor="#bfeaf0" />
            </linearGradient>
            <pattern id="fb-grass" width={GRASS_PERIOD} height="16" patternUnits="userSpaceOnUse">
              <rect width={GRASS_PERIOD} height="16" fill={GREEN} />
              <polygon points="0,16 12,0 24,0 12,16" fill={GREEN_LIGHT} />
              <rect y="12" width={GRASS_PERIOD} height="4" fill={GREEN_DARK} opacity="0.55" />
            </pattern>
          </defs>

          <Backdrop />
          {game.poles.map((pole, i) => (
            <Pole key={`${i}-${pole.y}`} pole={pole} />
          ))}
          <Ground distance={game.distance} />
          <Bird y={game.bird.y + hover} angle={angle} wing={wing} />

          <text
            x={WORLD_W / 2}
            y="78"
            textAnchor="middle"
            className="fb-score"
            aria-label="Poles passed"
          >
            {game.score}
          </text>
        </svg>

        {game.status === 'ready' && (
          <div className="fb-hint">
            <p className="fb-hint-title">Get ready!</p>
            <p>Press Space, ↑ or click to flap</p>
          </div>
        )}
      </div>

      {!over && (
        <button type="button" className="secondary fb-flap" onClick={doFlap}>
          Flap
        </button>
      )}

      {over && (
        <div className="rl-result" data-outcome={won ? 'win' : 'lose'}>
          <p className="rl-message">
            {won ? `You flew through all ${POLES_TO_WIN} poles!` : LOSS_REASONS[game.reason]}
          </p>
          <p className="sn-final">
            Poles: {game.score} / {POLES_TO_WIN}
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
