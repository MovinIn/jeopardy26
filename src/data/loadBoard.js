import { validateBoardJson } from '../game/validateBoard.js'

export const BOARD_FILE_URL = '/board.json'

export async function loadBoardFromFile(url = BOARD_FILE_URL) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Could not load board file (${response.status}).`)
  }
  const json = await response.json()
  const result = validateBoardJson(json)
  if (!result.ok) {
    throw new Error(result.errors.join(' '))
  }
  return result
}
