export const MUSIC_PREFS_KEY = 'jeopardy-music-prefs-v1'

export const defaultMusicPrefs = { muted: true }

export function loadMusicPrefs() {
  try {
    const raw = localStorage.getItem(MUSIC_PREFS_KEY)
    if (!raw) {
      return { ...defaultMusicPrefs }
    }
    const parsed = JSON.parse(raw)
    return { muted: Boolean(parsed.muted) }
  } catch {
    return { ...defaultMusicPrefs }
  }
}

export function saveMusicPrefs(prefs) {
  try {
    localStorage.setItem(MUSIC_PREFS_KEY, JSON.stringify({ muted: Boolean(prefs.muted) }))
  } catch {
    // storage unavailable; session-only mute state still works in memory
  }
}
