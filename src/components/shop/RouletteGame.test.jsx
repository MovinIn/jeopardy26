import { act, render, screen, within } from '@testing-library/react'
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
    expect(screen.getByRole('group', { name: 'Colors' })).toHaveTextContent('+$50')

    await user.click(screen.getByRole('button', { name: 'Raise wager' }))
    expect(board).toHaveTextContent('+$3,500')
    expect(screen.getByRole('group', { name: 'Ranges of numbers' })).toHaveTextContent('+$200')
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

    await user.click(screen.getByRole('button', { name: 'Red' }))
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    await finishSpin()
    expect(onScore).toHaveBeenCalledWith(50)
  })

  it('loses the wager on a miss', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // lands on 0
    const onScore = vi.fn()
    const { user } = setup(onScore)

    await user.click(screen.getByRole('button', { name: 'Red' }))
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    await finishSpin()
    expect(onScore).toHaveBeenCalledWith(-50)
    expect(screen.getByText(/ball landed on 0/i)).toBeInTheDocument()
  })

  it('lists every bet in the payout reference, grouped', () => {
    setup()
    const colors = screen.getByRole('group', { name: 'Colors' })
    expect(colors).toHaveTextContent('Red')
    expect(colors).toHaveTextContent('Black')
    const ranges = screen.getByRole('group', { name: 'Ranges of numbers' })
    for (const label of ['1–18', '19–36', '1st 12', '2nd 12', '3rd 12', 'Column 1']) {
      expect(ranges).toHaveTextContent(label)
    }
    expect(screen.queryByLabelText('Range from')).not.toBeInTheDocument()
  })

  it('has a clickable tile for every standard table bet', () => {
    setup()
    const table = screen.getByRole('group', { name: 'Betting table' })
    for (const name of [
      'Red',
      'Black',
      'Odd',
      'Even',
      '1–18',
      '19–36',
      '1st 12',
      '2nd 12',
      '3rd 12',
      'Column 1',
      'Column 2',
      'Column 3',
    ]) {
      expect(within(table).getByRole('button', { name })).toBeEnabled()
    }
  })

  it('shows red and black as bare tiles with no number', () => {
    setup()
    const red = screen.getByRole('button', { name: 'Red' })
    const black = screen.getByRole('button', { name: 'Black' })
    expect(red).toHaveTextContent(/^1:1$/)
    expect(black).toHaveTextContent(/^1:1$/)
  })

  it('pays a straight bet on the zero at 35 to 1', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const onScore = vi.fn()
    const { user } = setup(onScore)
    await user.click(screen.getByRole('button', { name: 'Number 0' }))
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

  it('pays a dozen at 2 to 1', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(5.5 / 37) // lands on 5
    const onScore = vi.fn()
    const { user } = setup(onScore)
    await user.click(screen.getByRole('button', { name: '1st 12' }))
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    await finishSpin()
    expect(onScore).toHaveBeenCalledWith(100)
  })

  it('pays even, odd, low and high at even money and loses them on the zero', async () => {
    for (const [tile, roll, expected] of [
      ['Even', 4.5 / 37, 50],
      ['Odd', 7.5 / 37, 50],
      ['1–18', 20.5 / 37, -50],
      ['19–36', 30.5 / 37, 50],
      ['Black', 0, -50],
    ]) {
      vi.spyOn(Math, 'random').mockReturnValue(roll)
      const onScore = vi.fn()
      const { user, unmount } = setup(onScore)
      await user.click(screen.getByRole('button', { name: tile }))
      await user.click(screen.getByRole('button', { name: 'Spin' }))
      await finishSpin()
      expect(onScore, tile).toHaveBeenCalledWith(expected)
      unmount()
      vi.restoreAllMocks()
    }
  })

  it('highlights the numbers a picked zone covers', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: '2nd 12' }))
    expect(screen.getByRole('button', { name: '2nd 12' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Number 13' })).toHaveClass('covered')
    expect(screen.getByRole('button', { name: 'Number 24' })).toHaveClass('covered')
    expect(screen.getByRole('button', { name: 'Number 25' })).not.toHaveClass('covered')
  })

  it('locks the wager and bet once the wheel is spinning', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Number 17' }))
    await user.click(screen.getByRole('button', { name: 'Spin' }))
    expect(screen.getByRole('slider', { name: 'Wager' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Number 18' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Red' })).toBeDisabled()
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
