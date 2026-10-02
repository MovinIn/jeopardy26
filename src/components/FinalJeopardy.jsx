import { useGame } from '../context/GameProvider.jsx'
import { ClueText } from './ClueText.jsx'
import { canPlayFinal, formatMoney } from '../game/scoring.js'

function Standings({ teams }) {
  const ranked = [...teams].sort((a, b) => b.score - a.score)
  const top = ranked[0]?.score
  return (
    <ol className="standings">
      {ranked.map((team) => (
        <li key={team.id} className={team.score === top ? 'winner' : ''}>
          <span>{team.name}</span>
          <span className="standing-score" data-negative={team.score < 0}>
            {formatMoney(team.score)}
          </span>
        </li>
      ))}
    </ol>
  )
}

export function FinalJeopardy() {
  const { state, dispatch } = useGame()
  const final = state.source?.finalJeopardy

  if (state.phase === 'over' || !final) {
    const top = Math.max(...state.teams.map((t) => t.score))
    const winners = state.teams.filter((t) => t.score === top)
    return (
      <section className="final-screen">
        <p className="final-title">Final scores</p>
        {state.teams.length > 0 && (
          <p className="final-winner">
            {winners.length > 1 ? 'Tie: ' : 'Champion: '}
            {winners.map((t) => t.name).join(' & ')}
          </p>
        )}
        <Standings teams={state.teams} />
      </section>
    )
  }

  const finalists = state.teams.filter((t) => t.id in state.finalResults || canPlayFinal(t.score))
  const benched = state.teams.filter((t) => !finalists.includes(t))

  if (state.phase === 'final-wager') {
    return (
      <section className="final-screen">
        <p className="final-title">Final Jeopardy!</p>
        <p className="final-category">{final.category}</p>
        <p className="hint-text">Each contestant writes down a wager, up to their whole score.</p>
        <div className="judge-panel">
          {finalists.map((team) => (
            <div key={team.id} className="judge-row">
              <span className="judge-name">
                {team.name} ({formatMoney(team.score)})
              </span>
              <input
                type="number"
                min={0}
                max={team.score}
                placeholder="Wager"
                value={state.finalWagers[team.id] ?? ''}
                onChange={(e) =>
                  dispatch({ type: 'SET_FINAL_WAGER', teamId: team.id, amount: e.target.value })
                }
                aria-label={`Final wager for ${team.name}`}
              />
            </div>
          ))}
        </div>
        {benched.length > 0 && (
          <p className="hint-text">
            Sitting out (no positive score): {benched.map((t) => t.name).join(', ')}
          </p>
        )}
        <button type="button" onClick={() => dispatch({ type: 'START_FINAL_CLUE' })}>
          Reveal the clue
        </button>
      </section>
    )
  }

  return (
    <section className="final-screen">
      <p className="final-title">Final Jeopardy!</p>
      <p className="final-category">{final.category}</p>
      <p className="clue-text">
        <ClueText text={final.clue} />
      </p>
      {!state.finalRevealed ? (
        <button type="button" onClick={() => dispatch({ type: 'REVEAL_FINAL' })}>
          Time&apos;s up: reveal response
        </button>
      ) : (
        <>
          <p className="clue-answer">
            <ClueText text={final.answer} />
          </p>
          <div className="judge-panel">
            {finalists.map((team) => {
              const result = state.finalResults[team.id]
              const wager = state.finalWagers[team.id] ?? 0
              const judged = team.id in state.finalResults
              return (
                <div key={team.id} className="judge-row">
                  <span className="judge-name">
                    {team.name} wagered {formatMoney(wager)}
                    {judged && (result ? ' (correct)' : ' (incorrect)')}
                  </span>
                  <button
                    type="button"
                    className="success"
                    disabled={judged}
                    onClick={() => dispatch({ type: 'JUDGE_FINAL', teamId: team.id, correct: true })}
                  >
                    Correct
                  </button>
                  <button
                    type="button"
                    className="danger"
                    disabled={judged}
                    onClick={() => dispatch({ type: 'JUDGE_FINAL', teamId: team.id, correct: false })}
                  >
                    Incorrect
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
