import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { loadBoardFromFile } from '../data/loadBoard.js'
import { gameReducer, initialGameState } from './gameReducer.js'

const STORAGE_KEY = 'jeopardy-game-state-v4'

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

  useEffect(() => {
    if (state.source) {
      return undefined
    }
    let cancelled = false
    loadBoardFromFile()
      .then((result) => {
        if (cancelled) {
          return
        }
        setBoardLoadError(null)
        dispatch({
          type: 'INIT_FROM_FILE',
          boardData: result.data,
          warnings: result.warnings,
        })
      })
      .catch((err) => {
        if (!cancelled) {
          setBoardLoadError(err.message)
        }
      })
    return () => {
      cancelled = true
    }
  }, [state.source])

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
