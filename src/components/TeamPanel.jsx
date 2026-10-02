import { useState } from 'react'
import { useGame } from '../context/GameProvider.jsx'
import { formatMoney } from '../game/scoring.js'
import { play } from '../audio/sfx.js'

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const STEPS = [100, 200, 500, 1000]

export function TeamPanel() {
  const { state, dispatch } = useGame()
  const [newTeamName, setNewTeamName] = useState('')
  const [step, setStep] = useState(STEPS[0])

  function addTeam(e) {
    e.preventDefault()
    play('coin')
    dispatch({ type: 'ADD_TEAM', name: newTeamName })
    setNewTeamName('')
  }

  function selectTeam(index) {
    if (index !== state.activeTeamIndex) {
      play('tick')
      dispatch({ type: 'SET_ACTIVE_TEAM', index })
    }
  }

  return (
    <div className="panel team-panel">
      <form className="add-team-form" onSubmit={addTeam}>
        <input
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          placeholder="Add team"
        />
        <button type="submit">+</button>
      </form>

      <div className="step-picker" role="group" aria-label="Points per click">
        {STEPS.map((n) => (
          <button
            key={n}
            type="button"
            className={n === step ? 'step-chip selected' : 'step-chip secondary'}
            aria-pressed={n === step}
            onClick={() => {
              play('tick')
              setStep(n)
            }}
          >
            {n}
          </button>
        ))}
      </div>

      <ul className="team-list">
        {state.teams.map((team, index) => {
          const isActive = index === state.activeTeamIndex
          return (
            <li key={team.id}>
              <div
                className={isActive ? 'team-card active' : 'team-card'}
                role="button"
                tabIndex={0}
                aria-current={isActive ? 'true' : undefined}
                aria-label={isActive ? `${team.name}, playing now` : `Switch to ${team.name}`}
                onClick={() => selectTeam(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    selectTeam(index)
                  }
                }}
              >
                <div className="team-header">
                  <input
                    className="team-name-input"
                    value={team.name}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      dispatch({ type: 'RENAME_TEAM', teamId: team.id, name: e.target.value })
                    }
                    aria-label={`Name for ${team.name}`}
                  />
                  {isActive && <span className="active-badge">▶</span>}
                  <button
                    type="button"
                    className="trash-button"
                    aria-label={`Remove ${team.name}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      play('pass')
                      dispatch({ type: 'REMOVE_TEAM', teamId: team.id })
                    }}
                  >
                    <TrashIcon />
                  </button>
                </div>
                <div className="team-score" data-negative={team.score < 0}>
                  {formatMoney(team.score)}
                </div>
                {((team.bonusTokens ?? 0) > 0 || (team.powerups?.length ?? 0) > 0) && (
                  <div className="team-bonus-meta">
                    {(team.bonusTokens ?? 0) > 0 && (
                      <span className="team-bonus-tokens">{team.bonusTokens} tokens</span>
                    )}
                    {(team.powerups?.length ?? 0) > 0 && (
                      <span className="team-bonus-powerups">
                        {team.powerups.length} powerup{team.powerups.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="score-buttons">
                <button
                  type="button"
                  className="danger"
                  aria-label={`Subtract ${step} from ${team.name}`}
                  onClick={() => {
                    play('pass')
                    dispatch({ type: 'ADJUST_SCORE', teamId: team.id, delta: -step })
                  }}
                >
                  −
                </button>
                <button
                  type="button"
                  className="success"
                  aria-label={`Add ${step} to ${team.name}`}
                  onClick={() => {
                    play('coin')
                    dispatch({ type: 'ADJUST_SCORE', teamId: team.id, delta: step })
                  }}
                >
                  +
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {state.teams.length > 1 && (
        <button
          type="button"
          className="secondary next-team-btn"
          onClick={() => {
            play('tick')
            dispatch({ type: 'NEXT_TEAM' })
          }}
        >
          Next team
        </button>
      )}
    </div>
  )
}
