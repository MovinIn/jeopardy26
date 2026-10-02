import { useMemo, useState } from 'react'
import { useGame } from '../../context/GameProvider.jsx'
import {
  BONUS_MULTIPLIER_RULE,
  computeBankedTokens,
  normalizeDiceFaces,
  normalizeSlotPowerups,
  normalizeSpinnerEvents,
} from '../../game/bonusRound.js'
import { DiceStage } from './DiceStage.jsx'
import { SlotsStage } from './SlotsStage.jsx'
import { SpinnerStage } from './SpinnerStage.jsx'

const STAGES = ['spinner', 'slots', 'dice', 'summary']

function stageLabel(stage) {
  if (stage === 'spinner') {
    return 'Spinner'
  }
  if (stage === 'slots') {
    return 'Slots'
  }
  if (stage === 'dice') {
    return 'Dice'
  }
  return 'Summary'
}

export function BonusRoundModal({ onClose }) {
  const { state, dispatch } = useGame()
  const [stage, setStage] = useState('spinner')
  const [spinnerResult, setSpinnerResult] = useState(null)
  const [slotResult, setSlotResult] = useState(null)
  const [diceMultiplier, setDiceMultiplier] = useState(null)
  const [spinnerKey, setSpinnerKey] = useState(0)

  const rawEvents = state.spinnerEvents ?? state.source?.spinnerEvents ?? []
  const spinnerEvents = useMemo(() => normalizeSpinnerEvents(rawEvents), [rawEvents])
  const slotPowerups = useMemo(
    () => normalizeSlotPowerups(state.slotPowerups ?? state.source?.slotPowerups),
    [state.slotPowerups, state.source?.slotPowerups],
  )
  const diceFaces = useMemo(
    () => normalizeDiceFaces(state.diceFaces ?? state.source?.diceFaces),
    [state.diceFaces, state.source?.diceFaces],
  )

  const activeTeam = state.teams[state.activeTeamIndex]
  const bankedPreview =
    spinnerResult && diceMultiplier != null
      ? computeBankedTokens(spinnerResult.tokens, diceMultiplier)
      : null

  function handleSpinnerComplete(result) {
    setSpinnerResult(result)
    setStage('slots')
  }

  function handleSlotsComplete(powerup) {
    setSlotResult(powerup)
    setStage('dice')
  }

  function handleDiceComplete(multiplier) {
    setDiceMultiplier(multiplier)
    dispatch({
      type: 'COMMIT_BONUS_ROUND',
      baseTokens: spinnerResult.tokens,
      multiplier,
      powerup: slotResult,
    })
    setStage('summary')
  }

  function restartFlow() {
    setSpinnerResult(null)
    setSlotResult(null)
    setDiceMultiplier(null)
    setStage('spinner')
    setSpinnerKey((k) => k + 1)
  }

  return (
    <div className="spinner-popup-backdrop" role="presentation" onClick={onClose}>
      <div
        className="spinner-popup bonus-round-popup"
        role="dialog"
        aria-modal="true"
        aria-label="Bonus round"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="spinner-popup-close secondary" onClick={onClose}>
          Close
        </button>

        <header className="bonus-round-header">
          <h2 className="bonus-round-title">Bonus round</h2>
          {activeTeam && (
            <p className="bonus-round-team">
              Playing for: <strong>{activeTeam.name}</strong>
            </p>
          )}
          <ol className="bonus-stepper" aria-label="Bonus stages">
            {STAGES.map((s) => (
              <li
                key={s}
                className={
                  s === stage
                    ? 'bonus-step active'
                    : STAGES.indexOf(s) < STAGES.indexOf(stage)
                      ? 'bonus-step done'
                      : 'bonus-step'
                }
              >
                {stageLabel(s)}
              </li>
            ))}
          </ol>
          <p className="bonus-rule-hint">{BONUS_MULTIPLIER_RULE}</p>
        </header>

        {stage === 'spinner' && (
          <SpinnerStage
            key={spinnerKey}
            events={spinnerEvents}
            onComplete={handleSpinnerComplete}
            autoStart
          />
        )}

        {stage === 'slots' && spinnerResult && (
          <SlotsStage powerups={slotPowerups} onComplete={handleSlotsComplete} />
        )}

        {stage === 'dice' && spinnerResult && (
          <DiceStage
            faces={diceFaces}
            baseTokens={spinnerResult.tokens}
            onComplete={handleDiceComplete}
          />
        )}

        {stage === 'summary' && spinnerResult && slotResult && diceMultiplier != null && (
          <div className="bonus-summary-panel">
            <p className="spinner-popup-event">{slotResult.label}</p>
            <ul className="bonus-summary-list">
              <li>
                Tokens: {spinnerResult.tokens} × {diceMultiplier} ={' '}
                <strong>{bankedPreview}</strong> banked
              </li>
              <li>Powerup: {slotResult.label}</li>
            </ul>
            <div className="spinner-popup-actions">
              <button type="button" onClick={restartFlow}>
                Play again
              </button>
              <button type="button" className="secondary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
