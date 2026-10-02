import { useEffect, useState } from 'react'
import { handValue, hit, newGame, scoreDelta, stand } from '../../game/blackjack.js'
import { formatMoney } from '../../game/scoring.js'
import { play } from '../../audio/sfx.js'
import { wagerLimit } from '../../game/shop.js'
import { WagerPicker } from './WagerPicker.jsx'

const DEAL_STEP_MS = 500
const REVEAL_MS = 300
const DEALER_DRAW_MS = 600

/**
 * A playing card that slides in face-down, then flips over after `delay` ms.
 * Passing faceUp=false keeps it on its back (the dealer's hole card) until it flips to true.
 * The face is only rendered once faceUp is requested, so a hidden card isn't in the DOM.
 */
function Card({ card, faceUp, delay }) {
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    if (!faceUp) {
      return undefined
    }
    const timer = window.setTimeout(() => {
      play('card')
      setFlipped(true)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [faceUp, delay])

  const red = card.suit === '♥' || card.suit === '♦'

  return (
    <div
      className={faceUp && flipped ? 'bj-card flipped' : 'bj-card'}
      style={{ '--delay': `${delay}ms` }}
      role="img"
      aria-label={faceUp ? `${card.rank} of ${card.suit}` : 'Face-down card'}
    >
      <div className="bj-card-inner">
        <div className="bj-face bj-back" />
        <div className={red ? 'bj-face bj-front red' : 'bj-face bj-front'}>
          {faceUp && (
            <>
              <span className="bj-corner top">
                {card.rank}
                <small>{card.suit}</small>
              </span>
              <span className="bj-center">{card.suit}</span>
              <span className="bj-corner bottom">
                {card.rank}
                <small>{card.suit}</small>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** Plays one hand for `team`; the ±stake is applied to their score the moment the hand ends. */
export function BlackjackGame({ team, item, onScore, onExit }) {
  // Fixed when the game opens: you can't wager more points than you have.
  const [maxWager] = useState(() => wagerLimit(item, team.score))
  const [wager, setWager] = useState(item.minWager)
  const [game, setGame] = useState(null) // null until the wager is locked in and cards are dealt

  function advance(next) {
    setGame(next)
    if (next.status === 'done') {
      const delta = scoreDelta(next.outcome, wager)
      onScore(delta)
      const wait = REVEAL_MS + Math.max(0, next.dealer.length - 1) * DEALER_DRAW_MS + 700
      window.setTimeout(() => play(delta > 0 ? 'win' : delta < 0 ? 'lose' : 'tick'), wait)
    }
  }

  if (!game) {
    return (
      <div className="bj-table">
        <p className="bj-team">
          Playing for <strong>{team.name}</strong>
        </p>
        <WagerPicker min={item.minWager} max={maxWager} step={item.step} value={wager} onChange={setWager} />
        <p className="bj-team">
          Win +{formatMoney(wager)} · lose −{formatMoney(wager)} · push changes nothing
        </p>
        <button type="button" className="bj-deal-btn" onClick={() => advance(newGame())}>
          Deal
        </button>
      </div>
    )
  }

  const done = game.status === 'done'
  const delta = done ? scoreDelta(game.outcome, wager) : 0

  // Cards of the opening deal land one after another; later draws flip straight away.
  function playerDelay(i) {
    return i < 2 ? i * DEAL_STEP_MS : 0
  }
  function dealerDelay(i) {
    if (!done) {
      return i === 0 ? DEAL_STEP_MS / 2 : 0
    }
    return i <= 1 ? REVEAL_MS : REVEAL_MS + (i - 1) * DEALER_DRAW_MS
  }
  const resultDelay = REVEAL_MS + Math.max(0, game.dealer.length - 1) * DEALER_DRAW_MS + 700

  const dealerTotal = done ? handValue(game.dealer) : handValue(game.dealer.slice(0, 1))

  return (
    <div className="bj-table">
      <p className="bj-team">
        Playing for <strong>{team.name}</strong> · wager {formatMoney(wager)}
      </p>

      <section className="bj-hand" aria-label="Dealer hand">
        <h3>
          Dealer <span className="bj-total">{done ? dealerTotal : `${dealerTotal} + ?`}</span>
        </h3>
        <div className="bj-cards">
          {game.dealer.map((card, i) => (
            <Card key={i} card={card} faceUp={done || i === 0} delay={dealerDelay(i)} />
          ))}
        </div>
      </section>

      <div className="bj-divider" aria-hidden="true" />

      <section className="bj-hand" aria-label="Your hand">
        <h3>
          You <span className="bj-total">{handValue(game.player)}</span>
        </h3>
        <div className="bj-cards">
          {game.player.map((card, i) => (
            <Card key={i} card={card} faceUp delay={playerDelay(i)} />
          ))}
        </div>
      </section>

      {done ? (
        <div
          className="bj-result"
          data-outcome={game.outcome}
          style={{ '--result-delay': `${resultDelay}ms` }}
        >
          <p className="bj-message">{game.message}</p>
          <p className="bj-delta">
            {delta === 0 ? 'No points change' : `${delta > 0 ? '+' : '−'}${formatMoney(Math.abs(delta))}`}
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
