import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { boardFingerprint, loadBoardFromFile } from '../data/loadBoard.js'
import { gameReducer, initialGameState } from './gameReducer.js'
import { STORAGE_KEY } from './storageKey.js'


const GameContext = createContext(null)

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function GameProvider({ children }) {
  const [boardLoadError, setBoardLoadError] = useState(null)
  const [state, dispatch] = useReducer(gameReducer, initialGameState, (base) => {
    const saved = loadPersistedState()
    if (saved) {
      return { ...base, ...saved }
    }
    return base
  })

  // A saved game is only trusted if board.json hasn't changed since it was started; the error
  // banner is only for a first run, when there is no saved game to fall back on.
  const hadSavedGame = useRef(Boolean(state.source))
  useEffect(() => {
    let cancelled = false
    loadBoardFromFile()
      .then((result) => {
        if (cancelled) {
          return
        }
        setBoardLoadError(null)
        dispatch({
          type: 'SYNC_BOARD_FILE',
          boardData: result.data,
          warnings: result.warnings,
          fingerprint: boardFingerprint(result.data),
        })
      })
      .catch((err) => {
        if (!cancelled && !hadSavedGame.current) {
          setBoardLoadError(err.message)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const hasGame = Boolean(state.source || state.board)
    if (!hasGame || (state.spinnerEvents?.length ?? 0) > 0) {
      return undefined
    }
    let cancelled = false
    loadBoardFromFile()
      .then((result) => {
        if (cancelled || !result.data.spinnerEvents?.length) {
          return
        }
        dispatch({ type: 'SET_SPINNER_EVENTS', events: result.data.spinnerEvents })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [state.source, state.board, state.spinnerEvents?.length])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage full or unavailable; the game still works for this session
    }
  }, [state])

  const value = useMemo(
    () => ({ state, dispatch, boardLoadError }),
    [state, boardLoadError],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) {
    throw new Error('useGame must be used within GameProvider')
  }
  return ctx
}
