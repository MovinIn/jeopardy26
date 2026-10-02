import {
  allCluesResolved,
  assignDailyDoubles,
  createInitialBoard,
  getCell,
  highestClueValue,
  markClueResolved,
} from '../game/board.js'
import { canPlayFinal, clampDailyDoubleWager, clampFinalWager } from '../game/scoring.js'
import { createDefaultTeams } from '../game/teams.js'
import { computeBankedTokens } from '../game/bonusRound.js'
import { lowestScoreIndex, nextTeamIndex, normalizeTeamIndex } from '../game/turns.js'

let teamIdCounter = 5

export function createTeamId() {
  return `team-${teamIdCounter++}`
}

export const initialGameState = {
  title: '',
  // { jeopardy, doubleJeopardy | null, finalJeopardy | null } — pristine data used for resets
  source: null,
  board: null,
  round: null, // 'jeopardy' | 'double'
  phase: 'board', // 'board' | 'final-wager' | 'final-clue' | 'over'
  importWarnings: [],
  teams: createDefaultTeams(),
  activeTeamIndex: 0, // the team in control of the board
  // { categoryIndex, rowIndex, stage: 'wager' | 'clue', wager, lockedOut: [teamId], revealed }
  selectedClue: null,
  finalWagers: {},
  finalResults: {},
  finalRevealed: false,
  spinnerEvents: [],
  slotPowerups: [],
  diceFaces: [],
}

function buildBoard(categories, title) {
  const board = createInitialBoard(categories)
  board.title = title
  return board
}

function startGame(state, source) {
  const spinnerEvents = source.spinnerEvents ?? state.spinnerEvents ?? []
  const slotPowerups = source.slotPowerups ?? state.slotPowerups ?? []
  const diceFaces = source.diceFaces ?? state.diceFaces ?? []
  return {
    ...state,
    source: { ...source, spinnerEvents, slotPowerups, diceFaces },
    board: buildBoard(source.jeopardy, state.title),
    round: 'jeopardy',
    phase: 'board',
    teams: state.teams.map((t) => ({
      ...t,
      score: 0,
      bonusTokens: 0,
      powerups: [],
    })),
    activeTeamIndex: normalizeTeamIndex(state.teams.length, 0),
    selectedClue: null,
    finalWagers: {},
    finalResults: {},
    finalRevealed: false,
    spinnerEvents,
    slotPowerups,
    diceFaces,
  }
}

export function finalists(teams) {
  return teams.filter((t) => canPlayFinal(t.score))
}

function resolveSelected(state, result, teams, activeTeamIndex) {
  const { categoryIndex, rowIndex } = state.selectedClue
  return {
    ...state,
    teams,
    board: markClueResolved(state.board, categoryIndex, rowIndex, result),
    selectedClue: null,
    activeTeamIndex,
  }
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'IMPORT_BOARD':
    case 'INIT_FROM_FILE': {
      const { boardData } = action
      const spinnerEvents = boardData.spinnerEvents ?? []
      const slotPowerups = boardData.slotPowerups ?? []
      const diceFaces = boardData.diceFaces ?? []
      const source = {
        jeopardy: assignDailyDoubles(boardData.categories, 1),
        doubleJeopardy: boardData.doubleJeopardy
          ? assignDailyDoubles(boardData.doubleJeopardy, 2)
          : null,
        finalJeopardy: boardData.finalJeopardy ?? null,
        spinnerEvents,
        slotPowerups,
        diceFaces,
      }
      const teams =
        state.teams.length > 0 ? state.teams : createDefaultTeams()
      return {
        ...startGame(
          {
            ...state,
            title: boardData.title,
            importWarnings: action.warnings ?? [],
            teams,
          },
          source,
        ),
        spinnerEvents,
        slotPowerups,
        diceFaces,
      }
    }

    case 'COMMIT_BONUS_ROUND': {
      if (state.teams.length === 0) {
        return state
      }
      const idx = normalizeTeamIndex(state.teams.length, state.activeTeamIndex)
      const banked = computeBankedTokens(action.baseTokens, action.multiplier)
      const powerup = action.powerup
      const teams = state.teams.map((t, i) => {
        if (i !== idx) {
          return t
        }
        const powerups = powerup?.label
          ? [...(t.powerups ?? []), { id: powerup.id ?? powerup.label, label: powerup.label }]
          : (t.powerups ?? [])
        return {
          ...t,
          bonusTokens: (t.bonusTokens ?? 0) + banked,
          powerups,
        }
      })
      return { ...state, teams }
    }

    case 'ADJUST_SCORE': {
      return {
        ...state,
        teams: state.teams.map((t) =>
          t.id === action.teamId ? { ...t, score: t.score + action.delta } : t,
        ),
      }
    }

    case 'SET_SPINNER_EVENTS': {
      return {
        ...state,
        spinnerEvents: action.events ?? [],
        source: state.source
          ? { ...state.source, spinnerEvents: action.events ?? [] }
          : state.source,
      }
    }

    case 'ADD_TEAM': {
      const name = action.name?.trim() || `Team ${state.teams.length + 1}`
      const teams = [
        ...state.teams,
        { id: createTeamId(), name, score: 0, bonusTokens: 0, powerups: [] },
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

    // Host override: hand the board to another team.
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
      if (!state.board || state.phase !== 'board' || state.selectedClue) {
        return state
      }
      if (state.teams.length === 0) {
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
          stage: cell.dailyDouble ? 'wager' : 'clue',
          wager: null,
          lockedOut: [],
          revealed: false,
        },
      }
    }

    // Backing out is only fair before anyone has been penalised.
    case 'CLOSE_CLUE': {
      const sel = state.selectedClue
      if (!sel || sel.lockedOut.length > 0 || sel.wager !== null) {
        return state
      }
      return { ...state, selectedClue: null }
    }

    case 'SET_WAGER': {
      const sel = state.selectedClue
      if (!sel || sel.stage !== 'wager') {
        return state
      }
      const team = state.teams[state.activeTeamIndex]
      const wager = clampDailyDoubleWager(action.amount, team.score, highestClueValue(state.board))
      return { ...state, selectedClue: { ...sel, stage: 'clue', wager } }
    }

    case 'REVEAL_ANSWER': {
      if (!state.selectedClue) {
        return state
      }
      return { ...state, selectedClue: { ...state.selectedClue, revealed: true } }
    }

    // Host judges one team's response. Regular clues stay open after a miss so others can try.
    case 'ANSWER_CLUE': {
      const sel = state.selectedClue
      if (!sel || sel.stage !== 'clue') {
        return state
      }
      const isDailyDouble = sel.wager !== null
      const teamIndex = state.teams.findIndex((t) => t.id === action.teamId)
      if (teamIndex === -1 || sel.lockedOut.includes(action.teamId)) {
        return state
      }
      if (isDailyDouble && teamIndex !== state.activeTeamIndex) {
        return state
      }
      const cell = getCell(state.board, sel.categoryIndex, sel.rowIndex)
      const amount = isDailyDouble ? sel.wager : cell.value
      const delta = action.correct ? amount : -amount
      const teams = state.teams.map((t, i) =>
        i === teamIndex ? { ...t, score: t.score + delta } : t,
      )

      if (action.correct) {
        return resolveSelected(state, 'correct', teams, teamIndex)
      }
      if (isDailyDouble) {
        return resolveSelected(state, 'incorrect', teams, state.activeTeamIndex)
      }
      const lockedOut = [...sel.lockedOut, action.teamId]
      if (lockedOut.length >= teams.length) {
        return resolveSelected(state, 'none', teams, state.activeTeamIndex)
      }
      return { ...state, teams, selectedClue: { ...sel, lockedOut } }
    }

    // Nobody got it (or time ran out): reveal and move on, control unchanged.
    case 'PASS_CLUE': {
      const sel = state.selectedClue
      if (!sel || sel.stage !== 'clue' || sel.wager !== null) {
        return state
      }
      return resolveSelected(state, 'none', state.teams, state.activeTeamIndex)
    }

    case 'ADVANCE_ROUND': {
      if (state.phase !== 'board' || state.selectedClue || !allCluesResolved(state.board)) {
        return state
      }
      if (state.round === 'jeopardy' && state.source?.doubleJeopardy) {
        return {
          ...state,
          round: 'double',
          board: buildBoard(state.source.doubleJeopardy, state.title),
          // The team in last place chooses first.
          activeTeamIndex: lowestScoreIndex(state.teams),
        }
      }
      if (state.source?.finalJeopardy && finalists(state.teams).length > 0) {
        return { ...state, phase: 'final-wager', finalWagers: {}, finalResults: {} }
      }
      return { ...state, phase: 'over' }
    }

    case 'SET_FINAL_WAGER': {
      if (state.phase !== 'final-wager') {
        return state
      }
      const team = state.teams.find((t) => t.id === action.teamId)
      if (!team || !canPlayFinal(team.score)) {
        return state
      }
      return {
        ...state,
        finalWagers: {
          ...state.finalWagers,
          [team.id]: clampFinalWager(action.amount, team.score),
        },
      }
    }

    case 'START_FINAL_CLUE': {
      if (state.phase !== 'final-wager') {
        return state
      }
      return { ...state, phase: 'final-clue', finalRevealed: false }
    }

    case 'REVEAL_FINAL': {
      if (state.phase !== 'final-clue') {
        return state
      }
      return { ...state, finalRevealed: true }
    }

    case 'JUDGE_FINAL': {
      if (state.phase !== 'final-clue' || !state.finalRevealed) {
        return state
      }
      const team = state.teams.find((t) => t.id === action.teamId)
      if (!team || !canPlayFinal(team.score) || team.id in state.finalResults) {
        return state
      }
      const wager = state.finalWagers[team.id] ?? 0
      const delta = action.correct ? wager : -wager
      const teams = state.teams.map((t) =>
        t.id === team.id ? { ...t, score: t.score + delta } : t,
      )
      const finalResults = { ...state.finalResults, [team.id]: action.correct }
      const judgedAll = state.teams
        .filter((t) => t.id in finalResults || canPlayFinal(t.score))
        .every((t) => t.id in finalResults)
      return { ...state, teams, finalResults, phase: judgedAll ? 'over' : state.phase }
    }

    case 'RESET_GAME': {
      if (!state.source) {
        return state
      }
      return startGame(state, state.source)
    }

    case 'HYDRATE': {
      return { ...initialGameState, ...action.state }
    }

    default:
      return state
  }
}
