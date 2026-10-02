import { useEffect, useRef } from 'react'
import { createThinkingToneLoop } from '../game/thinkingToneLoop.js'
import { useGameMusicControls } from '../hooks/useGameMusic.jsx'

const FILE_SOURCES = ['/audio/jeopardy-theme.mp3', '/audio/jeopardy-theme.ogg']
const BASE_VOLUME = 0.45
const DUCKED_VOLUME = BASE_VOLUME * 0.3

/**
 * Loops host background music during the main board phase.
 * Uses MP3 when present; otherwise Web Audio “thinking” tones.
 */
export function GameMusic({ active, ducked }) {
  const { muted, autoplayUnlocked } = useGameMusicControls()
  const audioRef = useRef(null)
  const fallbackRef = useRef(null)
  const modeRef = useRef('file')
  const fileIndexRef = useRef(0)

  useEffect(() => {
    const audio = new Audio()
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = BASE_VOLUME
    audioRef.current = audio

    const tryNextFile = () => {
      fileIndexRef.current += 1
      if (fileIndexRef.current < FILE_SOURCES.length) {
        audio.src = FILE_SOURCES[fileIndexRef.current]
        audio.load()
        return
      }
      modeRef.current = 'fallback'
      audio.removeAttribute('src')
      audio.load()
    }

    const onError = () => {
      if (modeRef.current === 'file') {
        tryNextFile()
      }
    }
    audio.addEventListener('error', onError)
    audio.src = FILE_SOURCES[0]
    modeRef.current = 'file'
    fallbackRef.current = createThinkingToneLoop()

    return () => {
      audio.removeEventListener('error', onError)
      audio.pause()
      fallbackRef.current?.stop()
    }
  }, [])

  useEffect(() => {
    const level = ducked ? DUCKED_VOLUME : BASE_VOLUME
    const audio = audioRef.current
    if (audio) {
      audio.volume = level
    }
    fallbackRef.current?.setGain(level * 0.18)
  }, [ducked])

  useEffect(() => {
    const audio = audioRef.current
    const fallback = fallbackRef.current

    const stopAll = () => {
      audio?.pause()
      fallback?.stop()
    }

    if (!active || muted || !autoplayUnlocked) {
      stopAll()
      return undefined
    }

    const startPlayback = async () => {
      if (!audio || !fallback) {
        return
      }
      if (modeRef.current === 'file' && audio.error) {
        modeRef.current = 'fallback'
      }
      if (modeRef.current === 'file') {
        fallback.stop()
        try {
          await audio.play()
        } catch {
          modeRef.current = 'fallback'
          audio.pause()
          fallback.start()
        }
        return
      }
      audio.pause()
      fallback.start()
    }

    startPlayback()
    return () => stopAll()
  }, [active, muted, autoplayUnlocked])

  return null
}
