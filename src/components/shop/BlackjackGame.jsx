import { useState } from 'react'
import { handValue, hit, newGame, scoreDelta, stand } from '../../game/blackjack.js'
import { formatMoney } from '../../game/scoring.js'

function Card({ card, hidden }) {
  if (hidden) {
    return <div className="bj-card bj-card-back" aria-label="Face-down card" />
  }
  const red = card.suit === '♥' || card.suit === '♦'
  return (
    <div className={red ? 'bj-card red' : 'bj-card'} aria-label={`${card.rank} of ${card.suit}`}>
      <span className="bj-card-rank">{card.rank}</span>
      <span className="bj-card-suit">{card.suit}</span>
    </div>
  )
}

/** Plays one hand for `team`; the ±stake is applied to their score the moment the hand ends. */
export function BlackjackGame({ team, onScore, onExit }) {
  const [game, setGame] = useState(() => newGame())

  function advance(next) {
    setGame(next)
    if (next.status === 'done') {
      onScore(scoreDelta(next.outcome))
    }
  }

  const done = game.status === 'done'
  const delta = done ? scoreDelta(game.outcome) : 0

  return (
    <div className="bj-table">
      <p className="bj-team">
        Playing for: <strong>{team.name}</strong>
      </p>

      <section className="bj-hand" aria-label="Dealer hand">
        <h3>Dealer {done ? `(${handValue(game.dealer)})` : ''}</h3>
        <div className="bj-cards">
          {game.dealer.map((card, i) => (
            <Card key={i} card={card} hidden={!done && i === 1} />
          ))}
        </div>
      </section>

      <section className="bj-hand" aria-label="Your hand">
        <h3>You ({handValue(game.player)})</h3>
        <div className="bj-cards">
          {game.player.map((card, i) => (
            <Card key={i} card={card} />
          ))}
        </div>
      </section>

      {done ? (
        <div className="bj-result" data-outcome={game.outcome}>
          <p className="bj-message">{game.message}</p>
          <p className="bj-delta">
            {delta === 0 ? 'No points change' : `${delta > 0 ? '+' : ''}${formatMoney(delta)}`}
          </p>
          <button type="button" onClick={onExit}>
            Back to shop
          </button>
        </div>
      ) : (
        <div className="bj-actions">
          <button type="button" onClick={() => advance(hit(game))}>
            Hit
          </button>
          <button type="button" className="secondary" onClick={() => advance(stand(game))}>
            Stand
          </button>
        </div>
      )}
    </div>
  )
}
