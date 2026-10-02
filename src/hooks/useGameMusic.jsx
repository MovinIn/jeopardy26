import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { loadMusicPrefs, saveMusicPrefs } from '../game/gameMusicPrefs.js'

const GameMusicContext = createContext(null)

export function GameMusicProvider({ children }) {
  const [muted, setMuted] = useState(() => loadMusicPrefs().muted)
  const [autoplayUnlocked, setAutoplayUnlocked] = useState(false)

  useEffect(() => {
    saveMusicPrefs({ muted })
  }, [muted])

  useEffect(() => {
    const unlock = () => setAutoplayUnlocked(true)
    document.addEventListener('pointerdown', unlock, { once: true })
    document.addEventListener('keydown', unlock, { once: true })
    return () => {
      document.removeEventListener('pointerdown', unlock)
      document.removeEventListener('keydown', unlock)
    }
  }, [])

  const toggleMuted = useCallback(() => {
    setAutoplayUnlocked(true)
    setMuted((prev) => !prev)
  }, [])

  const value = useMemo(
    () => ({
      muted,
      toggleMuted,
      autoplayUnlocked,
    }),
    [muted, toggleMuted, autoplayUnlocked],
  )

  return <GameMusicContext.Provider value={value}>{children}</GameMusicContext.Provider>
}

export function useGameMusicControls() {
  const ctx = useContext(GameMusicContext)
  if (!ctx) {
    throw new Error('useGameMusicControls must be used within GameMusicProvider')
  }
  return ctx
}
