import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App.jsx'
import { GameProvider } from './context/GameProvider.jsx'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows host title and import prompt when no board loaded', () => {
    render(
      <GameProvider>
        <App />
      </GameProvider>,
    )
    expect(screen.getByRole('heading', { level: 1, name: /import a board/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /load sample board/i })).toBeInTheDocument()
  })
})
