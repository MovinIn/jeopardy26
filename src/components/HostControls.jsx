import { useGame } from '../context/GameProvider.jsx'

export function HostControls() {
  const { state, dispatch } = useGame()

  return (
    <div className="host-toolbar">
      <button
        type="button"
        className="secondary toolbar-btn"
        onClick={() => dispatch({ type: 'RESET_GAME' })}
        disabled={!state.board}
        title="New game (reset scores)"
      >
        Reset
      </button>
    </div>
  )
}
