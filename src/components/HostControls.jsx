import { useGame } from '../context/GameProvider.jsx'

const ROUND_NAMES = { jeopardy: 'Jeopardy!', double: 'Double Jeopardy!' }

export function HostControls({ setupOpen, onToggleSetup }) {
  const { state, dispatch } = useGame()

  let roundLabel = ROUND_NAMES[state.round] ?? ''
  if (state.phase === 'final-wager' || state.phase === 'final-clue') {
    roundLabel = 'Final Jeopardy!'
  } else if (state.phase === 'over') {
    roundLabel = 'Game over'
  }

  return (
    <header className="host-bar">
      <div>
        <p className="eyebrow">{roundLabel || 'Jeopardy Host'}</p>
        <h1>{state.title || 'Import a board to begin'}</h1>
      </div>
      <div className="host-actions">
        <button type="button" className="secondary" onClick={onToggleSetup} disabled={!state.board}>
          {setupOpen && state.board ? 'Hide setup' : 'Setup'}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => dispatch({ type: 'RESET_GAME' })}
          disabled={!state.board}
        >
          New game (reset scores)
        </button>
      </div>
    </header>
  )
}
