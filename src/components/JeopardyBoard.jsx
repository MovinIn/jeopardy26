import { allCluesResolved, getCell } from '../game/board.js'
import { useGame } from '../context/GameProvider.jsx'
import { formatMoney } from '../game/scoring.js'

export function JeopardyBoard() {
  const { state, dispatch } = useGame()
  const canPlay = state.board && state.teams.length > 0
  const controller = state.teams[state.activeTeamIndex]

  if (!state.board) {
    return (
      <div className="board-placeholder panel">
        <p>Load a board JSON file to see the 6×5 grid.</p>
      </div>
    )
  }

  const rowCount = Math.max(
    ...state.board.categories.map(
      (_, ci) => state.board.cells.filter((c) => c.categoryIndex === ci).length,
    ),
  )
  const roundDone = allCluesResolved(state.board)

  let nextLabel = 'Final scores'
  if (state.round === 'jeopardy' && state.source?.doubleJeopardy) {
    nextLabel = 'Go to Double Jeopardy!'
  } else if (state.source?.finalJeopardy) {
    nextLabel = 'Go to Final Jeopardy!'
  }

  return (
    <section className="board-section">
      <p className="turn-banner">
        {canPlay ? (
          <>
            <strong>{controller?.name}</strong> has control of the board
          </>
        ) : (
          'Add contestants to start selecting clues.'
        )}
      </p>
      <div className="jeopardy-grid" role="grid" aria-label="Jeopardy board">
        {state.board.categories.map((category, categoryIndex) => (
          <div key={categoryIndex} className="board-column" role="rowgroup">
            <div className="category-cell" role="columnheader">
              {category.name}
            </div>
            {Array.from({ length: rowCount }).map((_, rowIndex) => {
              const cell = getCell(state.board, categoryIndex, rowIndex)
              if (!cell) {
                return <div key={rowIndex} className="clue-cell empty" />
              }
              return (
                <button
                  key={rowIndex}
                  type="button"
                  className={cell.resolved ? 'clue-cell resolved' : 'clue-cell'}
                  disabled={!canPlay || cell.resolved}
                  onClick={() => dispatch({ type: 'SELECT_CLUE', categoryIndex, rowIndex })}
                >
                  {cell.resolved ? '' : formatMoney(cell.value)}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      {roundDone && (
        <div className="round-end">
          <button type="button" onClick={() => dispatch({ type: 'ADVANCE_ROUND' })}>
            {nextLabel}
          </button>
        </div>
      )}
    </section>
  )
}
