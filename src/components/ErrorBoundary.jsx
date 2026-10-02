import { Component } from 'react'
import { STORAGE_KEY } from '../context/storageKey.js'

/**
 * Catches a crash anywhere below it and shows a way back, instead of leaving a blank page.
 * "Reload" tries again with the saved game; "Reset saved game" clears it first, for the case where
 * the saved game itself is what keeps crashing the app.
 */
export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('The game crashed:', error, info?.componentStack)
  }

  reload = () => {
    window.location.reload()
  }

  resetAndReload = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // nothing to clear if storage is unavailable
    }
    window.location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) {
      return this.props.children
    }
    return (
      <div className="crash-screen" role="alert">
        <h1 className="crash-title">Something went wrong</h1>
        <p>The game hit a problem. Your scores are saved, so reloading usually puts you straight back.</p>
        <pre className="crash-detail">{String(error?.message ?? error)}</pre>
        <div className="crash-actions">
          <button type="button" onClick={this.reload}>
            Reload
          </button>
          <button type="button" className="secondary" onClick={this.resetAndReload}>
            Reset saved game
          </button>
        </div>
      </div>
    )
  }
}
