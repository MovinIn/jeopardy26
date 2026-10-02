import { useState } from 'react'
import { useGame } from '../../context/GameProvider.jsx'
import { formatMoney } from '../../game/scoring.js'
import { SHOP_ITEMS, getShopItem, wagerLimit } from '../../game/shop.js'
import { BlackjackGame } from './BlackjackGame.jsx'
import { RouletteGame } from './RouletteGame.jsx'
import { SlotsGame } from './SlotsGame.jsx'

const GAMES = { blackjack: BlackjackGame, roulette: RouletteGame, slots: SlotsGame }

export function ShopModal({ onClose }) {
  const { state, dispatch } = useGame()
  // Defaults to the team in control, but the host can pick any team to gamble.
  const [pickedTeamId, setPickedTeamId] = useState(null)
  // { itemId, teamId } — the team is locked in when play starts so winnings can't land elsewhere.
  const [playing, setPlaying] = useState(null)

  const selectedId = pickedTeamId ?? state.teams[state.activeTeamIndex]?.id
  const selectedTeam = state.teams.find((t) => t.id === selectedId) ?? state.teams[0]
  const playingTeam = playing ? state.teams.find((t) => t.id === playing.teamId) : null
  const shownTeam = playingTeam ?? selectedTeam

  const Game = playing ? GAMES[playing.itemId] : null

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
          {shownTeam && (
            <p className="shop-balance">
              {shownTeam.name}: <strong>{formatMoney(shownTeam.score)}</strong>
            </p>
          )}
        </header>

        {Game ? (
          <Game
            team={playingTeam}
            item={getShopItem(playing.itemId)}
            onScore={(delta) =>
              delta !== 0 && dispatch({ type: 'ADJUST_SCORE', teamId: playing.teamId, delta })
            }
            onExit={() => setPlaying(null)}
          />
        ) : (
          <>
            <div className="team-select" role="group" aria-label="Team that is gambling">
              <p className="team-select-label">Who is gambling?</p>
              <div className="team-select-chips">
                {state.teams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    className={team.id === selectedTeam.id ? 'team-chip selected' : 'team-chip secondary'}
                    aria-pressed={team.id === selectedTeam.id}
                    onClick={() => setPickedTeamId(team.id)}
                  >
                    <span className="team-chip-name">{team.name}</span>
                    <span className="team-chip-score" data-negative={team.score < 0}>
                      {formatMoney(team.score)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <ul className="shop-items">
              {SHOP_ITEMS.map((item) => {
                const limit = wagerLimit(item, selectedTeam.score)
                const canPlay = limit >= item.minWager
                return (
                  <li key={item.id} className="shop-item">
                    <div>
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                      <p className="shop-item-range">
                        {canPlay
                          ? `Wager ${formatMoney(item.minWager)} to ${formatMoney(limit)}`
                          : `${selectedTeam.name} needs at least ${formatMoney(item.minWager)} to play`}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!canPlay}
                      onClick={() => setPlaying({ itemId: item.id, teamId: selectedTeam.id })}
                    >
                      Play
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
