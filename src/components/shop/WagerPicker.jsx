import { formatMoney } from '../../game/scoring.js'
import { play } from '../../audio/sfx.js'

/** Slider with -/+ steppers for choosing a wager between min and max. */
export function WagerPicker({ min, max, step, value, onChange, disabled = false }) {
  function nudge(direction) {
    play('tick')
    onChange(Math.min(max, Math.max(min, value + direction * step)))
  }

  return (
    <div className="wager-picker">
      <p className="wager-picker-label">Wager</p>
      <div className="wager-picker-row">
        <button
          type="button"
          className="secondary"
          disabled={disabled || value <= min}
          onClick={() => nudge(-1)}
          aria-label="Lower wager"
        >
          −
        </button>
        <output className="wager-picker-value" aria-live="polite">
          {formatMoney(value)}
        </output>
        <button
          type="button"
          className="secondary"
          disabled={disabled || value >= max}
          onClick={() => nudge(1)}
          aria-label="Raise wager"
        >
          +
        </button>
      </div>
      <input
        type="range"
        className="wager-picker-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          play('tick')
          onChange(Number(e.target.value))
        }}
        aria-label="Wager"
      />
      <div className="wager-picker-bounds">
        <span>{formatMoney(min)}</span>
        <span>{formatMoney(max)}</span>
      </div>
    </div>
  )
}
