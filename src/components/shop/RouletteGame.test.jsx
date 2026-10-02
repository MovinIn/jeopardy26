import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RouletteGame } from './RouletteGame.jsx'

const team = { id: 'team-1', name: 'Team 1', score: 1000 }
const item = { id: 'roulette', minWager: 50, maxWager: 200, step: 50 }

function setup(onScore = () => {}) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  const view = render(<RouletteGame team={team} item={item} onScore={onScore} onExit={() => {}} />)
  return { user, ...view }
}

async function finishSpin() {
  await act(async () => {
    vi.advanceTimersByTime(9000)
  })
}

describe('RouletteGame', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('needs a bet before the wheel can spin', async () => {
    const { user } = setup()
    expect(screen.getByRole('button', { name: 'Spin' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Number 17' }))
    expect(screen.getByRole('button', { name: 'Spin' })).toBeEnabled()
  })

  it('shows what every zone pays at the chosen wager', async () => {
    const { user } = setup()
    const board = screen.getByLabelText('Payouts for every zone')
    expect(board).toHaveTextContent('+$1,750') // single number: 35:1 on $50
    expect(board).toHaveTextContent('+$100') // dozen: 2:1 on $50
    expect(screen.getByRole('button', { name: /^Red/ })).toHaveTextContent('+$50')

    await user.click(screen.getByRole('button', { name: 'Raise wager' }))
    expect(board).toHaveTextContent('+$3,500')
    expect(screen.getByRole('button', { name: /^1st 12/ })).toHaveTextContent('+$200')
  })

  it('pays the single-number profit when the ball lands on it', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(17.5 / 37)
    const onScore = vi.fn()
    const { user } = setup(onScore)

    await user.click(screen.getByRole('button', { name: 'Number 17' }))
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    expect(onScore).not.toHaveBeenCalled()

    await finishSpin()
    expect(onScore).toHaveBeenCalledWith(1750)
    expect(screen.getByText('Number 17 hits!')).toBeInTheDocument()
  })

  it('scales the payout with the wager', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(17.5 / 37)
    const onScore = vi.fn()
    const { user } = setup(onScore)

    await user.click(screen.getByRole('button', { name: 'Raise wager' }))
    await user.click(screen.getByRole('button', { name: 'Raise wager' }))
    await user.click(screen.getByRole('button', { name: 'Number 17' }))
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    await finishSpin()
    expect(onScore).toHaveBeenCalledWith(5250)
  })

  it('pays an outside bet at even money', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(32.5 / 37) // lands on 32 (red)
    const onScore = vi.fn()
    const { user } = setup(onScore)

    await user.click(screen.getByRole('button', { name: /^Red/ }))
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    await finishSpin()
    expect(onScore).toHaveBeenCalledWith(50)
  })

  it('loses the wager on a miss', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // lands on 0
    const onScore = vi.fn()
    const { user } = setup(onScore)

    await user.click(screen.getByRole('button', { name: /^Red/ }))
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    await finishSpin()
    expect(onScore).toHaveBeenCalledWith(-50)
    expect(screen.getByText(/ball landed on 0/i)).toBeInTheDocument()
  })

  it('groups the bets into colors, odd or even, and ranges', () => {
    setup()
    const colors = screen.getByRole('group', { name: 'Colors' })
    expect(colors).toHaveTextContent('Red')
    expect(colors).toHaveTextContent('Black')
    expect(colors).toHaveTextContent('Green (0)')
    const ranges = screen.getByRole('group', { name: 'Ranges of numbers' })
    for (const label of ['1–18', '19–36', '1st 12', '2nd 12', '3rd 12', 'Column 1']) {
      expect(ranges).toHaveTextContent(label)
    }
  })

  it('pays the green zero at 35 to 1', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const onScore = vi.fn()
    const { user } = setup(onScore)
    await user.click(screen.getByRole('button', { name: /^Green/ }))
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    await finishSpin()
    expect(onScore).toHaveBeenCalledWith(1750)
  })

  it('pays a column at 2 to 1', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(2.5 / 37) // lands on 2, which is in column 2
    const onScore = vi.fn()
    const { user } = setup(onScore)
    await user.click(screen.getByRole('button', { name: /^Column 2/ }))
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    await finishSpin()
    expect(onScore).toHaveBeenCalledWith(100)
  })

  it('lets the team bet on their own range of numbers', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(9.5 / 37) // lands on 9
    const onScore = vi.fn()
    const { user } = setup(onScore)

    // 7 to 12 is six numbers: 5 to 1, so $50 wins $250.
    const custom = screen.getByRole('group', { name: 'Custom range' })
    expect(custom).toHaveTextContent('5:1')
    expect(custom).toHaveTextContent('+$250')

    await user.click(screen.getByRole('button', { name: 'Bet range' }))
    expect(screen.getByText(/betting \$50 on/i)).toHaveTextContent('7–12')
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    await finishSpin()
    expect(onScore).toHaveBeenCalledWith(250)
  })

  it('updates the custom range payout as the range changes', async () => {
    const { user } = setup()
    const to = screen.getByLabelText('Range to')
    await user.clear(to)
    await user.type(to, '8') // 7 to 8: two numbers, 17 to 1
    const custom = screen.getByRole('group', { name: 'Custom range' })
    expect(custom).toHaveTextContent('17:1')
    expect(custom).toHaveTextContent('+$850')
  })

  it('rejects ranges that are too big, too small or out of bounds', async () => {
    const { user } = setup()
    const to = screen.getByLabelText('Range to')
    await user.clear(to)
    await user.type(to, '30') // 7 to 30 is 24 numbers
    expect(screen.getByRole('button', { name: 'Bet range' })).toBeDisabled()
    expect(screen.getByText(/pick 2 to 18 numbers between 1 and 36/i)).toBeInTheDocument()

    await user.clear(to)
    await user.type(to, '7') // a single number is a straight bet instead
    expect(screen.getByRole('button', { name: 'Bet range' })).toBeDisabled()
  })

  it('locks the wager and bet once the wheel is spinning', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Number 17' }))
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    expect(screen.getByRole('slider', { name: 'Wager' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Number 18' })).toBeDisabled()
  })

  it('still applies the result if the popup closes mid-spin', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(17.5 / 37)
    const onScore = vi.fn()
    const { user, unmount } = setup(onScore)

    await user.click(screen.getByRole('button', { name: 'Number 17' }))
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    unmount()
    expect(onScore).toHaveBeenCalledWith(1750)
  })
})
