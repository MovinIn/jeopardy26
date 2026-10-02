import { useEffect, useRef, useState } from 'react'
import { pickIndex } from '../../game/bonusRound.js'

const SPIN_MS = 2800

function buildReelStrip(powerups, repeat = 6) {
  const strip = []
  for (let r = 0; r < repeat; r += 1) {
    powerups.forEach((p) => strip.push(p))
  }
  return strip
}

export function SlotsStage({ powerups, onComplete }) {
  const [spinning, setSpinning] = useState(true)
  const [outcome, setOutcome] = useState(null)
  const targetIndexRef = useRef(null)
  const strip = buildReelStrip(powerups, 8)
  const itemHeight = 3.25

  useEffect(() => {
    const winIndex = pickIndex(powerups.length)
    targetIndexRef.current = winIndex
    const landIndex = powerups.length * 5 + winIndex
    const offsetRem = landIndex * itemHeight

    const timer = window.setTimeout(() => {
      setSpinning(false)
      setOutcome(powerups[winIndex])
    }, SPIN_MS)

    requestAnimationFrame(() => {
      const reel = document.getElementById('bonus-slot-reel-inner')
      if (reel) {
        reel.style.setProperty('--slot-offset', `${offsetRem}rem`)
      }
    })

    return () => window.clearTimeout(timer)
  }, [powerups])

  return (
    <>
      <div className="bonus-slots-wrap">
        <div className="bonus-slots-window" aria-live="polite">
          <div
            id="bonus-slot-reel-inner"
            className={spinning ? 'bonus-slots-reel spinning' : 'bonus-slots-reel'}
            style={{ '--slot-offset': '0rem', '--spin-ms': `${SPIN_MS}ms` }}
          >
            {strip.map((p, i) => (
              <div key={`${p.id}-${i}`} className="bonus-slots-item">
                {p.label}
              </div>
            ))}
          </div>
          <div className="bonus-slots-highlight" aria-hidden="true" />
        </div>
        <p className="bonus-slots-caption">Match the center line for your powerup</p>
      </div>

      {!spinning && outcome && (
        <div className="spinner-popup-result">
          <p className="spinner-popup-event">{outcome.label}</p>
          <p className="bonus-stage-detail">Powerup added for this team after you finish</p>
          <div className="spinner-popup-actions">
            <button type="button" onClick={() => onComplete(outcome)}>
              Continue to dice
            </button>
          </div>
        </div>
      )}
      {spinning && <p className="spinner-popup-status">Rolling…</p>}
    </>
  )
}
