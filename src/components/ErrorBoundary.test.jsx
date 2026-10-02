import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY } from '../context/storageKey.js'
import { ErrorBoundary } from './ErrorBoundary.jsx'

function Boom({ explode = true }) {
  if (explode) {
    throw new Error('kaboom in the clue screen')
  }
  return <p>all fine</p>
}

describe('ErrorBoundary', () => {
  let reload

  beforeEach(() => {
    localStorage.clear()
    reload = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload })
    // React logs the crash it is about to catch; keep the test output readable.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows its children when nothing is wrong', () => {
    render(
      <ErrorBoundary>
        <Boom explode={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('all fine')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a way back, with what went wrong, instead of a blank page', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Something went wrong')
    expect(alert).toHaveTextContent('kaboom in the clue screen')
    expect(alert).toHaveTextContent('Your scores are saved')
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset saved game' })).toBeInTheDocument()
  })

  it('reloads with the saved game kept', () => {
    localStorage.setItem(STORAGE_KEY, '{"teams":[]}')
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(reload).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{"teams":[]}')
  })

  it('can clear a saved game that keeps crashing, then reload', () => {
    localStorage.setItem(STORAGE_KEY, '{"teams":[]}')
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Reset saved game' }))
    expect(localStorage.getItem(STORAGE_KEY)).toBe(null)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('still reloads if storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Reset saved game' }))
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
