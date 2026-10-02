import { describe, expect, it } from 'vitest'
import {
  COLS,
  LINES_TO_WIN,
  PIECE_TYPES,
  ROWS,
  SHRINK_EVERY_MS,
  WALL,
  cellsOf,
  collides,
  createGame,
  emptyBoard,
  gravityMs,
  hardDrop,
  landingPiece,
  moveSideways,
  pieceCells,
  rotate,
  shrinkCeiling,
  start,
  tick,
} from './tetris.js'

/** A game being played with a chosen piece, board and queue. */
function playing({ piece = { type: 'T', rot: 0, x: 3, y: 0 }, board = emptyBoard(), ...rest } = {}) {
  return { ...createGame(() => 0.3), status: 'playing', piece, board, next: 'O', bag: ['I'], ...rest }
}

/** A row that is full except for the given columns. */
function rowWithGaps(...gaps) {
  return Array.from({ length: COLS }, (_, x) => (gaps.includes(x) ? null : 'Z'))
}

describe('pieces', () => {
  it('have four cells in every rotation', () => {
    for (const type of PIECE_TYPES) {
      for (let rot = 0; rot < 4; rot++) {
        expect(pieceCells(type, rot)).toHaveLength(4)
      }
    }
  })

  it('come back to where they started after four turns', () => {
    for (const type of PIECE_TYPES) {
      expect(pieceCells(type, 4)).toEqual(pieceCells(type, 0))
    }
  })

  it('turn into different shapes for every piece except the square', () => {
    const sorted = (cells) => JSON.stringify([...cells].sort())
    for (const type of PIECE_TYPES.filter((t) => t !== 'O')) {
      expect(sorted(pieceCells(type, 1))).not.toBe(sorted(pieceCells(type, 0)))
    }
  })

  it('give the I piece a flat and an upright shape', () => {
    expect(new Set(pieceCells('I', 0).map(([, y]) => y)).size).toBe(1)
    expect(new Set(pieceCells('I', 1).map(([x]) => x)).size).toBe(1)
  })
})

describe('createGame', () => {
  it('starts waiting for the first key, with a piece in the top middle and a next piece', () => {
    const game = createGame()
    expect(game).toMatchObject({ status: 'ready', lines: 0 })
    expect(game.board).toHaveLength(ROWS)
    expect(game.board.every((row) => row.length === COLS && row.every((c) => c === null))).toBe(true)
    expect(PIECE_TYPES).toContain(game.piece.type)
    expect(PIECE_TYPES).toContain(game.next)
    expect(Math.min(...cellsOf(game.piece).map(([x]) => x))).toBeGreaterThanOrEqual(2)
    expect(Math.max(...cellsOf(game.piece).map(([x]) => x))).toBeLessThanOrEqual(7)
  })

  it('does nothing until it is started', () => {
    const game = createGame()
    expect(tick(game)).toBe(game)
    expect(moveSideways(game, 1)).toBe(game)
    expect(rotate(game)).toBe(game)
    expect(hardDrop(game)).toBe(game)
    expect(start(game).status).toBe('playing')
  })

  it('deals every piece once before repeating any (a shuffled bag)', () => {
    // Play through 14 pieces by hard-dropping on a board that is cleared each time.
    let game = start(createGame(Math.random))
    const seen = [game.piece.type, game.next]
    for (let i = 0; i < 12; i++) {
      game = hardDrop({ ...game, board: emptyBoard() })
      seen.push(game.next)
    }
    for (const bagStart of [0, 7]) {
      expect([...seen.slice(bagStart, bagStart + 7)].sort()).toEqual([...PIECE_TYPES].sort())
    }
  })
})

describe('collides', () => {
  it('sees walls and the floor', () => {
    const board = emptyBoard()
    expect(collides(board, { type: 'O', rot: 0, x: -1, y: 0 })).toBe(true)
    expect(collides(board, { type: 'O', rot: 0, x: COLS - 1, y: 0 })).toBe(true)
    expect(collides(board, { type: 'O', rot: 0, x: 4, y: ROWS - 1 })).toBe(true)
    expect(collides(board, { type: 'O', rot: 0, x: 4, y: ROWS - 2 })).toBe(false)
  })

  it('sees the stack', () => {
    const board = emptyBoard()
    board[10][4] = 'Z'
    expect(collides(board, { type: 'O', rot: 0, x: 4, y: 9 })).toBe(true)
    expect(collides(board, { type: 'O', rot: 0, x: 5, y: 9 })).toBe(false)
  })
})

describe('moving and turning', () => {
  it('slides sideways until a wall stops it', () => {
    let game = playing({ piece: { type: 'O', rot: 0, x: 1, y: 5 } })
    game = moveSideways(game, -1)
    expect(game.piece.x).toBe(0)
    expect(moveSideways(game, -1)).toBe(game)
  })

  it('does not slide into the stack', () => {
    const board = emptyBoard()
    board[5][4] = 'Z'
    const game = playing({ piece: { type: 'O', rot: 0, x: 2, y: 5 }, board })
    expect(moveSideways(game, 1)).toBe(game)
  })

  it('turns in place when there is room', () => {
    const game = playing({ piece: { type: 'T', rot: 0, x: 4, y: 5 } })
    expect(rotate(game, 1).piece.rot).toBe(1)
    expect(rotate(game, -1).piece.rot).toBe(3)
  })

  it('kicks off a wall instead of refusing to turn', () => {
    // An upright I against the left wall turns flat by shifting right.
    const upright = { type: 'I', rot: 1, x: -3, y: 5 }
    expect(collides(emptyBoard(), { ...upright, rot: 0 })).toBe(true)
    const turned = rotate(playing({ piece: upright }), 1)
    expect(turned.piece.rot).toBe(2)
    expect(collides(turned.board, turned.piece)).toBe(false)
  })

  it('refuses to turn when boxed in', () => {
    const board = emptyBoard()
    // Walls of blocks all around an upright I that cannot turn anywhere.
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        board[y][x] = 'Z'
      }
    }
    for (let y = 3; y < 7; y++) {
      board[y][4] = null
    }
    const game = playing({ board, piece: { type: 'I', rot: 1, x: 1, y: 3 } })
    expect(rotate(game, 1)).toBe(game)
  })

  it('leaves the square alone', () => {
    const game = playing({ piece: { type: 'O', rot: 0, x: 4, y: 5 } })
    expect(rotate(game, 1)).toBe(game)
  })
})

describe('gravity and landing', () => {
  it('moves the piece down a row each tick', () => {
    expect(tick(playing()).piece.y).toBe(1)
  })

  it('locks a piece that lands, and brings in the next one', () => {
    const game = playing({ piece: { type: 'O', rot: 0, x: 4, y: ROWS - 2 } })
    const next = tick(game)
    expect(next.board[ROWS - 1][4]).toBe('O')
    expect(next.board[ROWS - 2][5]).toBe('O')
    expect(next.piece.type).toBe('O') // the queued piece
    expect(next.piece.y).toBe(0)
    expect(next.next).toBe('I') // drawn from the bag
  })

  it('finds where a piece would land', () => {
    const board = emptyBoard()
    board[ROWS - 1][4] = 'Z'
    const game = playing({ board, piece: { type: 'O', rot: 0, x: 4, y: 0 } })
    expect(landingPiece(game).y).toBe(ROWS - 3)
  })

  it('drops a piece to the bottom and locks it at once', () => {
    const next = hardDrop(playing({ piece: { type: 'O', rot: 0, x: 0, y: 0 } }))
    expect(next.board[ROWS - 1][0]).toBe('O')
    expect(next.board[ROWS - 2][1]).toBe('O')
    expect(next.piece.y).toBe(0)
  })

  it('speeds up as lines are cleared', () => {
    expect(gravityMs(0)).toBeGreaterThan(gravityMs(2))
    expect(gravityMs(2)).toBeGreaterThan(gravityMs(4))
    expect(gravityMs(100)).toBe(200)
  })
})

describe('clearing lines', () => {
  it('clears a full row and drops everything above it', () => {
    const board = emptyBoard()
    board[ROWS - 1] = rowWithGaps(0, 1, 2, 3)
    board[ROWS - 2][9] = 'J' // sits on top of the row that is about to clear
    const game = playing({ board, piece: { type: 'I', rot: 0, x: 0, y: 0 } })
    const next = hardDrop(game)

    expect(next.lines).toBe(1)
    expect(next.status).toBe('playing')
    expect(next.board[ROWS - 1][9]).toBe('J') // fell one row
    expect(next.board[ROWS - 1].filter((c) => c === 'I')).toHaveLength(0)
    expect(next.board[ROWS - 2].every((c) => c === null)).toBe(true)
  })

  it('clears several rows at once', () => {
    const board = emptyBoard()
    for (let y = ROWS - 4; y < ROWS; y++) {
      board[y] = rowWithGaps(0)
    }
    const game = playing({ board, piece: { type: 'I', rot: 1, x: -3, y: 0 } })
    const next = hardDrop(game)
    expect(next.lines).toBe(4)
    expect(next.board.every((row) => row.every((c) => c === null))).toBe(true)
  })

  it('leaves a row that still has a gap', () => {
    const board = emptyBoard()
    board[ROWS - 1] = rowWithGaps(0, 5)
    const game = playing({ board, piece: { type: 'O', rot: 0, x: 0, y: 0 } })
    expect(hardDrop(game).lines).toBe(0)
  })

  it('wins on the fifth line', () => {
    expect(LINES_TO_WIN).toBe(5)
    const board = emptyBoard()
    board[ROWS - 1] = rowWithGaps(0, 1, 2, 3)
    const game = playing({ board, lines: LINES_TO_WIN - 1, piece: { type: 'I', rot: 0, x: 0, y: 0 } })
    const next = hardDrop(game)
    expect(next).toMatchObject({ status: 'won', lines: LINES_TO_WIN, piece: null })
  })

  it('does not win on four lines', () => {
    const board = emptyBoard()
    board[ROWS - 1] = rowWithGaps(0, 1, 2, 3)
    const game = playing({ board, lines: LINES_TO_WIN - 2, piece: { type: 'I', rot: 0, x: 0, y: 0 } })
    expect(hardDrop(game).status).toBe('playing')
  })

  it('stops once it has been won', () => {
    const board = emptyBoard()
    board[ROWS - 1] = rowWithGaps(0, 1, 2, 3)
    const won = hardDrop(playing({ board, lines: 4, piece: { type: 'I', rot: 0, x: 0, y: 0 } }))
    expect(tick(won)).toBe(won)
    expect(hardDrop(won)).toBe(won)
  })
})

describe('topping out', () => {
  it('loses when the next piece has no room to appear', () => {
    const board = emptyBoard()
    // Fill the top rows except the column the current piece is about to land in.
    for (let y = 0; y < 4; y++) {
      board[y] = rowWithGaps(0)
    }
    const game = playing({ board, piece: { type: 'O', rot: 0, x: 8, y: 10 }, next: 'O' })
    const next = hardDrop(game)
    expect(next).toMatchObject({ status: 'lost', reason: 'topout' })
  })

  it('stops completely once it has lost', () => {
    const board = emptyBoard()
    for (let y = 0; y < 4; y++) {
      board[y] = rowWithGaps(0)
    }
    const lost = hardDrop(playing({ board, piece: { type: 'O', rot: 0, x: 8, y: 10 }, next: 'O' }))
    expect(tick(lost)).toBe(lost)
    expect(moveSideways(lost, 1)).toBe(lost)
  })
})

describe('the shrinking ceiling', () => {
  it('comes down every 15 seconds', () => {
    expect(SHRINK_EVERY_MS).toBe(15000)
  })

  it('starts with no wall', () => {
    expect(createGame().ceiling).toBe(0)
  })

  it('does nothing until the game is started, and once it is over', () => {
    const ready = createGame()
    expect(shrinkCeiling(ready)).toBe(ready)
    const lost = playing({ status: 'lost' })
    expect(shrinkCeiling(lost)).toBe(lost)
  })

  it('turns the top row into solid wall and lowers the ceiling by one', () => {
    const game = shrinkCeiling(playing({ piece: { type: 'O', rot: 0, x: 4, y: 8 } }))
    expect(game.ceiling).toBe(1)
    expect(game.board[0].every((cell) => cell === WALL)).toBe(true)
    expect(game.board[1].every((cell) => cell === null)).toBe(true)
    expect(game.status).toBe('playing')
  })

  it('keeps walling off one more row each time', () => {
    let game = playing({ piece: { type: 'O', rot: 0, x: 4, y: 10 } })
    for (let i = 0; i < 3; i++) {
      game = shrinkCeiling(game)
    }
    expect(game.ceiling).toBe(3)
    expect(game.board.slice(0, 3).every((row) => row.every((cell) => cell === WALL))).toBe(true)
    expect(game.board[3].every((cell) => cell === null)).toBe(true)
  })

  it('stops a piece moving into the wall', () => {
    let game = shrinkCeiling(playing({ piece: { type: 'O', rot: 0, x: 4, y: 3 } }))
    expect(collides(game.board, { type: 'O', rot: 0, x: 4, y: 0 })).toBe(true)
    expect(collides(game.board, { type: 'O', rot: 0, x: 4, y: 1 })).toBe(false)
    // Rotating can't kick a piece up into the wall either.
    game = shrinkCeiling(playing({ piece: { type: 'T', rot: 0, x: 4, y: 1 } }))
    expect(cellsOf(rotate(game).piece).every(([, y]) => y >= game.ceiling)).toBe(true)
  })

  it('pushes a falling piece down a row if the wall would overlap it', () => {
    const game = shrinkCeiling(playing({ piece: { type: 'T', rot: 0, x: 3, y: 0 } }))
    expect(game.status).toBe('playing')
    expect(game.piece.y).toBe(1)
    expect(collides(game.board, game.piece)).toBe(false)
  })

  it('leaves a piece that is clear of the wall where it is', () => {
    const piece = { type: 'T', rot: 0, x: 3, y: 6 }
    expect(shrinkCeiling(playing({ piece })).piece).toEqual(piece)
  })

  it('crushes the stack if it already reaches the row the ceiling is dropping on', () => {
    const board = emptyBoard()
    board[0][2] = 'Z'
    const game = shrinkCeiling(playing({ board, piece: { type: 'O', rot: 0, x: 6, y: 10 } }))
    expect(game).toMatchObject({ status: 'lost', reason: 'squeezed' })
  })

  it('loses if the piece it pushes down has nowhere to go', () => {
    const board = emptyBoard()
    // A piece at the top resting right on a stack, with the wall about to land on it.
    board[2] = Array(COLS).fill('Z')
    const game = shrinkCeiling(playing({ board, piece: { type: 'O', rot: 0, x: 4, y: 0 } }))
    expect(game).toMatchObject({ status: 'lost', reason: 'squeezed' })
  })

  it('spawns new pieces just under the ceiling', () => {
    let game = playing({ piece: { type: 'O', rot: 0, x: 4, y: 16 }, next: 'T' })
    game = shrinkCeiling(shrinkCeiling(game))
    expect(game.ceiling).toBe(2)
    const landed = hardDrop(game)
    expect(landed.piece.type).toBe('T')
    expect(landed.piece.y).toBe(2)
  })

  it('loses with "top out" when the next piece cannot fit under the ceiling', () => {
    const board = emptyBoard()
    for (let y = 3; y < 7; y++) {
      board[y] = Array.from({ length: COLS }, (_, x) => (x === 0 ? null : 'Z'))
    }
    // Ceiling at 2: the next piece spawns at row 2 and runs into the stack at row 3.
    let game = playing({ board, piece: { type: 'O', rot: 0, x: 8, y: 10 }, next: 'O' })
    game = shrinkCeiling(shrinkCeiling(game))
    expect(hardDrop(game)).toMatchObject({ status: 'lost', reason: 'topout' })
  })

  it('never clears the wall as a line, and keeps it at the top when real lines clear', () => {
    const board = emptyBoard()
    board[ROWS - 1] = rowWithGaps(0, 1, 2, 3)
    let game = playing({ board, piece: { type: 'I', rot: 0, x: 0, y: 5 } })
    game = shrinkCeiling(shrinkCeiling(game)) // two wall rows
    const next = hardDrop(game)

    expect(next.lines).toBe(1) // the wall rows are full but are not counted as lines
    expect(next.ceiling).toBe(2)
    expect(next.board.slice(0, 2).every((row) => row.every((cell) => cell === WALL))).toBe(true)
    expect(next.board[2].every((cell) => cell === null)).toBe(true)
    expect(next.board).toHaveLength(ROWS)
  })

  it('clears a line beneath the wall and drops what is above it, below the wall', () => {
    const board = emptyBoard()
    board[ROWS - 1] = rowWithGaps(0, 1, 2, 3)
    board[ROWS - 2][9] = 'J'
    let game = playing({ board, piece: { type: 'I', rot: 0, x: 0, y: 5 } })
    game = shrinkCeiling(game)
    const next = hardDrop(game)
    expect(next.board[ROWS - 1][9]).toBe('J')
    expect(next.board[0].every((cell) => cell === WALL)).toBe(true)
  })

  it('still wins on the fifth line with a wall in place', () => {
    const board = emptyBoard()
    board[ROWS - 1] = rowWithGaps(0, 1, 2, 3)
    let game = playing({ board, lines: LINES_TO_WIN - 1, piece: { type: 'I', rot: 0, x: 0, y: 5 } })
    game = shrinkCeiling(game)
    expect(hardDrop(game)).toMatchObject({ status: 'won', lines: LINES_TO_WIN })
  })

  it('squeezes out anyone who just waits: the well closes up completely', () => {
    let game = playing({ piece: { type: 'O', rot: 0, x: 4, y: 0 } })
    let drops = 0
    while (game.status === 'playing' && drops < 100) {
      game = shrinkCeiling(tick(game, () => 0.3))
      drops += 1
    }
    expect(game.status).toBe('lost')
    expect(drops).toBeLessThan(ROWS + 1)
  })
})
