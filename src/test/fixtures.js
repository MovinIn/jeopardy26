import { createInitialBoard } from '../game/board.js'

export function makeCategories(values = [200, 400, 600, 800, 1000]) {
  return Array.from({ length: 6 }, (_, ci) => ({
    name: `Category ${ci + 1}`,
    clues: values.map((value) => ({
      value,
      clue: `Clue ${ci}-${value}`,
      answer: `Answer ${ci}-${value}`,
    })),
  }))
}

export function makeValidBoardPayload() {
  const categories = makeCategories()
  const boardData = {
    title: 'Fixture Game',
    categories,
    doubleJeopardy: makeCategories([400, 800, 1200, 1600, 2000]),
    finalJeopardy: { category: 'Final Cat', clue: 'Final clue', answer: 'Final answer' },
  }
  const board = createInitialBoard(categories)
  board.title = boardData.title
  return { boardData, board }
}
