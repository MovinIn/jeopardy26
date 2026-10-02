import { createInitialBoard, getCell, markClueResolved } from '../game/board.js'
import { getClueAmounts } from '../game/scoring.js'
import { nextTeamIndex, normalizeTeamIndex } from '../game/turns.js'

let teamIdCounter = 1

export function createTeamId() {
  return `team-${teamIdCounter++}`
}

export const initialGameState = {
  title: '',
  board: null,
  spinnerEvents: [],
  importWarnings: [],
  teams: [],
  activeTeamIndex: 0,
  selectedClue: null,
  activeClueHintUsed: false,
  answerRevealed: false,
  lastSpinResult: null,
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'IMPORT_BOARD': {
      const { boardData } = action
      const board = createInitialBoard(boardData.categories)
      board.title = boardData.title
      return {
        ...state,
        title: boardData.title,
        board,
        spinnerEvents: boardData.spinnerEvents ?? [],
        importWarnings: action.warnings ?? [],
        selectedClue: null,
        activeClueHintUsed: false,
        answerRevealed: false,
        lastSpinResult: null,
      }
    }

    case 'ADD_TEAM': {
      const name = action.name?.trim() || `Team ${state.teams.length + 1}`
      const teams = [
        ...state.teams,
        { id: createTeamId(), name, score: 0 },
      ]
      return {
        ...state,
        teams,
        activeTeamIndex: state.teams.length === 0 ? 0 : state.activeTeamIndex,
      }
    }

    case 'REMOVE_TEAM': {
      const teams = state.teams.filter((t) => t.id !== action.teamId)
      const activeTeamIndex = normalizeTeamIndex(teams.length, state.activeTeamIndex)
      return { ...state, teams, activeTeamIndex }
    }

    case 'RENAME_TEAM': {
      const teams = state.teams.map((t) =>
        t.id === action.teamId ? { ...t, name: action.name.trim() || t.name } : t,
      )
      return { ...state, teams }
    }

    case 'SET_ACTIVE_TEAM': {
      return {
        ...state,
        activeTeamIndex: normalizeTeamIndex(state.teams.length, action.index),
      }
    }

    case 'NEXT_TEAM': {
      return {
        ...state,
        activeTeamIndex: nextTeamIndex(state.teams.length, state.activeTeamIndex),
      }
    }

    case 'SELECT_CLUE': {
      if (!state.board || state.teams.length === 0) {
        return state
      }
      const cell = getCell(state.board, action.categoryIndex, action.rowIndex)
      if (!cell || cell.resolved) {
        return state
      }
      return {
        ...state,
        selectedClue: {
          categoryIndex: action.categoryIndex,
          rowIndex: action.rowIndex,
        },
        activeClueHintUsed: false,
        answerRevealed: false,
      }
    }

    case 'CLOSE_CLUE': {
      return {
        ...state,
        selectedClue: null,
        activeClueHintUsed: false,
        answerRevealed: false,
      }
    }

    case 'REQUEST_HINT': {
      if (!state.selectedClue || state.activeClueHintUsed) {
        return state
      }
      const cell = getCell(
        state.board,
        state.selectedClue.categoryIndex,
        state.selectedClue.rowIndex,
      )
      if (!cell?.hint) {
        return state
      }
      return { ...state, activeClueHintUsed: true }
    }

    case 'REVEAL_ANSWER': {
      return { ...state, answerRevealed: true }
    }

    case 'RESOLVE_CLUE': {
      if (!state.selectedClue || !state.board || state.teams.length === 0) {
        return state
      }
      const { categoryIndex, rowIndex } = state.selectedClue
      const cell = getCell(state.board, categoryIndex, rowIndex)
      if (!cell) {
        return state
      }

      const { win, loss } = getClueAmounts(cell.value, state.activeClueHintUsed)
      const delta = action.correct ? win : -loss
      const activeIndex = state.activeTeamIndex

      const teams = state.teams.map((team, i) =>
        i === activeIndex ? { ...team, score: team.score + delta } : team,
      )

      const board = markClueResolved(
        state.board,
        categoryIndex,
        rowIndex,
        action.correct ? 'correct' : 'incorrect',
      )

      return {
        ...state,
        teams,
        board,
        selectedClue: null,
        activeClueHintUsed: false,
        answerRevealed: false,
        activeTeamIndex: nextTeamIndex(teams.length, activeIndex),
      }
    }

    case 'RESET_GAME': {
      if (!state.board) {
        return { ...state, lastSpinResult: null }
      }
      const categories = state.board.categories.map((cat, ci) => ({
        name: cat.name,
        clues: state.board.cells
          .filter((c) => c.categoryIndex === ci)
          .sort((a, b) => a.rowIndex - b.rowIndex)
          .map((c) => ({
            value: c.value,
            clue: c.clue,
            answer: c.answer,
            hint: c.hint ?? undefined,
          })),
      }))
      const board = createInitialBoard(categories)
      board.title = state.board.title
      const teams = state.teams.map((t) => ({ ...t, score: 0 }))
      return {
        ...state,
        board,
        teams,
        activeTeamIndex: normalizeTeamIndex(teams.length, 0),
        selectedClue: null,
        activeClueHintUsed: false,
        answerRevealed: false,
        lastSpinResult: null,
      }
    }

    case 'SPIN': {
      if (!state.spinnerEvents.length) {
        return state
      }
      const index = Math.floor(Math.random() * state.spinnerEvents.length)
      return {
        ...state,
        lastSpinResult: {
          index,
          label: state.spinnerEvents[index],
        },
      }
    }

    case 'CLEAR_SPIN': {
      return { ...state, lastSpinResult: null }
    }

    case 'HYDRATE': {
      return { ...initialGameState, ...action.state }
    }

    default:
      return state
  }
}
