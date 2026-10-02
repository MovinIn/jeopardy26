import { useState } from 'react'
import { getCell, highestClueValue } from '../game/board.js'
import { MIN_WAGER, formatMoney, maxDailyDoubleWager } from '../game/scoring.js'
import { useGame } from '../context/GameProvider.jsx'

function WagerForm({ team, maxWager, onSubmit }) {
  const [amount, setAmount] = useState(String(Math.min(maxWager, Math.max(team.score, MIN_WAGER))))

  return (
    <form
      className="wager-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(amount)
      }}
    >
      <p className="wager-prompt">
        <strong>{team.name}</strong>, how much will you wager?
      </p>
      <p className="wager-range">
        {formatMoney(MIN_WAGER)} to {formatMoney(maxWager)}
      </p>
      <input
        type="number"
        min={MIN_WAGER}
        max={maxWager}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        aria-label="Wager"
        autoFocus
      />
      <button type="submit">Lock in wager</button>
    </form>
  )
}

export function ClueModal() {
  const { state, dispatch } = useGame()
  const sel = state.selectedClue

  if (!sel || !state.board) {
    return null
  }

  const cell = getCell(state.board, sel.categoryIndex, sel.rowIndex)
  if (!cell) {
    return null
  }

  const categoryName = state.board.categories[sel.categoryIndex]?.name ?? 'Category'
  const controller = state.teams[state.activeTeamIndex]
  const isDailyDouble = cell.dailyDouble
  const stake = sel.wager ?? cell.value
  const canClose = sel.lockedOut.length === 0 && sel.wager === null

  return (
    <div className="clue-screen" role="dialog" aria-modal="true" aria-label={`${categoryName} for ${formatMoney(cell.value)}`}>
      <header className="clue-screen-header">
        <p className="clue-category">{categoryName}</p>
        <p className="clue-value">{isDailyDouble ? `Wager ${formatMoney(stake)}` : formatMoney(cell.value)}</p>
        {canClose && (
          <button
            type="button"
            className="secondary clue-close"
            onClick={() => dispatch({ type: 'CLOSE_CLUE' })}
          >
            Back to board
          </button>
        )}
      </header>

      {sel.stage === 'wager' ? (
        <div className="clue-body">
          <p className="daily-double-banner">Daily Double!</p>
          <WagerForm
            team={controller}
            maxWager={maxDailyDoubleWager(controller.score, highestClueValue(state.board))}
            onSubmit={(amount) => dispatch({ type: 'SET_WAGER', amount })}
          />
        </div>
      ) : (
        <div className="clue-body">
          {isDailyDouble && (
            <p className="clue-answering">
              <strong>{controller.name}</strong> is answering for {formatMoney(sel.wager)}
            </p>
          )}
          <p className="clue-text">{cell.clue}</p>

          {sel.revealed && <p className="clue-answer">{cell.answer}</p>}

          <div className="judge-panel">
            {(isDailyDouble ? [controller] : state.teams).map((team) => {
              const lockedOut = sel.lockedOut.includes(team.id)
              return (
                <div key={team.id} className={lockedOut ? 'judge-row locked' : 'judge-row'}>
                  <span className="judge-name">{team.name}</span>
                  <button
                    type="button"
                    className="success"
                    disabled={lockedOut}
                    onClick={() => dispatch({ type: 'ANSWER_CLUE', teamId: team.id, correct: true })}
                  >
                    Correct +{formatMoney(stake)}
                  </button>
                  <button
                    type="button"
                    className="danger"
                    disabled={lockedOut}
                    onClick={() => dispatch({ type: 'ANSWER_CLUE', teamId: team.id, correct: false })}
                  >
                    {lockedOut ? 'Locked out' : `Incorrect −${formatMoney(stake)}`}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="clue-actions">
            <button
              type="button"
              className="secondary"
              disabled={sel.revealed}
              onClick={() => dispatch({ type: 'REVEAL_ANSWER' })}
            >
              Reveal response
            </button>
            {!isDailyDouble && (
              <button type="button" className="secondary" onClick={() => dispatch({ type: 'PASS_CLUE' })}>
                No one got it
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
