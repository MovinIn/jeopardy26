import { useState } from 'react'
import { useGame } from '../context/GameProvider.jsx'
import { normalizeSpinnerEvents } from '../game/bonusRound.js'
import { BonusRoundModal } from './bonus/BonusRoundModal.jsx'

export function FunSpinner() {
  const { state } = useGame()
  const rawEvents = state.spinnerEvents ?? state.source?.spinnerEvents ?? []
  const events = normalizeSpinnerEvents(rawEvents)
  const [popupOpen, setPopupOpen] = useState(false)

  const disabled = events.length === 0

  return (
    <>
      <button
        type="button"
        className="spinner-compact"
        onClick={() => setPopupOpen(true)}
        disabled={disabled}
        aria-label="Open bonus round"
        title={disabled ? 'Add spinnerEvents in public/board.json' : 'Bonus round: spin, slots, dice'}
      >
        <span className="spinner-compact-wheel" aria-hidden="true">
          ?
        </span>
        <span className="spinner-compact-label">Spin</span>
      </button>

      {popupOpen && <BonusRoundModal onClose={() => setPopupOpen(false)} />}
    </>
  )
}
