import { useEffect, useRef, useState } from 'react'
import {
  REEL_LOOPS,
  REEL_SPIN_MS,
  SYMBOLS,
  evaluate,
  getSymbol,
  payTable,
  payoutFor,
  reelProgress,
  resultRates,
  spinReels,
} from '../../game/slots.js'
import { formatMoney } from '../../game/scoring.js'
import { wagerLimit } from '../../game/shop.js'
import { WagerPicker } from './WagerPicker.jsx'

/** Order of symbols on each reel's strip (visual only; the result is chosen separately). */
const STRIP = ['seven', 'cherry', 'lemon', 'bell', 'star', 'cherry', 'diamond', 'lemon', 'bell', 'cherry', 'star', 'lemon']
const CELL_PX = 96
const START_INDEX = STRIP.length // rest position: second lap, so symbols show above and below
const MAX_LOOPS = Math.max(...REEL_LOOPS)
const STRIP_CELLS = STRIP.length * (MAX_LOOPS + 3)
const PAY_TABLE = payTable()
const RATES = resultRates()

const glyphOf = (id) => SYMBOLS.find((s) => s.id === id).glyph

function targetIndex(reel, symbolId) {
  return STRIP.length * (REEL_LOOPS[reel] + 1) + STRIP.indexOf(symbolId)
}

/** translateY that puts strip cell `position` in the middle of the three visible rows. */
function offsetFor(position) {
  return `translateY(${-(position - 1) * CELL_PX}px)`
}

function Reel({ stripRef, winning }) {
  return (
    <div className={winning ? 'sl-reel winning' : 'sl-reel'}>
      <div
        className="sl-strip"
        ref={stripRef}
        style={{ transform: offsetFor(START_INDEX + 1) }}
      >
        {Array.from({ length: STRIP_CELLS }, (_, i) => (
          <div key={i} className="sl-cell">
            {glyphOf(STRIP[i % STRIP.length])}
          </div>
        ))}
      </div>
    </div>
  )
}

function percent(chance) {
  const value = chance * 100
  return value < 1 ? `${value.toFixed(2)}%` : `${value.toFixed(1)}%`
}

function payLabel(multiplier) {
  if (multiplier < 0) {
    return 'Lose'
  }
  return multiplier === 0 ? 'Push' : `${multiplier}:1`
}

function winText(multiplier, wager) {
  if (multiplier < 0) {
    return `−${formatMoney(wager)}`
  }
  return multiplier === 0 ? 'Wager back' : `+${formatMoney(multiplier * wager)}`
}

function PayTable({ wager, hitId }) {
  return (
    <div className="rl-payouts" aria-label="Pay table">
      <div className="rl-payout-head">
        <span>Combination</span>
        <span>Chance</span>
        <span>Pays</span>
        <span>You win</span>
      </div>
      {PAY_TABLE.map((row) => (
        <div
          key={row.id}
          className={hitId === row.id ? 'rl-payout-row static hit' : 'rl-payout-row static'}
        >
          <span className="sl-combo">
            <span className="sl-combo-glyphs" aria-hidden="true">
              {row.glyphs.join(' ')}
            </span>
            {row.label}
          </span>
          <span>{percent(row.chance)}</span>
          <span>{payLabel(row.multiplier)}</span>
          <strong data-loss={row.multiplier < 0}>{winText(row.multiplier, wager)}</strong>
        </div>
      ))}
      <p className="rl-payout-foot">
        Win {Math.round(RATES.win * 100)}% · Break even {Math.round(RATES.push * 100)}% · Lose{' '}
        {Math.round(RATES.lose * 100)}%
      </p>
    </div>
  )
}

/** Which pay table row a spin result corresponds to. */
function rowIdFor(reels) {
  const outcome = evaluate(reels)
  if (outcome.kind === 'three') {
    return `three-${reels[0]}`
  }
  return outcome.kind
}

/** One pull for `team`: set a wager, spin three reels, win by matching symbols. */
export function SlotsGame({ team, item, onScore, onExit }) {
  // Fixed when the game opens: you can't wager more points than you have.
  const [maxWager] = useState(() => wagerLimit(item, team.score))
  const [wager, setWager] = useState(item.minWager)
  const [phase, setPhase] = useState('pick') // 'pick' | 'spinning' | 'done'
  const [reels, setReels] = useState(null)

  const stripRefs = useRef([])
  const onScoreRef = useRef(onScore)
  // The points change waits here until the reels stop, but is applied even if the popup closes.
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

    function frame(now) {
      let allStopped = true
      stripRefs.current.forEach((strip, i) => {
        const u = Math.min(1, (now - start) / REEL_SPIN_MS[i])
        const from = START_INDEX + 1
        const to = targetIndex(i, reels[i])
        const position = from + (to - from) * reelProgress(u)
        if (strip) {
          strip.style.transform = offsetFor(position)
          strip.classList.toggle('moving', u < 0.85)
        }
        if (u < 1) {
          allStopped = false
        }
      })

      if (!allStopped) {
        raf = requestAnimationFrame(frame)
        return
      }
      const change = pendingRef.current
      pendingRef.current = null
      if (change !== null) {
        onScoreRef.current(change)
      }
      setPhase('done')
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [phase, reels])

  function spin() {
    if (phase !== 'pick') {
      return
    }
    const landed = spinReels()
    pendingRef.current = payoutFor(landed, wager)
    setReels(landed)
    setPhase('spinning')
  }

  const done = phase === 'done'
  const outcome = done ? evaluate(reels) : null
  const delta = done ? payoutFor(reels, wager) : 0

  return (
    <div className="sl-room">
      <p className="rl-team">
        Playing for <strong>{team.name}</strong>
      </p>

      <div className="sl-machine">
        <div className="sl-marquee" aria-hidden="true">
          <span className="sl-bulbs" />
          <span className="sl-title">Lucky Slots</span>
          <span className="sl-bulbs" />
        </div>

        <div className="sl-window">
          <div className="sl-reels">
            {[0, 1, 2].map((i) => (
              <Reel
                key={i}
                stripRef={(el) => {
                  stripRefs.current[i] = el
                }}
                winning={done && outcome.multiplier > 0}
              />
            ))}
          </div>
          <div className="sl-payline" aria-hidden="true" />
          <div className="sl-glass" aria-hidden="true" />
        </div>

        <p className="sl-readout" aria-live="polite">
          {phase === 'pick' && 'Set your wager and pull the lever'}
          {phase === 'spinning' && 'Spinning…'}
          {done && reels.map((id) => getSymbol(id).glyph).join(' ')}
        </p>
      </div>

      {phase === 'pick' && (
        <>
          <WagerPicker
            min={item.minWager}
            max={maxWager}
            step={item.step}
            value={wager}
            onChange={setWager}
          />
          <button type="button" className="sl-spin-btn" onClick={spin}>
            Spin
          </button>
        </>
      )}

      {phase === 'spinning' && (
        <p className="rl-pick">
          {formatMoney(wager)} on the line
        </p>
      )}

      {done && (
        <div className="rl-result" data-outcome={delta > 0 ? 'win' : 'lose'}>
          <p className="rl-message">
            {outcome.multiplier > 0 && `${outcome.label}!`}
            {outcome.multiplier === 0 && 'One cherry: wager back'}
            {outcome.multiplier < 0 && 'No match. Better luck next time.'}
          </p>
          <p className="rl-delta">
            {delta === 0 ? 'No points change' : `${delta > 0 ? '+' : '−'}${formatMoney(Math.abs(delta))}`}
          </p>
          <button type="button" onClick={onExit}>
            Back to shop
          </button>
        </div>
      )}

      <PayTable wager={wager} hitId={done ? rowIdFor(reels) : null} />
    </div>
  )
}
