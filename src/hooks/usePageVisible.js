import { useSyncExternalStore } from 'react'

const subscribe = (onChange) => {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

const isVisible = () => document.visibilityState !== 'hidden'

/**
 * True while the tab is on screen. Games use it to stand still while you are on another tab, so
 * nothing runs, ends or catches up behind your back.
 */
export function usePageVisible() {
  return useSyncExternalStore(subscribe, isVisible, () => true)
}
