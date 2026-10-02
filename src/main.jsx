import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GameProvider } from './context/GameProvider.jsx'
import { GameMusicProvider } from './hooks/useGameMusic.jsx'
import 'katex/dist/katex.min.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GameProvider>
      <GameMusicProvider>
        <App />
      </GameMusicProvider>
    </GameProvider>
  </StrictMode>,
)
