import { useRef, useState } from 'react'
import { validateBoardJson } from '../game/validateBoard.js'
import { useGame } from '../context/GameProvider.jsx'

export function JsonImport() {
  const { dispatch } = useGame()
  const fileRef = useRef(null)
  const [errors, setErrors] = useState([])
  const [warnings, setWarnings] = useState([])
  const [pasteValue, setPasteValue] = useState('')

  function applyBoard(data) {
    const result = validateBoardJson(data)
    if (!result.ok) {
      setErrors(result.errors)
      setWarnings(result.warnings)
      return
    }
    setErrors([])
    setWarnings(result.warnings)
    dispatch({
      type: 'IMPORT_BOARD',
      boardData: result.data,
      warnings: result.warnings,
    })
  }

  async function loadSample() {
    const res = await fetch('/sample-board.json')
    const data = await res.json()
    applyBoard(data)
  }

  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        applyBoard(JSON.parse(String(reader.result)))
      } catch {
        setErrors(['Invalid JSON file.'])
        setWarnings([])
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function onPasteImport() {
    try {
      applyBoard(JSON.parse(pasteValue))
    } catch {
      setErrors(['Invalid JSON in paste box.'])
      setWarnings([])
    }
  }

  return (
    <div className="panel import-panel">
      <h2>Board</h2>
      <div className="import-actions">
        <button type="button" onClick={() => fileRef.current?.click()}>
          Import JSON file
        </button>
        <button type="button" className="secondary" onClick={loadSample}>
          Load sample board
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onFileChange} />
      </div>
      <label className="paste-label">
        Or paste JSON
        <textarea
          value={pasteValue}
          onChange={(e) => setPasteValue(e.target.value)}
          rows={4}
          placeholder='{"title":"...","categories":[...]}'
        />
      </label>
      <button type="button" className="secondary" onClick={onPasteImport} disabled={!pasteValue.trim()}>
        Import pasted JSON
      </button>
      {warnings.length > 0 && (
        <ul className="message-list warnings">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      {errors.length > 0 && (
        <ul className="message-list errors">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
