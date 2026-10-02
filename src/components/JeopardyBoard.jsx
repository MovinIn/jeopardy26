import { getCell } from '../game/board.js'
import { useGame } from '../context/GameProvider.jsx'

export function JeopardyBoard() {
  const { state, dispatch } = useGame()
  const canPlay = state.board && state.teams.length > 0
  const activeTeam = state.teams[state.activeTeamIndex]

  if (!state.board) {
    return (
      <div className="board-placeholder panel">
        <p>Load a board JSON file to see the 6×5 grid.</p>
      </div>
    )
  }

  const rowCount = Math.max(
    ...state.board.categories.map((_, ci) =>
      state.board.cells.filter((c) => c.categoryIndex === ci).length,
    ),
  )

  return (
    <section className="board-section">
      <p className="turn-banner">
        {canPlay ? (
          <>
            On the clock: <strong>{activeTeam?.name}</strong>
          </>
        ) : (
          'Add teams to start selecting clues.'
        )}
      </p>
      <div className="jeopardy-grid" role="grid" aria-label="Jeopardy board">
        {state.board.categories.map((category, categoryIndex) => (
          <div key={category.name} className="board-column" role="rowgroup">
            <div className="category-cell" role="columnheader">
              {category.name}
            </div>
            {Array.from({ length: rowCount }).map((_, rowIndex) => {
              const cell = getCell(state.board, categoryIndex, rowIndex)
              if (!cell) {
                return <div key={rowIndex} className="clue-cell empty" />
              }
              const disabled = !canPlay || cell.resolved
              return (
                <button
                  key={rowIndex}
                  type="button"
                  className={
                    cell.resolved ? 'clue-cell resolved' : 'clue-cell'
                  }
                  disabled={disabled}
                  onClick={() =>
                    dispatch({
                      type: 'SELECT_CLUE',
                      categoryIndex,
                      rowIndex,
                    })
                  }
                >
                  {cell.resolved ? '' : `$${cell.value}`}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}
