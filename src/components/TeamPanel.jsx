import { useState } from 'react'
import { useGame } from '../context/GameProvider.jsx'
import { formatMoney } from '../game/scoring.js'

export function TeamPanel() {
  const { state, dispatch } = useGame()
  const [newTeamName, setNewTeamName] = useState('')

  function addTeam(e) {
    e.preventDefault()
    dispatch({ type: 'ADD_TEAM', name: newTeamName })
    setNewTeamName('')
  }

  return (
    <section className="podiums-section" aria-label="Contestants">
      <ul className="podiums">
        {state.teams.map((team, index) => {
          const inControl = state.phase === 'board' && index === state.activeTeamIndex
          return (
            <li key={team.id} className={inControl ? 'podium in-control' : 'podium'}>
              <div className="podium-score" data-negative={team.score < 0}>
                {formatMoney(team.score)}
              </div>
              <input
                className="podium-name"
                value={team.name}
                onChange={(e) =>
                  dispatch({ type: 'RENAME_TEAM', teamId: team.id, name: e.target.value })
                }
                aria-label={`Name for ${team.name}`}
              />
              <div className="podium-actions">
                {inControl ? (
                  <span className="control-badge">In control</span>
                ) : (
                  <button
                    type="button"
                    className="secondary"
                    disabled={state.phase !== 'board'}
                    onClick={() => dispatch({ type: 'SET_ACTIVE_TEAM', index })}
                  >
                    Give control
                  </button>
                )}
                <button
                  type="button"
                  className="secondary"
                  onClick={() => dispatch({ type: 'REMOVE_TEAM', teamId: team.id })}
                >
                  Remove
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {state.teams.length === 0 && <p className="hint-text">Add at least one contestant to play.</p>}

      <form className="add-team-form" onSubmit={addTeam}>
        <input
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          placeholder="Contestant name (optional)"
        />
        <button type="submit">Add contestant</button>
      </form>
    </section>
  )
}
