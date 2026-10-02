import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App.jsx'
import { GameProvider } from './context/GameProvider.jsx'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows four default teams on startup', () => {
    render(
      <GameProvider>
        <App />
      </GameProvider>,
    )
    expect(screen.getByRole('textbox', { name: /name for team 1/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /name for team 4/i })).toBeInTheDocument()
  })
})
