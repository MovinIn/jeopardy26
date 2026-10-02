import { useState } from 'react'
import { ClueModal } from './components/ClueModal.jsx'
import { FinalJeopardy } from './components/FinalJeopardy.jsx'
import { HostControls } from './components/HostControls.jsx'
import { JeopardyBoard } from './components/JeopardyBoard.jsx'
import { JsonImport } from './components/JsonImport.jsx'
import { TeamPanel } from './components/TeamPanel.jsx'
import { useGame } from './context/GameProvider.jsx'
import './App.css'

function App() {
  const { state } = useGame()
  const [setupOpen, setSetupOpen] = useState(false)
  const showSetup = setupOpen || !state.board

  return (
    <div className="app-shell">
      <HostControls setupOpen={showSetup} onToggleSetup={() => setSetupOpen((open) => !open)} />
      {showSetup && (
        <div className="setup-drawer">
          <JsonImport />
        </div>
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
