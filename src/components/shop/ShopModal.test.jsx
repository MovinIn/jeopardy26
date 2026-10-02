import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { GameProvider } from '../../context/GameProvider.jsx'
import { ShopModal } from './ShopModal.jsx'

const STORAGE_KEY = 'jeopardy-game-state-v4'

function seedScores(scores) {
  const teams = scores.map((score, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    score,
    bonusTokens: 0,
    powerups: [],
  }))
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ teams, activeTeamIndex: 0 }))
}

function setup() {
  const user = userEvent.setup()
  render(
    <GameProvider>
      <ShopModal onClose={() => {}} />
    </GameProvider>,
  )
  return user
}

function playButtons() {
  return screen.getAllByRole('button', { name: 'Play' })
}

describe('ShopModal', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('has no prices, just a Play button and the wager range', () => {
    seedScores([5000, 0, 0, 0])
    setup()
    expect(screen.queryByText(/buy/i)).not.toBeInTheDocument()
    expect(playButtons()).toHaveLength(3)
    expect(screen.getByText('Wager $100 to $1,000')).toBeInTheDocument()
  })

  it('lets the host pick which team gambles', async () => {
    seedScores([1000, 1000, 1000, 1000])
    const user = setup()
    const group = screen.getByRole('group', { name: /team that is gambling/i })
    expect(within(group).getByRole('button', { name: /team 1/i })).toHaveAttribute('aria-pressed', 'true')

    await user.click(within(group).getByRole('button', { name: /team 3/i }))
    expect(within(group).getByRole('button', { name: /team 3/i })).toHaveAttribute('aria-pressed', 'true')

    await user.click(playButtons()[0])
    expect(screen.getByText(/playing for/i)).toHaveTextContent('Team 3')
  })

  it('caps the wager range at the points the team has', async () => {
    seedScores([0, 650, 0, 0])
    const user = setup()
    await user.click(screen.getByRole('button', { name: /team 2/i }))
    expect(screen.getByText('Wager $100 to $600')).toBeInTheDocument()
    expect(screen.getAllByText('Wager $50 to $200')).toHaveLength(2) // roulette and slots

    await user.click(playButtons()[0])
    expect(screen.getByRole('slider', { name: 'Wager' })).toHaveAttribute('max', '600')
  })

  it('will not let a team play a game it cannot cover the minimum wager for', async () => {
    seedScores([75, 0, -300, 0])
    const user = setup()
    // $75 covers roulette ($50 minimum) but not blackjack ($100 minimum).
    const [blackjack, roulette, slots] = playButtons()
    expect(blackjack).toBeDisabled()
    expect(roulette).toBeEnabled()
    expect(slots).toBeEnabled()
    expect(screen.getByText(/team 1 needs at least \$100 to play/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /team 3/i }))
    for (const button of playButtons()) {
      expect(button).toBeDisabled()
    }
  })

  it('applies a blackjack result to the chosen team only', async () => {
    seedScores([1000, 1000, 1000, 1000])
    const user = setup()
    await user.click(screen.getByRole('button', { name: /team 2/i }))
    await user.click(playButtons()[0])

    await user.click(screen.getByRole('button', { name: 'Raise wager' }))
    expect(screen.getByRole('slider', { name: 'Wager' })).toHaveValue('200')
    await user.click(screen.getByRole('button', { name: 'Deal' }))
    // The hand may end instantly (natural) or need a stand; either way finish it.
    const stand = screen.queryByRole('button', { name: 'Stand' })
    if (stand) {
      await user.click(stand)
    }
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    const scores = saved.teams.map((t) => t.score)
    expect(scores[0]).toBe(1000)
    expect(scores[2]).toBe(1000)
    expect(scores[3]).toBe(1000)
    expect([800, 1000, 1200]).toContain(scores[1])
  })
})
