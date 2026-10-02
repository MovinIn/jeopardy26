export function createInitialBoard(categories) {
  const cells = []
  categories.forEach((category, categoryIndex) => {
    category.clues.forEach((clueData, rowIndex) => {
      cells.push({
        categoryIndex,
        rowIndex,
        value: clueData.value,
        clue: clueData.clue,
        answer: clueData.answer,
        dailyDouble: Boolean(clueData.dailyDouble),
        resolved: false,
        result: null,
      })
    })
  })

  return {
    title: null,
    categories: categories.map((c) => ({ name: c.name })),
    cells,
  }
}

export function markClueResolved(board, categoryIndex, rowIndex, result) {
  return {
    ...board,
    cells: board.cells.map((cell) => {
      if (cell.categoryIndex === categoryIndex && cell.rowIndex === rowIndex) {
        return { ...cell, resolved: true, result }
      }
      return cell
    }),
  }
}

export function getCell(board, categoryIndex, rowIndex) {
  return board.cells.find(
    (c) => c.categoryIndex === categoryIndex && c.rowIndex === rowIndex,
  )
}

export function allCluesResolved(board) {
  if (!board?.cells?.length) {
    return false
  }
  return board.cells.every((cell) => cell.resolved)
}

export function highestClueValue(board) {
  return board.cells.reduce((max, cell) => Math.max(max, cell.value), 0)
}

/**
 * Hides `count` Daily Doubles on a round unless the author already flagged some.
 * Like the show, they never sit in the top row and never share a column.
 */
export function assignDailyDoubles(categories, count, rng = Math.random) {
  if (categories.some((cat) => cat.clues.some((c) => c.dailyDouble))) {
    return categories
  }
  const columns = categories.map((_, i) => i)
  const picks = new Map()
  for (let n = 0; n < count && columns.length > 0; n++) {
    const column = columns.splice(Math.floor(rng() * columns.length), 1)[0]
    const rowCount = categories[column].clues.length
    const row = rowCount > 1 ? 1 + Math.floor(rng() * (rowCount - 1)) : 0
    picks.set(column, row)
  }
  return categories.map((cat, ci) => ({
    ...cat,
    clues: cat.clues.map((clue, ri) => ({
      ...clue,
      dailyDouble: picks.get(ci) === ri,
    })),
  }))
}
