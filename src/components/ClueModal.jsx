import { getCell } from '../game/board.js'
import { getClueAmounts } from '../game/scoring.js'
import { useGame } from '../context/GameProvider.jsx'

export function ClueModal() {
  const { state, dispatch } = useGame()

  if (!state.selectedClue || !state.board) {
    return null
  }

  const { categoryIndex, rowIndex } = state.selectedClue
  const cell = getCell(state.board, categoryIndex, rowIndex)
  if (!cell) {
    return null
  }

  const categoryName = state.board.categories[categoryIndex]?.name ?? 'Category'
  const activeTeam = state.teams[state.activeTeamIndex]
  const amounts = getClueAmounts(cell.value, state.activeClueHintUsed)
  const hintAvailable = Boolean(cell.hint) && !state.activeClueHintUsed

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => dispatch({ type: 'CLOSE_CLUE' })}>
      <div
        className="clue-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clue-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="clue-modal-header">
          <div>
            <p className="eyebrow">{categoryName}</p>
            <h2 id="clue-modal-title">${cell.value}</h2>
          </div>
          <button type="button" className="icon-button" onClick={() => dispatch({ type: 'CLOSE_CLUE' })}>
            ×
          </button>
        </header>

        <p className="active-team-line">
          Answering: <strong>{activeTeam?.name ?? '—'}</strong>
        </p>

        <p className="clue-text">{cell.clue}</p>

        {state.activeClueHintUsed && cell.hint && (
          <div className="hint-box">
            <p className="eyebrow">Hint</p>
            <p>{cell.hint}</p>
          </div>
        )}

        <p className="score-preview">
          Correct: +${amounts.win} · Incorrect: −${amounts.loss}
          {state.activeClueHintUsed && <span className="hint-tag"> (hint applied)</span>}
        </p>

        <div className="clue-actions">
          <button
            type="button"
            className="secondary"
            disabled={!hintAvailable}
            onClick={() => dispatch({ type: 'REQUEST_HINT' })}
          >
            {cell.hint ? 'Request hint (−100 / +100)' : 'No hint for this clue'}
          </button>
          <button
            type="button"
            className="success"
            onClick={() => dispatch({ type: 'RESOLVE_CLUE', correct: true })}
          >
            Correct
          </button>
          <button
            type="button"
            className="danger"
            onClick={() => dispatch({ type: 'RESOLVE_CLUE', correct: false })}
          >
            Incorrect
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => dispatch({ type: 'REVEAL_ANSWER' })}
          >
            Reveal answer
          </button>
        </div>

        {state.answerRevealed && (
          <div className="answer-box">
            <p className="eyebrow">Answer</p>
            <p>{cell.answer}</p>
          </div>
        )}
      </div>
    </div>
  )
}
