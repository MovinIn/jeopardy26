import { useState } from 'react'
import { useGame } from '../context/GameProvider.jsx'

export function TeamPanel() {
  const { state, dispatch } = useGame()
  const [newTeamName, setNewTeamName] = useState('')

  function addTeam(e) {
    e.preventDefault()
    dispatch({ type: 'ADD_TEAM', name: newTeamName })
    setNewTeamName('')
  }

  return (
    <div className="panel team-panel">
      <h2>Teams</h2>
      <form className="add-team-form" onSubmit={addTeam}>
        <input
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          placeholder="Team name (optional)"
        />
        <button type="submit">Add team</button>
      </form>

      {state.teams.length === 0 && <p className="hint-text">Add at least one team to play.</p>}

      <ul className="team-list">
        {state.teams.map((team, index) => {
          const isActive = index === state.activeTeamIndex
          return (
            <li key={team.id} className={isActive ? 'team-card active' : 'team-card'}>
              <div className="team-header">
                <input
                  className="team-name-input"
                  value={team.name}
                  onChange={(e) =>
                    dispatch({ type: 'RENAME_TEAM', teamId: team.id, name: e.target.value })
                  }
                  aria-label={`Name for ${team.name}`}
                />
                {isActive && <span className="active-badge">Playing</span>}
              </div>
              <div className="team-score">${team.score.toLocaleString()}</div>
              <div className="team-actions">
                <button type="button" onClick={() => dispatch({ type: 'SET_ACTIVE_TEAM', index })}>
                  Switch here
                </button>
                <button
                  type="button"
                  className="danger secondary"
                  onClick={() => dispatch({ type: 'REMOVE_TEAM', teamId: team.id })}
                >
                  Remove
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {state.teams.length > 1 && (
        <button type="button" className="secondary" onClick={() => dispatch({ type: 'NEXT_TEAM' })}>
          Next team (manual)
        </button>
      )}
    </div>
  )
}
