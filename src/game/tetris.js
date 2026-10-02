/**
 * Tetris. Seven pieces fall one at a time into a 10 x 20 well; fill a whole row to clear it.
 * Clear LINES_TO_WIN lines to win; if a new piece has no room to appear, the stack has topped out
 * and the game is lost.
 *
 * So nobody can stall forever, the well shrinks: every SHRINK_EVERY_MS the ceiling drops one row,
 * and a solid wall fills the row it passes. The wall never clears. If the ceiling comes down on
 * the stack, or on a piece with nowhere to go, the game is lost.
 *
 * Pieces come from a shuffled "bag" of all seven, so you never wait long for any one of them.
 */

export const COLS = 10
export const ROWS = 20
export const LINES_TO_WIN = 5

/** How often the ceiling comes down a row, in milliseconds. */
export const SHRINK_EVERY_MS = 15000

/** What a wall cell is stored as on the board. */
export const WALL = 'W'

const SHAPES = {
  I: { size: 4, cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  O: { size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  T: { size: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
}

export const PIECE_TYPES = Object.keys(SHAPES)

export const PIECE_COLORS = {
  I: '#00d8e8',
  O: '#f0d800',
  T: '#a63fe0',
  S: '#2ed851',
  Z: '#e8393a',
  J: '#3a5be8',
  L: '#f09a1e',
}

// A quarter turn clockwise inside the piece's own square.
const turnCells = (cells, size) => cells.map(([x, y]) => [size - 1 - y, x])

/** The four rotations of every piece, as cell offsets from the piece's top-left corner. */
const ROTATIONS = Object.fromEntries(
  PIECE_TYPES.map((type) => {
    const { size, cells } = SHAPES[type]
    const states = [cells]
    for (let i = 1; i < 4; i++) {
      states.push(turnCells(states[i - 1], size))
    }
    return [type, states]
  }),
)

export function pieceCells(type, rot = 0) {
  return ROTATIONS[type][((rot % 4) + 4) % 4]
}

/** The board cells a piece covers right now. */
export function cellsOf(piece) {
  return pieceCells(piece.type, piece.rot).map(([x, y]) => [piece.x + x, piece.y + y])
}

export function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

/** True if the piece is out of bounds or overlaps something already stacked (or the wall). */
export function collides(board, piece) {
  return cellsOf(piece).some(([x, y]) => {
    if (x < 0 || x >= COLS || y >= ROWS) {
      return true
    }
    return y >= 0 && board[y][x] !== null
  })
}

function shuffled(items, rng) {
  const list = [...items]
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

/** Takes the next piece type from the bag, refilling it with a fresh shuffle when empty. */
function draw(bag, rng) {
  const pool = bag.length > 0 ? bag : shuffled(PIECE_TYPES, rng)
  return [pool[0], pool.slice(1)]
}

/** A new piece at the top of the well, just under the ceiling. */
function spawn(type, ceiling = 0) {
  return { type, rot: 0, x: Math.floor((COLS - SHAPES[type].size) / 2), y: ceiling }
}

/**
 * status: 'ready' (waiting for the first key) | 'playing' | 'won' | 'lost'
 * `next` is the piece type that will drop after the current one. `ceiling` is how many rows at the
 * top have been walled off so far. `reason` for a loss is 'topout' or 'squeezed'.
 */
export function createGame(rng = Math.random) {
  const [first, afterFirst] = draw([], rng)
  const [next, bag] = draw(afterFirst, rng)
  return {
    board: emptyBoard(),
    piece: spawn(first),
    next,
    bag,
    lines: 0,
    ceiling: 0,
    status: 'ready',
    reason: null,
  }
}

/** The first key press starts the game. */
export function start(game) {
  return game.status === 'ready' ? { ...game, status: 'playing' } : game
}

/** Milliseconds between gravity ticks; the game speeds up with every line cleared. */
export function gravityMs(lines) {
  return Math.max(200, 650 - lines * 80)
}

const isPlaying = (game) => game.status === 'playing'

export function moveSideways(game, dx) {
  if (!isPlaying(game)) {
    return game
  }
  const moved = { ...game.piece, x: game.piece.x + dx }
  return collides(game.board, moved) ? game : { ...game, piece: moved }
}

// Tried in order when a turn would hit a wall or the stack, so rotating beside them still works.
const KICKS = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [-2, 0],
  [2, 0],
  [-3, 0], // only the long I piece ever needs this far
  [3, 0],
  [0, -1],
]

/** Turn the piece, nudging it sideways or up if it doesn't fit where it is. dir: 1 or -1. */
export function rotate(game, dir = 1) {
  if (!isPlaying(game) || game.piece.type === 'O') {
    return game
  }
  const rot = (game.piece.rot + dir + 4) % 4
  for (const [kx, ky] of KICKS) {
    const turned = { ...game.piece, rot, x: game.piece.x + kx, y: game.piece.y + ky }
    if (!collides(game.board, turned)) {
      return { ...game, piece: turned }
    }
  }
  return game
}

/** Fixes the piece in place, clears any full rows, and brings in the next piece. */
function lockPiece(game, rng) {
  const board = game.board.map((row) => [...row])
  for (const [x, y] of cellsOf(game.piece)) {
    if (y >= 0) {
      board[y][x] = game.piece.type
    }
  }

  // Only the rows below the ceiling can clear; the wall above them stays put.
  const wall = board.slice(0, game.ceiling)
  const well = board.slice(game.ceiling)
  const kept = well.filter((row) => row.some((cell) => cell === null))
  const cleared = well.length - kept.length
  const settled = [
    ...wall,
    ...Array.from({ length: cleared }, () => Array(COLS).fill(null)),
    ...kept,
  ]
  const lines = game.lines + cleared

  if (lines >= LINES_TO_WIN) {
    return { ...game, board: settled, piece: null, lines, status: 'won', reason: null }
  }

  const piece = spawn(game.next, game.ceiling)
  const [next, bag] = draw(game.bag, rng)
  if (collides(settled, piece)) {
    return { ...game, board: settled, piece, next, bag, lines, status: 'lost', reason: 'topout' }
  }
  return { ...game, board: settled, piece, next, bag, lines }
}

/** One step of gravity, or a soft drop: down a row, locking the piece if it has landed. */
export function tick(game, rng = Math.random) {
  if (!isPlaying(game)) {
    return game
  }
  const lower = { ...game.piece, y: game.piece.y + 1 }
  if (collides(game.board, lower)) {
    return lockPiece(game, rng)
  }
  return { ...game, piece: lower }
}

/**
 * The ceiling comes down one row and the row it passes turns to solid wall. The falling piece is
 * pushed down a row if the wall would overlap it. It is lost if the stack already reaches that row
 * (the ceiling crushes it) or the piece has nowhere to be pushed.
 */
export function shrinkCeiling(game) {
  if (!isPlaying(game) || game.ceiling >= ROWS) {
    return game
  }
  const row = game.ceiling
  if (game.board[row].some((cell) => cell !== null)) {
    return { ...game, status: 'lost', reason: 'squeezed' }
  }

  const board = game.board.map((cells, y) => (y === row ? Array(COLS).fill(WALL) : cells))
  const shrunk = { ...game, board, ceiling: row + 1 }
  if (!collides(board, game.piece)) {
    return shrunk
  }
  const pushed = { ...game.piece, y: game.piece.y + 1 }
  if (collides(board, pushed)) {
    return { ...shrunk, status: 'lost', reason: 'squeezed' }
  }
  return { ...shrunk, piece: pushed }
}

/** Where the piece would land if dropped straight down (the "ghost"). */
export function landingPiece(game) {
  let piece = game.piece
  while (!collides(game.board, { ...piece, y: piece.y + 1 })) {
    piece = { ...piece, y: piece.y + 1 }
  }
  return piece
}

/** Drop the piece all the way and lock it at once. */
export function hardDrop(game, rng = Math.random) {
  if (!isPlaying(game)) {
    return game
  }
  return lockPiece({ ...game, piece: landingPiece(game) }, rng)
}
