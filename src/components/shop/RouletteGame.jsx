import { useEffect, useRef, useState } from 'react'
import {
  OUTSIDE_BETS,
  POCKET_STEP,
  STRAIGHT_MULTIPLIER,
  TRACK_RADIUS,
  WHEEL_ORDER,
  betWins,
  colorOf,
  payoutFor,
  resolveBet,
  spinFrame,
  spinWheel,
  winAmount,
  winChance,
} from '../../game/roulette.js'
import { formatMoney } from '../../game/scoring.js'
import { play } from '../../audio/sfx.js'
import { wagerLimit } from '../../game/shop.js'
import { WagerPicker } from './WagerPicker.jsx'

const SPIN_MS = 7500
const CENTER = 200
const POCKET_OUTER = 158
const POCKET_INNER = 118

// Table layout: three rows of twelve, top row 3,6,9...36, with the zero on the left.
const TABLE_ROWS = [3, 2, 1].map((offset) => Array.from({ length: 12 }, (_, i) => i * 3 + offset))

function polar(radius, angleDeg) {
  const a = (angleDeg * Math.PI) / 180
  return [CENTER + radius * Math.sin(a), CENTER - radius * Math.cos(a)]
}

function pocketPath(index) {
  const mid = index * POCKET_STEP
  const [x0, y0] = polar(POCKET_OUTER, mid - POCKET_STEP / 2)
  const [x1, y1] = polar(POCKET_OUTER, mid + POCKET_STEP / 2)
  const [x2, y2] = polar(POCKET_INNER, mid + POCKET_STEP / 2)
  const [x3, y3] = polar(POCKET_INNER, mid - POCKET_STEP / 2)
  return (
    `M${x0} ${y0} A${POCKET_OUTER} ${POCKET_OUTER} 0 0 1 ${x1} ${y1} ` +
    `L${x2} ${y2} A${POCKET_INNER} ${POCKET_INNER} 0 0 0 ${x3} ${y3} Z`
  )
}

const POCKET_FILL = { red: 'url(#rl-red)', black: 'url(#rl-black)', green: 'url(#rl-green)' }

function Wheel({ wheelRef, ballRef, shadowRef, winner }) {
  const [restX, restY] = polar(TRACK_RADIUS, 0)

  return (
    <svg className="rl-wheel" viewBox="0 0 400 400" role="img" aria-label="Roulette wheel">
      <defs>
        <radialGradient id="rl-wood" cx="50%" cy="50%" r="50%">
          <stop offset="86%" stopColor="#5a3516" />
          <stop offset="94%" stopColor="#3b210b" />
          <stop offset="100%" stopColor="#1d0f04" />
        </radialGradient>
        <linearGradient id="rl-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff0a8" />
          <stop offset="50%" stopColor="#d9a52c" />
          <stop offset="100%" stopColor="#8a5f0f" />
        </linearGradient>
        <radialGradient id="rl-track" cx="50%" cy="50%" r="50%">
          <stop offset="82%" stopColor="#1a1a1f" />
          <stop offset="92%" stopColor="#3a3a44" />
          <stop offset="100%" stopColor="#0b0b0e" />
        </radialGradient>
        <radialGradient id="rl-cone" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7a4a22" />
          <stop offset="70%" stopColor="#3f230c" />
          <stop offset="100%" stopColor="#1f1004" />
        </radialGradient>
        <radialGradient id="rl-ball" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#dcdcdc" />
          <stop offset="100%" stopColor="#8d8d8d" />
        </radialGradient>
        <linearGradient id="rl-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4222a" />
          <stop offset="100%" stopColor="#8f0d14" />
        </linearGradient>
        <linearGradient id="rl-black" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b2b2f" />
          <stop offset="100%" stopColor="#0a0a0c" />
        </linearGradient>
        <linearGradient id="rl-green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#12a050" />
          <stop offset="100%" stopColor="#086330" />
        </linearGradient>
        <radialGradient id="rl-gloss" cx="30%" cy="22%" r="75%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Bowl: wooden rim, gold edge and the metal ball track. */}
      <circle cx={CENTER} cy={CENTER} r="197" fill="url(#rl-wood)" />
      <circle cx={CENTER} cy={CENTER} r="186" fill="none" stroke="url(#rl-gold)" strokeWidth="3" />
      <circle cx={CENTER} cy={CENTER} r="182" fill="url(#rl-track)" />
      <circle cx={CENTER} cy={CENTER} r="174" fill="none" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="1.5" />

      {/* Everything that spins with the wheel. */}
      <g ref={wheelRef}>
        <circle cx={CENTER} cy={CENTER} r={POCKET_OUTER + 1} fill="#0b0b0e" />
        {WHEEL_ORDER.map((n, i) => {
          const color = colorOf(n)
          const [tx, ty] = polar(138, 0)
          return (
            <g key={n}>
              <path
                d={pocketPath(i)}
                fill={POCKET_FILL[color]}
                stroke="url(#rl-gold)"
                strokeWidth="0.9"
                className={winner === n ? 'rl-pocket winner' : 'rl-pocket'}
              />
              <text
                x={tx}
                y={ty}
                transform={`rotate(${i * POCKET_STEP} ${CENTER} ${CENTER})`}
                textAnchor="middle"
                dominantBaseline="middle"
                className="rl-number"
              >
                {n}
              </text>
            </g>
          )
        })}
        <circle cx={CENTER} cy={CENTER} r={POCKET_INNER} fill="url(#rl-cone)" stroke="url(#rl-gold)" strokeWidth="2" />
        <circle cx={CENTER} cy={CENTER} r="98" fill="none" stroke="url(#rl-gold)" strokeOpacity="0.55" strokeWidth="1" />
        <circle cx={CENTER} cy={CENTER} r="72" fill="none" stroke="url(#rl-gold)" strokeOpacity="0.4" strokeWidth="1" />
        {[0, 90, 180, 270].map((angle) => {
          const [x, y] = polar(52, angle)
          const [ix, iy] = polar(10, angle)
          return (
            <g key={angle}>
              <line x1={ix} y1={iy} x2={x} y2={y} stroke="url(#rl-gold)" strokeWidth="5" strokeLinecap="round" />
              <circle cx={x} cy={y} r="6" fill="url(#rl-gold)" />
            </g>
          )
        })}
        <circle cx={CENTER} cy={CENTER} r="16" fill="url(#rl-gold)" />
        <circle cx={CENTER} cy={CENTER} r="7" fill="#5a3516" />
      </g>

      {/* Ball and its shadow, moved frame by frame while spinning. */}
      <circle ref={shadowRef} cx={restX + 2} cy={restY + 3} r="7" fill="#000" opacity="0.4" />
      <circle ref={ballRef} cx={restX} cy={restY} r="7" fill="url(#rl-ball)" />

      <circle cx={CENTER} cy={CENTER} r="197" fill="url(#rl-gloss)" pointerEvents="none" />
    </svg>
  )
}

function NumberCell({ n, picked, covered, disabled, onPick, className = '' }) {
  return (
    <button
      type="button"
      className={`rl-cell ${colorOf(n)} ${picked ? 'picked' : ''} ${covered ? 'covered' : ''} ${className}`}
      disabled={disabled}
      aria-pressed={picked}
      aria-label={`Number ${n}`}
      onClick={() => onPick(n)}
    >
      {n}
    </button>
  )
}

function percent(chance) {
  return `${(chance * 100).toFixed(1)}%`
}

const BET_GROUPS = [
  { title: 'Colors', ids: ['red', 'black'] },
  { title: 'Odd or even', ids: ['odd', 'even'] },
  { title: 'Ranges of numbers', ids: ['low', 'high', 'dozen1', 'dozen2', 'dozen3', 'col1', 'col2', 'col3'] },
]

const ZONES = Object.fromEntries(OUTSIDE_BETS.map((zone) => [zone.id, zone]))

// The three columns sit at the right of the table, top row first (3, 6, 9...).
const COLUMN_IDS = ['col3', 'col2', 'col1']
const DOZEN_IDS = ['dozen1', 'dozen2', 'dozen3']
// Bottom row of the table: low, even, red, black, odd, high.
const OUTSIDE_IDS = ['low', 'even', 'red', 'black', 'odd', 'high']

/** A big clickable tile for a zone bet: a diamond for red/black, text for the rest. */
function BetTile({ id, selected, disabled, onPick, style, className = '', children }) {
  const zone = ZONES[id]
  return (
    <button
      type="button"
      className={`rl-tile ${className} ${selected ? 'picked' : ''}`}
      style={style}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={zone.label}
      onClick={() => onPick({ id })}
    >
      {children ?? <span className="rl-tile-label">{zone.label}</span>}
      <small className="rl-tile-pays">{zone.multiplier}:1</small>
    </button>
  )
}

/** What every zone would pay at the current wager, and how likely it is to hit. */
function PayoutBoard({ wager, bet }) {
  const straight = { id: 'straight', number: 0 }
  return (
    <div className="rl-payouts" aria-label="Payouts for every zone">
      <div className="rl-payout-head">
        <span>Bet</span>
        <span>Chance</span>
        <span>Pays</span>
        <span>You win</span>
      </div>

      <div className="rl-payout-row static">
        <span>Single number, including 0 (tap it on the table)</span>
        <span>{percent(winChance(straight))}</span>
        <span>{STRAIGHT_MULTIPLIER}:1</span>
        <strong>+{formatMoney(winAmount(straight, wager))}</strong>
      </div>

      {BET_GROUPS.map((group) => (
        <div key={group.title} className="rl-bet-group" role="group" aria-label={group.title}>
          <p className="rl-group-title">{group.title}</p>
          {group.ids.map((id) => {
            const zone = ZONES[id]
            return (
              <div
                key={id}
                className={bet?.id === id ? 'rl-payout-row static selected' : 'rl-payout-row static'}
              >
                <span className="rl-zone-name">
                  {id === 'red' || id === 'black' ? (
                    <i className={`rl-swatch ${id}`} aria-hidden="true" />
                  ) : null}
                  {zone.label}
                </span>
                <span>{percent(winChance(zone))}</span>
                <span>{zone.multiplier}:1</span>
                <strong>+{formatMoney(winAmount(zone, wager))}</strong>
              </div>
            )
          })}
        </div>
      ))}

      <p className="rl-payout-foot">
        Miss and you lose {formatMoney(wager)}. The green zero only wins on a straight bet on 0.
      </p>
    </div>
  )
}

/** One spin for `team`: set a wager, bet on a number or zone, watch the ball. */
export function RouletteGame({ team, item, onScore, onExit }) {
  // Fixed when the game opens: you can't wager more points than you have.
  const [maxWager] = useState(() => wagerLimit(item, team.score))
  const [wager, setWager] = useState(item.minWager)
  const [bet, setBet] = useState(null) // { id: 'straight', number } | { id: <zone id> }
  const [phase, setPhase] = useState('pick') // 'pick' | 'spinning' | 'done'
  const [result, setResult] = useState(null)

  const wheelRef = useRef(null)
  const ballRef = useRef(null)
  const shadowRef = useRef(null)
  const onScoreRef = useRef(onScore)
  // The points change waits here until the ball stops, but is applied even if the popup closes.
  const pendingRef = useRef(null)

  useEffect(() => {
    onScoreRef.current = onScore
  })

  useEffect(
    () => () => {
      if (pendingRef.current !== null) {
        onScoreRef.current(pendingRef.current)
        pendingRef.current = null
      }
    },
    [],
  )

  useEffect(() => {
    if (phase !== 'spinning') {
      return undefined
    }
    const start = performance.now()
    let raf = 0
    let lastSlot = null

    function frame(now) {
      const u = Math.min(1, (now - start) / SPIN_MS)
      const { wheelAngle, ballAngle, ballRadius } = spinFrame(u, result)
      wheelRef.current?.setAttribute('transform', `rotate(${wheelAngle} ${CENTER} ${CENTER})`)
      const [bx, by] = polar(ballRadius, ballAngle)
      ballRef.current?.setAttribute('cx', bx)
      ballRef.current?.setAttribute('cy', by)
      shadowRef.current?.setAttribute('cx', bx + 2)
      shadowRef.current?.setAttribute('cy', by + 3)

      // Once the ball has dropped into the pockets it clacks over each divider, slower and slower.
      if (ballRadius < TRACK_RADIUS - 4) {
        const slot = Math.floor((ballAngle - wheelAngle) / POCKET_STEP)
        if (lastSlot !== null && slot !== lastSlot) {
          play('ballTick')
        }
        lastSlot = slot
      }

      if (u < 1) {
        raf = requestAnimationFrame(frame)
        return
      }
      const change = pendingRef.current
      pendingRef.current = null
      if (change !== null) {
        onScoreRef.current(change)
      }
      play('ballLand')
      if (change !== null && change > 0) {
        play('win')
        play('coin')
      } else {
        play('lose')
      }
      setPhase('done')
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [phase, result])

  function spin() {
    if (bet === null || phase !== 'pick') {
      return
    }
    const landed = spinWheel()
    pendingRef.current = payoutFor(bet, landed, wager)
    play('spinStart')
    setResult(landed)
    setPhase('spinning')
  }

  const resolved = bet ? resolveBet(bet) : null
  const won = phase === 'done' && betWins(bet, result)
  const delta = phase === 'done' ? payoutFor(bet, result, wager) : 0
  const picking = phase === 'pick'

  return (
    <div className="rl-room">
      <p className="rl-team">
        Playing for <strong>{team.name}</strong>
      </p>

      <div className="rl-layout">
        <Wheel
          wheelRef={wheelRef}
          ballRef={ballRef}
          shadowRef={shadowRef}
          winner={phase === 'done' ? result : null}
        />

        <div className="rl-side">
          <WagerPicker
            min={item.minWager}
            max={maxWager}
            step={item.step}
            value={wager}
            onChange={setWager}
            disabled={!picking}
          />

          <div className="rl-felt" role="group" aria-label="Betting table">
            <NumberCell
              n={0}
              picked={bet?.id === 'straight' && bet.number === 0}
              disabled={!picking}
              onPick={(n) => setBet({ id: 'straight', number: n })}
              className="zero"
            />
            {TABLE_ROWS.flat().map((n) => (
              <NumberCell
                key={n}
                n={n}
                picked={bet?.id === 'straight' && bet.number === n}
                covered={Boolean(resolved && bet.id !== 'straight' && resolved.numbers.includes(n))}
                disabled={!picking}
                onPick={(num) => setBet({ id: 'straight', number: num })}
              />
            ))}

            {COLUMN_IDS.map((id, row) => (
              <BetTile
                key={id}
                id={id}
                className="column"
                style={{ gridColumn: 14, gridRow: row + 1 }}
                selected={bet?.id === id}
                disabled={!picking}
                onPick={setBet}
              >
                <span className="rl-tile-label">2 to 1</span>
              </BetTile>
            ))}

            {DOZEN_IDS.map((id, i) => (
              <BetTile
                key={id}
                id={id}
                style={{ gridColumn: `${2 + i * 4} / span 4`, gridRow: 4 }}
                selected={bet?.id === id}
                disabled={!picking}
                onPick={setBet}
              />
            ))}

            {OUTSIDE_IDS.map((id, i) => (
              <BetTile
                key={id}
                id={id}
                className={id === 'red' || id === 'black' ? `diamond-tile ${id}` : ''}
                style={{ gridColumn: `${2 + i * 2} / span 2`, gridRow: 5 }}
                selected={bet?.id === id}
                disabled={!picking}
                onPick={setBet}
              >
                {id === 'red' || id === 'black' ? (
                  <span className={`rl-diamond ${id}`} aria-hidden="true" />
                ) : undefined}
              </BetTile>
            ))}
          </div>

          <PayoutBoard wager={wager} bet={bet} />

          {picking && (
            <div className="rl-controls">
              <p className="rl-pick">
                {resolved ? (
                  <>
                    Betting {formatMoney(wager)} on <strong>{resolved.label}</strong> to win{' '}
                    <strong>+{formatMoney(winAmount(bet, wager))}</strong>
                  </>
                ) : (
                  'Tap a number, a color, or a range on the table'
                )}
              </p>
              <button type="button" disabled={bet === null} onClick={spin}>
                Spin
              </button>
            </div>
          )}

          {phase === 'spinning' && (
            <div className="rl-controls">
              <p className="rl-pick">
                {formatMoney(wager)} on <strong>{resolved.label}</strong>
              </p>
              <p className="rl-status">No more bets…</p>
            </div>
          )}

          {phase === 'done' && (
            <div className="rl-result" data-outcome={won ? 'win' : 'lose'}>
              <div className={`rl-landed ${colorOf(result)}`}>{result}</div>
              <p className="rl-message">
                {won ? `${resolved.label} hits!` : `Ball landed on ${result}. You bet ${resolved.label}.`}
              </p>
              <p className="rl-delta">
                {delta > 0 ? '+' : '−'}
                {formatMoney(Math.abs(delta))}
              </p>
              <button type="button" onClick={onExit}>
                Back to shop
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
