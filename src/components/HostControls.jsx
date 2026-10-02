import { useGame } from '../context/GameProvider.jsx'
import { useGameMusicControls } from '../hooks/useGameMusic.jsx'
import { useSfxMuted } from '../hooks/useSfx.js'
import { play } from '../audio/sfx.js'

export function HostControls() {
  const { state, dispatch } = useGame()
  const { muted, toggleMuted } = useGameMusicControls()
  const [sfxMuted, setSfxMuted] = useSfxMuted()

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
        className={`secondary toolbar-btn music-toggle sfx-toggle${sfxMuted ? ' is-muted' : ''}`}
        onClick={() => setSfxMuted(!sfxMuted)}
        aria-pressed={!sfxMuted}
        title={sfxMuted ? 'Turn sound effects on' : 'Turn sound effects off'}
      >
        {sfxMuted ? 'Sounds off' : 'Sounds on'}
      </button>
      <button
        type="button"
        className="secondary toolbar-btn"
        onClick={() => {
          play('tick')
          dispatch({ type: 'RESET_GAME' })
        }}
        disabled={!state.board}
        title="New game (reset scores)"
      >
        Reset
      </button>
    </div>
  )
}
