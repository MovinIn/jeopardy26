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

/**
 * A short fingerprint of a board's content, so a saved game can tell whether public/board.json
 * has been edited since the game was started.
 */
export function boardFingerprint(data) {
  const text = JSON.stringify(data)
  let hash = 5381
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(36)
}
