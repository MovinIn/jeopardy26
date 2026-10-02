import { ClueModal } from './components/ClueModal.jsx'
import { FinalJeopardy } from './components/FinalJeopardy.jsx'
import { HostControls } from './components/HostControls.jsx'
import { JeopardyBoard } from './components/JeopardyBoard.jsx'
import { TeamPanel } from './components/TeamPanel.jsx'
import { useGame } from './context/GameProvider.jsx'
import './App.css'

function App() {
  const { state, boardLoadError } = useGame()

  return (
    <div className="app-shell">
      <HostControls />
      {boardLoadError && (
        <p className="load-error">
          Edit <code>public/board.json</code>, then refresh. {boardLoadError}
        </p>
      )}
      <main className="main-stage">
        {state.phase === 'board' ? <JeopardyBoard /> : <FinalJeopardy />}
      </main>
      <TeamPanel />
      <ClueModal />
    </div>
  )
}

export default App
