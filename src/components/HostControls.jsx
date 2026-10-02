import { useGame } from '../context/GameProvider.jsx'

export function HostControls() {
  const { state, dispatch } = useGame()

  return (
    <header className="host-bar">
      <div>
        <p className="eyebrow">Jeopardy Host</p>
        <h1>{state.title || 'Import a board to begin'}</h1>
      </div>
      <div className="host-actions">
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
