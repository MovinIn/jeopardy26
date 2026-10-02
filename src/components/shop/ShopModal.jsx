import { useState } from 'react'
import { useGame } from '../../context/GameProvider.jsx'
import { formatMoney } from '../../game/scoring.js'
import { SHOP_ITEMS, canAfford } from '../../game/shop.js'
import { BlackjackGame } from './BlackjackGame.jsx'

const GAMES = { blackjack: BlackjackGame }

export function ShopModal({ onClose }) {
  const { state, dispatch } = useGame()
  const activeTeam = state.teams[state.activeTeamIndex]
  // { itemId, team } — the team is captured at purchase so the payout can't land on someone else.
  const [playing, setPlaying] = useState(null)

  const Game = playing ? GAMES[playing.itemId] : null
  // Read the live score so the header updates when the hand ends.
  const playingTeam = playing ? state.teams.find((t) => t.id === playing.team.id) : null

  function buy(item) {
    dispatch({ type: 'BUY_SHOP_ITEM', itemId: item.id })
    setPlaying({ itemId: item.id, team: activeTeam })
  }

  return (
    <div className="spinner-popup-backdrop" role="presentation" onClick={onClose}>
      <div
        className="spinner-popup shop-popup"
        role="dialog"
        aria-modal="true"
        aria-label="Shop"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="spinner-popup-close secondary" onClick={onClose}>
          Close
        </button>

        <header className="shop-header">
          <h2 className="shop-title">Shop</h2>
          {(playingTeam ?? activeTeam) && (
            <p className="shop-balance">
              {(playingTeam ?? activeTeam).name}: <strong>{formatMoney((playingTeam ?? activeTeam).score)}</strong>
            </p>
          )}
        </header>

        {Game ? (
          <Game
            team={playing.team}
            onScore={(delta) =>
              delta !== 0 && dispatch({ type: 'ADJUST_SCORE', teamId: playing.team.id, delta })
            }
            onExit={() => setPlaying(null)}
          />
        ) : (
          <ul className="shop-items">
            {SHOP_ITEMS.map((item) => (
              <li key={item.id} className="shop-item">
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                </div>
                <button type="button" disabled={!canAfford(activeTeam, item)} onClick={() => buy(item)}>
                  Buy {formatMoney(item.price)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
