# Jeopardy (client-side host)

React + Vite Jeopardy board for game night hosting. No server — import a JSON board, add teams, and run the game from your browser.

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

Required shape:

- `title` — string
- `categories` — **exactly 6** objects, each with:
  - `name` — string
  - `clues` — **exactly 5** objects with `value`, `clue`, `answer`
  - optional `hint` per clue
- optional `spinnerEvents` — array of strings for the fun spinner

Standard clue values are 200, 400, 600, 800, and 1000. Other values trigger a warning but still load.

## Game rules (built-in)

- **Teams**: Add, rename, or remove teams. Scores persist in `localStorage` until you clear site data.
- **Turns**: After each clue is marked correct or incorrect, play passes to the next team automatically. Use **Switch here** or **Next team (manual)** anytime.
- **Hints**: One hint per clue. Using a hint reduces a correct answer by **100** points and increases a wrong answer penalty by **100** points (e.g. $500 → +400 / −600).
- **Spinner**: Picks a random label from `spinnerEvents`. Display-only for now — extend JSON/handlers later for score effects.

## Host flow

1. Load sample board or import your JSON.
2. Add at least one team.
3. Active team selects a dollar amount on the board.
4. Optional: request hint, then mark **Correct** or **Incorrect**.
5. Use **Reveal answer** when you want to show the official response.
6. **New game (reset scores)** keeps the same board and teams but clears progress and scores.
