import { createInitialBoard } from '../game/board.js'

export function makeValidBoardPayload() {
  const categories = Array.from({ length: 6 }, (_, ci) => ({
    name: `Category ${ci + 1}`,
    clues: [200, 400, 600, 800, 1000].map((value) => ({
      value,
      clue: `Clue ${ci}-${value}`,
      answer: `Answer ${ci}-${value}`,
    })),
  }))
  const boardData = {
    title: 'Fixture Game',
    categories,
    spinnerEvents: ['Spin event'],
  }
  const board = createInitialBoard(categories)
  board.title = boardData.title
  return { boardData, board }
}
