import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { GameProvider } from '../context/GameProvider.jsx'
import { TeamPanel } from './TeamPanel.jsx'

describe('TeamPanel score buttons', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('adds and subtracts the selected step for one team only', async () => {
    const user = userEvent.setup()
    render(
      <GameProvider>
        <TeamPanel />
      </GameProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Add 100 to Team 1' }))
    await user.click(screen.getByRole('button', { name: '500' }))
    await user.click(screen.getByRole('button', { name: 'Subtract 500 from Team 2' }))

    const scores = [...document.querySelectorAll('.team-score')].map((el) => el.textContent)
    expect(scores).toEqual(['$100', '-$500', '$0', '$0'])
  })
})
