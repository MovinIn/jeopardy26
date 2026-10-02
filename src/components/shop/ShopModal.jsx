import { useEffect, useState } from 'react'
import { play } from '../../audio/sfx.js'
import { useGame } from '../../context/GameProvider.jsx'
import { formatMoney } from '../../game/scoring.js'
import { SHOP_ITEMS, getShopItem, wagerLimit } from '../../game/shop.js'
import { BlackjackGame } from './BlackjackGame.jsx'
import { RouletteGame } from './RouletteGame.jsx'
import { SlotsGame } from './SlotsGame.jsx'

const GAMES = { blackjack: BlackjackGame, roulette: RouletteGame, slots: SlotsGame }

// Carnival decoration only: none of this is read out or clickable.
const GAME_ICONS = { blackjack: '🃏', roulette: '🎡', slots: '🎰' }
const FLAG_COLORS = ['#e6283c', '#ffd23f', '#19c7c1', '#ff5fa2', '#6a2ec9', '#ff8a2b']
const CONFETTI = [
  { left: '4%', delay: '-1s', color: '#ffd23f' },
  { left: '11%', delay: '-6s', color: '#ff5fa2' },
  { left: '19%', delay: '-3s', color: '#19c7c1' },
  { left: '27%', delay: '-9s', color: '#e6283c' },
  { left: '35%', delay: '-4s', color: '#ffffff' },
  { left: '44%', delay: '-7s', color: '#ff8a2b' },
  { left: '52%', delay: '-2s', color: '#6a2ec9' },
  { left: '60%', delay: '-8s', color: '#ffd23f' },
  { left: '68%', delay: '-5s', color: '#19c7c1' },
  { left: '76%', delay: '-10s', color: '#ff5fa2' },
  { left: '84%', delay: '-3.5s', color: '#e6283c' },
  { left: '92%', delay: '-6.5s', color: '#ffffff' },
]

function Bunting() {
  const flags = 14
  return (
    <svg className="shop-bunting" viewBox={`0 0 ${flags * 30} 44`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`M0 4 Q${flags * 15} 14 ${flags * 30} 4`} stroke="#fff3c4" strokeWidth="2" fill="none" />
      {Array.from({ length: flags }, (_, i) => {
        const x = i * 30 + 2
        const sag = 4 + Math.sin((i / flags) * Math.PI) * 5
        return (
          <polygon
            key={i}
            points={`${x},${sag} ${x + 26},${sag} ${x + 13},${sag + 30}`}
            fill={FLAG_COLORS[i % FLAG_COLORS.length]}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth="1"
          />
        )
      })}
    </svg>
  )
}

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

  // A little carnival jingle as the stall opens.
  useEffect(() => {
    play('shopOpen')
  }, [])

  return (
    <div className="spinner-popup-backdrop shop-backdrop" role="presentation" onClick={onClose}>
      <div
        className="spinner-popup shop-popup"
        role="dialog"
        aria-modal="true"
        aria-label="Shop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shop-confetti" aria-hidden="true">
          {CONFETTI.map((piece) => (
            <span
              key={piece.left}
              style={{ left: piece.left, animationDelay: piece.delay, background: piece.color }}
            />
          ))}
        </div>

        <div className="shop-awning" aria-hidden="true" />
        <Bunting />

        <button
          type="button"
          className="spinner-popup-close secondary shop-close"
          onClick={() => {
            play('tick')
            onClose()
          }}
        >
          Close
        </button>

        <header className="shop-header">
          <p className="shop-kicker" aria-hidden="true">
            ★ Step right up! ★
          </p>
          <h2 className="shop-title">
            <span aria-hidden="true">🎪</span> Shop <span aria-hidden="true">🎠</span>
          </h2>
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
                    onClick={() => {
                      play('tick')
                      setPickedTeamId(team.id)
                    }}
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
                  <li key={item.id} className="shop-item" data-game={item.id} data-locked={!canPlay}>
                    <span className="shop-item-icon" aria-hidden="true">
                      {GAME_ICONS[item.id] ?? '🎟️'}
                    </span>
                    <div className="shop-item-body">
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
                      className="shop-play"
                      disabled={!canPlay}
                      onClick={() => {
                        play('ticket')
                        setPlaying({ itemId: item.id, teamId: selectedTeam.id })
                      }}
                    >
                      <span aria-hidden="true">🎟️</span>
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
