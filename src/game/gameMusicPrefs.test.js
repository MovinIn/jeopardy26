import { describe, expect, it, beforeEach } from 'vitest'
import {
  MUSIC_PREFS_KEY,
  defaultMusicPrefs,
  loadMusicPrefs,
  saveMusicPrefs,
} from './gameMusicPrefs.js'

describe('loadMusicPrefs', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default muted prefs when storage is empty', () => {
    expect(loadMusicPrefs()).toEqual(defaultMusicPrefs)
  })

  it('returns saved muted flag when prefs exist in storage', () => {
    localStorage.setItem(MUSIC_PREFS_KEY, JSON.stringify({ muted: false }))
    expect(loadMusicPrefs()).toEqual({ muted: false })
  })

  it('returns default prefs when stored JSON is invalid', () => {
    localStorage.setItem(MUSIC_PREFS_KEY, 'not-json')
    expect(loadMusicPrefs()).toEqual(defaultMusicPrefs)
  })
})

describe('saveMusicPrefs', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('persists muted flag to localStorage under music prefs key', () => {
    saveMusicPrefs({ muted: true })
    expect(localStorage.getItem(MUSIC_PREFS_KEY)).toBe(JSON.stringify({ muted: true }))
  })
})
