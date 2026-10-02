import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SlotsGame } from './SlotsGame.jsx'

const team = { id: 'team-1', name: 'Team 1', score: 1000 }
const item = { id: 'slots', minWager: 50, maxWager: 200, step: 50 }

function setup(onScore = () => {}, props = {}) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  const view = render(
    <SlotsGame team={team} item={item} onScore={onScore} onExit={() => {}} {...props} />,
  )
  return { user, ...view }
}

async function finishSpin() {
  await act(async () => {
    vi.advanceTimersByTime(6000)
  })
}

// Each spin rolls its outcome first: <.001 sevens, <.1 other triples, <.38 two cherries,
// <.7 one cherry, else a loss. Later rolls only choose which fillers are shown.
const ROLL = { seven: 0.0005, bell: 0.03, cherries: 0.2, oneCherry: 0.5, none: 0.85 }

function mockSpin(outcome) {
  vi.spyOn(Math, 'random').mockReturnValueOnce(ROLL[outcome]).mockReturnValue(0.4)
}

describe('SlotsGame', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows the pay table scaled to the wager', async () => {
    const { user } = setup()
    const table = screen.getByLabelText('Pay table')
    expect(table).toHaveTextContent('+$250') // triple sevens: 5:1 on $50
    expect(table).toHaveTextContent('Wager back')

    await user.click(screen.getByRole('button', { name: 'Raise wager' }))
    expect(table).toHaveTextContent('+$500')
  })

  it('states the win, break-even and lose rates', () => {
    setup()
    expect(screen.getByLabelText('Pay table')).toHaveTextContent('Win 38% · Break even 32% · Lose 30%')
  })

  it('caps the wager at the points the team has', () => {
    setup(() => {}, { team: { ...team, score: 120 } })
    expect(screen.getByRole('slider', { name: 'Wager' })).toHaveAttribute('max', '100')
  })

  it('pays the multiplier for three of a kind once the reels stop', async () => {
    mockSpin('seven')
    const onScore = vi.fn()
    const { user } = setup(onScore)

    await user.click(screen.getByRole('button', { name: 'Spin' }))
    expect(onScore).not.toHaveBeenCalled()
    await finishSpin()
    expect(onScore).toHaveBeenCalledWith(250)
    expect(screen.getByText('Three Sevens!')).toBeInTheDocument()
  })

  it('pays half the wager for two cherries', async () => {
    mockSpin('cherries')
    const onScore = vi.fn()
    const { user } = setup(onScore)
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    await finishSpin()
    expect(onScore).toHaveBeenCalledWith(25)
  })

  it('gives the wager back for one cherry', async () => {
    mockSpin('oneCherry')
    const onScore = vi.fn()
    const { user } = setup(onScore)
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    await finishSpin()
    expect(onScore).toHaveBeenCalledWith(0)
    expect(screen.getByText('One cherry: wager back')).toBeInTheDocument()
  })

  it('loses the wager when nothing matches', async () => {
    mockSpin('none')
    const onScore = vi.fn()
    const { user } = setup(onScore)
    await user.click(screen.getByRole('button', { name: 'Raise wager' }))
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    await finishSpin()
    expect(onScore).toHaveBeenCalledWith(-100)
  })

  it('locks the wager once the reels are spinning', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    expect(screen.queryByRole('slider', { name: 'Wager' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Spin' })).not.toBeInTheDocument()
  })

  it('still applies the result if the popup closes mid-spin', async () => {
    mockSpin('seven')
    const onScore = vi.fn()
    const { user, unmount } = setup(onScore)
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    unmount()
    expect(onScore).toHaveBeenCalledWith(250)
  })
})
