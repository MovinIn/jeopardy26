import { useGame } from '../context/GameProvider.jsx'
import { useGameMusicControls } from '../hooks/useGameMusic.jsx'

export function HostControls() {
  const { state, dispatch } = useGame()
  const { muted, toggleMuted } = useGameMusicControls()

  return (
    <div className="host-toolbar">
      <button
        type="button"
        className={`secondary toolbar-btn music-toggle${muted ? ' is-muted' : ''}`}
        onClick={toggleMuted}
        aria-pressed={!muted}
        title={
          muted
            ? 'Unmute background music (click anywhere first if audio is blocked)'
            : 'Mute background music'
        }
      >
        {muted ? 'Music off' : 'Music on'}
      </button>
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
