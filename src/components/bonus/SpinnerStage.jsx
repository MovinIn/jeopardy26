import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildConicGradient,
  computeNextRotation,
  dividerRotateDeg,
  wedgeLabelStyle,
} from '../../game/spinnerWheel.js'

const SPIN_MS = 4500

function scheduleSpinStart(onStart) {
  requestAnimationFrame(() => {
    requestAnimationFrame(onStart)
  })
}

export function SpinnerStage({ events, onComplete, autoStart = true }) {
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [rotation, setRotation] = useState(0)
  const spinTimeoutRef = useRef(null)
  const eventsRef = useRef(events)
  eventsRef.current = events

  const wheelBackground = useMemo(() => buildConicGradient(events.length), [events.length])

  function clearSpinTimeout() {
    if (spinTimeoutRef.current != null) {
      window.clearTimeout(spinTimeoutRef.current)
      spinTimeoutRef.current = null
    }
  }

  function startSpinAtIndex(index, { resetRotation = false } = {}) {
    const list = eventsRef.current
    if (!list.length || index < 0 || index >= list.length) {
      return
    }
    clearSpinTimeout()
    setResult(null)
    setSpinning(false)
    if (resetRotation) {
      setRotation(0)
    }

    scheduleSpinStart(() => {
      setSpinning(true)
      setRotation((r) => computeNextRotation(resetRotation ? 0 : r, index, list.length))
      spinTimeoutRef.current = window.setTimeout(() => {
        setResult(list[index])
        setSpinning(false)
        spinTimeoutRef.current = null
      }, SPIN_MS)
    })
  }

  function runSpin() {
    const list = eventsRef.current
    if (!list.length || spinning) {
      return
    }
    const index = Math.floor(Math.random() * list.length)
    startSpinAtIndex(index)
  }

  useEffect(() => {
    if (!autoStart || !events.length) {
      return undefined
    }
    const index = Math.floor(Math.random() * events.length)
    startSpinAtIndex(index, { resetRotation: true })
    return () => clearSpinTimeout()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, events.length])

  useEffect(() => () => clearSpinTimeout(), [])

  return (
    <>
      <div className="spinner-popup-stage">
        <div className="spinner-wheel-wrap">
          <div className="spinner-pointer" aria-hidden="true" />
          <div
            className="spinner-wheel-disk"
            style={{
              background: wheelBackground,
              transform: `rotate(${rotation}deg)`,
              transition: spinning
                ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.85, 0.15, 1)`
                : 'none',
            }}
          >
            {events.map((event, i) => (
              <div
                key={`div-${i}-${event.label}`}
                className="spinner-segment-divider"
                style={{ transform: `rotate(${dividerRotateDeg(i, events.length)}deg)` }}
                aria-hidden="true"
              />
            ))}
            {events.map((event, i) => (
              <span
                key={`label-${i}-${event.label}`}
                className="spinner-segment-label"
                style={wedgeLabelStyle(i, events.length)}
              >
                {event.label}
              </span>
            ))}
            <div className="spinner-wheel-hub" aria-hidden="true" />
          </div>
        </div>
      </div>

      {spinning ? (
        <p className="spinner-popup-status">Spinning…</p>
      ) : (
        result && (
          <div className="spinner-popup-result">
            <p className="spinner-popup-event">{result.label}</p>
            <p className="bonus-stage-detail">
              +{result.tokens} token{result.tokens === 1 ? '' : 's'}
            </p>
            <div className="spinner-popup-actions">
              <button type="button" className="secondary" onClick={runSpin}>
                Spin again
              </button>
              <button type="button" onClick={() => onComplete(result)}>
                Continue to slots
              </button>
            </div>
          </div>
        )
      )}
    </>
  )
}
