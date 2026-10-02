import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { gameReducer, initialGameState } from './gameReducer.js'

const STORAGE_KEY = 'jeopardy-game-state-v2'

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
  const [state, dispatch] = useReducer(gameReducer, initialGameState, (base) => {
    const saved = loadPersistedState()
    if (saved) {
      return { ...base, ...saved }
    }
    return base
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage full or unavailable; the game still works for this session
    }
  }, [state])

  const value = useMemo(() => ({ state, dispatch }), [state])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) {
    throw new Error('useGame must be used within GameProvider')
  }
  return ctx
}
