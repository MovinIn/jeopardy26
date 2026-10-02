import { useState } from 'react'
import { useGame } from '../context/GameProvider.jsx'

export function FunSpinner() {
  const { state, dispatch } = useGame()
  const [spinning, setSpinning] = useState(false)
  const events = state.spinnerEvents

  function spin() {
    if (!events.length || spinning) {
      return
    }
    setSpinning(true)
    dispatch({ type: 'CLEAR_SPIN' })
    window.setTimeout(() => {
      dispatch({ type: 'SPIN' })
      setSpinning(false)
    }, 1200)
  }

  return (
    <div className="panel spinner-panel">
      <h2>Fun spinner</h2>
      <p className="hint-text">Random events from your board JSON — effects are display-only for now.</p>

      {!events.length ? (
        <p className="hint-text">Add a &quot;spinnerEvents&quot; array in your JSON to enable the spinner.</p>
      ) : (
        <>
          <div className={`spinner-wheel ${spinning ? 'is-spinning' : ''}`} aria-hidden="true">
            <span>?</span>
          </div>
          <button type="button" onClick={spin} disabled={spinning}>
            {spinning ? 'Spinning…' : 'Spin!'}
          </button>
          {state.lastSpinResult && !spinning && (
            <div className="spin-result">
              <p className="eyebrow">Event</p>
              <p>{state.lastSpinResult.label}</p>
              <button type="button" className="secondary" onClick={() => dispatch({ type: 'CLEAR_SPIN' })}>
                Dismiss
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
