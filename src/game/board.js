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
        hint: clueData.hint ?? null,
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
