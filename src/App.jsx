import { ClueModal } from './components/ClueModal.jsx'
import { FunSpinner } from './components/FunSpinner.jsx'
import { HostControls } from './components/HostControls.jsx'
import { JeopardyBoard } from './components/JeopardyBoard.jsx'
import { JsonImport } from './components/JsonImport.jsx'
import { TeamPanel } from './components/TeamPanel.jsx'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <HostControls />
      <div className="layout">
        <aside className="sidebar">
          <JsonImport />
          <TeamPanel />
          <FunSpinner />
        </aside>
        <main className="main-stage">
          <JeopardyBoard />
        </main>
      </div>
      <ClueModal />
    </div>
  )
}

export default App
