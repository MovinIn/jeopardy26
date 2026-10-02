import { useSyncExternalStore } from 'react'
import { isSfxMuted, setSfxMuted, subscribeSfx } from '../audio/sfx.js'

/** [muted, setMuted] for the sound-effects switch; every component using it stays in step. */
export function useSfxMuted() {
  const muted = useSyncExternalStore(subscribeSfx, isSfxMuted, () => false)
  return [muted, setSfxMuted]
}
