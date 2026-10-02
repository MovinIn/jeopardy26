import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SpellingChaosClue } from './SpellingChaosClue.jsx'

describe('SpellingChaosClue MCQ', () => {
  it('renders MCQ options 5 through 8 when reduced motion shows Ezekiel', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
    render(<SpellingChaosClue word="Ezekiel" />)
    expect(screen.getByRole('group', { name: /letter count choices/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '6' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '7' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '8' })).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('highlights MCQ option when host clicks a choice', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
    const user = userEvent.setup()
    render(<SpellingChaosClue word="Ezekiel" />)
    const seven = screen.getByRole('button', { name: '7' })
    await user.click(seven)
    expect(seven).toHaveAttribute('aria-pressed', 'true')
    vi.unstubAllGlobals()
  })
})
