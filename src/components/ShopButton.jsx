import { useState } from 'react'
import { useGame } from '../context/GameProvider.jsx'
import { ShopModal } from './shop/ShopModal.jsx'

export function ShopButton() {
  const { state } = useGame()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className="spinner-compact"
        onClick={() => setOpen(true)}
        disabled={state.teams.length === 0}
        aria-label="Open shop"
        title="Shop: gamble on mini games"
      >
        <span className="spinner-compact-wheel" aria-hidden="true">
          🎡
        </span>
        <span className="spinner-compact-label">Shop</span>
      </button>

      {open && <ShopModal onClose={() => setOpen(false)} />}
    </>
  )
}
