# Jeopardy! (client-side host)

React + Vite Jeopardy! for game night, styled and played like the TV show. No server: import a JSON board, add contestants, and host from your browser.

## Quick start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

```bash
npm test
```

## Board JSON

Import a file or paste JSON. A full example lives at [`public/sample-board.json`](public/sample-board.json).

- `title`: string
- `categories`: **exactly 6** categories for the Jeopardy! round, each with `name` and **exactly 5** `clues` (`value`, `clue`, `answer`). Standard values are 200–1000.
- `doubleJeopardy` (optional): `{ "categories": [...] }` in the same shape, with values 400–2000.
- `finalJeopardy` (optional): `{ "category", "clue", "answer" }`
- `dailyDouble: true` on any clue (optional) pins a Daily Double there. If you flag none in a round, they are hidden at random: 1 in Jeopardy!, 2 in Double Jeopardy!, never in the top row, never in the same column.

## Rules (as on the show)

- **Control**: The contestant in control picks the next clue. Whoever answers correctly takes control.
- **Judging**: On a clue, mark each contestant Correct (+value) or Incorrect (−value). A miss locks that contestant out and the clue stays open for the others. If everyone misses, or you choose **No one got it**, the response is revealed and control stays put.
- **Negative scores** are allowed.
- **Daily Double**: Only the contestant in control plays it. Wager $5 up to the greater of their score or the round's top clue value. Correct wins the wager, incorrect loses it, and control stays with them either way.
- **Double Jeopardy!**: Values double, and the contestant in last place chooses first.
- **Final Jeopardy!**: Only contestants with a positive score play. Each wagers up to their whole score, the clue is revealed, then you judge each response.
- **Game over**: Final standings and the champion are shown.

Contestants and scores persist in `localStorage`. **New game** keeps the board and contestants but resets scores and clues.
