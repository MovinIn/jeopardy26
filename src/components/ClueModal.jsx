import { useEffect, useRef, useState } from 'react'
import { getCell, highestClueValue } from '../game/board.js'
import { MIN_WAGER, formatMoney, maxDailyDoubleWager } from '../game/scoring.js'
import { useGame } from '../context/GameProvider.jsx'
import { ClueText } from './ClueText.jsx'
import { resolveClueImageSrc } from './clueMedia.js'
import { SPELLING_CHAOS_ANIMATION } from '../game/spellingChaos.js'
import { SpellingChaosClue } from './SpellingChaosClue.jsx'
import { FlappyGame } from './FlappyGame.jsx'
import { ReactionGame } from './ReactionGame.jsx'
import { SnakeGame } from './SnakeGame.jsx'
import { play } from '../audio/sfx.js'
import { TetrisGame } from './TetrisGame.jsx'
import { TypingGame } from './TypingGame.jsx'

function WagerForm({ team, maxWager, onSubmit }) {
  const [amount, setAmount] = useState(String(Math.min(maxWager, Math.max(team.score, MIN_WAGER))))

  return (
    <form
      className="wager-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(amount)
      }}
    >
      <p className="wager-prompt">
        <strong>{team.name}</strong>, how much will you wager?
      </p>
      <p className="wager-range">
        {formatMoney(MIN_WAGER)} to {formatMoney(maxWager)}
      </p>
      <input
        type="number"
        min={MIN_WAGER}
        max={maxWager}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        aria-label="Wager"
        autoFocus
      />
      <button type="submit">Lock in wager</button>
    </form>
  )
}

const MINIGAMES = {
  snake: SnakeGame,
  flappy: FlappyGame,
  tetris: TetrisGame,
  typing: TypingGame,
  reaction: ReactionGame,
}

export function ClueModal() {
  const { state, dispatch } = useGame()
  const sel = state.selectedClue

  // A page reload mid-mini-game (a tab waking up, say): dismiss a finished one, and start an
  // unfinished one over, so the team isn't charged for a reload it didn't choose.
  const loadedWith = useRef(sel)
  useEffect(() => {
    const saved = loadedWith.current
    if (saved?.stage !== 'minigame') {
      return
    }
    if (saved.result) {
      dispatch({ type: 'CLOSE_CLUE' })
    } else if (saved.started) {
      dispatch({ type: 'RESTART_MINIGAME' })
    }
  }, [dispatch])

  // A Daily Double gets its own fanfare the moment it is uncovered.
  const dailyDoubleKey = sel?.stage === 'wager' ? `${sel.categoryIndex},${sel.rowIndex}` : null
  useEffect(() => {
    if (dailyDoubleKey) {
      play('dailyDouble')
    }
  }, [dailyDoubleKey])

  if (!sel || !state.board) {
    return null
  }

  const cell = getCell(state.board, sel.categoryIndex, sel.rowIndex)
  if (!cell) {
    return null
  }

  const categoryName = state.board.categories[sel.categoryIndex]?.name ?? 'Category'
  const controller = state.teams[state.activeTeamIndex]
  const isDailyDouble = cell.dailyDouble
  const stake = sel.wager ?? cell.value
  const clueImageSrc = resolveClueImageSrc(cell.image)
  const isMinigame = sel.stage === 'minigame'
  const Minigame = isMinigame ? MINIGAMES[sel.minigame] : null
  const canClose = isMinigame
    ? !sel.started
    : sel.lockedOut.length === 0 && sel.wager === null

  return (
    <div className="clue-screen" role="dialog" aria-modal="true" aria-label={`${categoryName} for ${formatMoney(cell.value)}`}>
      <header className="clue-screen-header">
        <p className="clue-category">{categoryName}</p>
        <p className="clue-value">{isDailyDouble ? `Wager ${formatMoney(stake)}` : formatMoney(cell.value)}</p>
        {canClose && (
          <button
            type="button"
            className="secondary clue-close"
            onClick={() => {
              play('tick')
              dispatch({ type: 'CLOSE_CLUE' })
            }}
          >
            Back to board
          </button>
        )}
      </header>

      {Minigame ? (
        <div className="clue-body">
          <Minigame
            team={controller}
            stake={cell.value}
            onStart={() => dispatch({ type: 'MINIGAME_STARTED' })}
            onFinish={(won) => dispatch({ type: 'FINISH_MINIGAME', won })}
            onExit={() => dispatch({ type: 'CLOSE_CLUE' })}
          />
        </div>
      ) : sel.stage === 'wager' ? (
        <div className="clue-body">
          <p className="daily-double-banner">Daily Double!</p>
          <WagerForm
            team={controller}
            maxWager={maxDailyDoubleWager(controller.score, highestClueValue(state.board))}
            onSubmit={(amount) => {
              play('ticket')
              dispatch({ type: 'SET_WAGER', amount })
            }}
          />
        </div>
      ) : (
        <div className="clue-body">
          {isDailyDouble && (
            <p className="clue-answering">
              <strong>{controller.name}</strong> is answering for {formatMoney(sel.wager)}
            </p>
          )}
          {clueImageSrc && (
            <figure className="clue-figure">
              <img className="clue-image" src={clueImageSrc} alt="Diagram for this clue" />
            </figure>
          )}
          <p className="clue-text">
            <ClueText text={cell.clue} />
          </p>

          {sel.revealed && (
            <p className="clue-answer">
              <ClueText text={cell.answer} />
            </p>
          )}

          {cell.animation === SPELLING_CHAOS_ANIMATION && (
            <SpellingChaosClue key={cell.spellingWord} word={cell.spellingWord ?? 'Ezekiel'} />
          )}

          <div className="judge-panel">
            {(isDailyDouble ? [controller] : state.teams).map((team) => {
              const lockedOut = sel.lockedOut.includes(team.id)
              return (
                <div key={team.id} className={lockedOut ? 'judge-row locked' : 'judge-row'}>
                  <span className="judge-name">{team.name}</span>
                  <button
                    type="button"
                    className="success"
                    disabled={lockedOut}
                    onClick={() => {
                      play('correct')
                      dispatch({ type: 'ANSWER_CLUE', teamId: team.id, correct: true })
                    }}
                  >
                    Correct +{formatMoney(stake)}
                  </button>
                  <button
                    type="button"
                    className="danger"
                    disabled={lockedOut}
                    onClick={() => {
                      play('wrong')
                      dispatch({ type: 'ANSWER_CLUE', teamId: team.id, correct: false })
                    }}
                  >
                    {lockedOut ? 'Locked out' : `Incorrect −${formatMoney(stake)}`}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="clue-actions">
            <button
              type="button"
              className="secondary"
              disabled={sel.revealed}
              onClick={() => {
                play('reveal')
                dispatch({ type: 'REVEAL_ANSWER' })
              }}
            >
              Reveal response
            </button>
            {!isDailyDouble && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  play('pass')
                  dispatch({ type: 'PASS_CLUE' })
                }}
              >
                No one got it
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
