import { useEffect, useState } from 'react'
import { pickIndex } from '../../game/bonusRound.js'

const ROLL_MS = 2200

export function DiceStage({ faces, baseTokens, onComplete }) {
  const [rolling, setRolling] = useState(true)
  const [face, setFace] = useState(null)

  useEffect(() => {
    const index = pickIndex(faces.length)
    const chosen = faces[index]
    const timer = window.setTimeout(() => {
      setFace(chosen)
      setRolling(false)
    }, ROLL_MS)
    return () => window.clearTimeout(timer)
  }, [faces])

  const displayFace = rolling ? '?' : face

  return (
    <>
      <div className="bonus-dice-wrap">
        <div className={rolling ? 'bonus-die rolling' : 'bonus-die'} aria-live="polite">
          <span className="bonus-die-face">{displayFace}</span>
        </div>
        <p className="bonus-dice-caption">Multiplier applies to spinner tokens only</p>
      </div>

      {rolling ? (
        <p className="spinner-popup-status">Rolling…</p>
      ) : (
        <div className="spinner-popup-result">
          <p className="bonus-summary-formula">
            {baseTokens} tokens × {face} = <strong>{baseTokens * face}</strong> banked tokens
          </p>
          <div className="spinner-popup-actions">
            <button type="button" onClick={() => onComplete(face)}>
              Finish bonus round
            </button>
          </div>
        </div>
      )}
    </>
  )
}
