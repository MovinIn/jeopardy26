# Jeopardy! (client-side host)

React + Vite Jeopardy! for game night, styled and played like the TV show. No server: import a JSON board, add contestants, and host from your browser.

## Quick start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

### Running a game night

Use the optimised build instead of the dev server:

```bash
npm run play
```

It loads much faster, and it has none of the dev server's live-reload connection. That connection can drop while a tab is in the background, and the dev server then **reloads the whole page** when you switch back, which shows up as a blank screen for a few seconds. (If that ever does happen, the page now shows a loading screen instead of going white, a reload partway through a mini game starts it over for free instead of costing the stake, and Snake, Tetris, the typing test and the reaction test all wait while the tab is hidden.)

```bash
npm test
```

## Board JSON

Import a file or paste JSON. A full example lives at [`public/sample-board.json`](public/sample-board.json).

- `title`: string
- `categories`: **5 or 6** categories for the Jeopardy! round (the board adapts to either), each with `name` and **exactly 5** `clues` (`value`, `clue`, `answer`). Standard values are 200–1000.
- `doubleJeopardy` (optional): `{ "categories": [...] }` in the same shape, with values 400–2000.
- `finalJeopardy` (optional): `{ "category", "clue", "answer" }`
- `minigame` on a clue (optional): `"snake"`, `"flappy"`, `"tetris"`, `"typing"` or `"reaction"` turns that clue into a mini game played on screen by the team in control. They stake the clue's value: win and gain it, lose and drop it. In the sample board these are the $200, $400, $600, $800 and $1,000 clues of **Live Games**. The $1,000 one is a reaction test: press only when the screen flashes pink, in under 350 ms, with three tries and random decoy colours to fool you.
- `dailyDouble: true` on any clue (optional) pins a Daily Double there. If you flag none in a round, they are hidden at random: 1 in Jeopardy!, 2 in Double Jeopardy!, never in the top row, never in the same column.

## Rules (as on the show)

- **Control**: The contestant in control picks the next clue. Whoever answers correctly takes control.
- **Judging**: On a clue, mark each contestant Correct (+value) or Incorrect (−value). A miss locks that contestant out and the clue stays open for the others. If everyone misses, or you choose **No one got it**, the response is revealed and control stays put.
- **Negative scores** are allowed.
- **Daily Double**: Only the contestant in control plays it. Wager $5 up to the greater of their score or the round's top clue value. Correct wins the wager, incorrect loses it, and control stays with them either way.
- **Double Jeopardy!**: Values double, and the contestant in last place chooses first.
- **Final Jeopardy!**: Only contestants with a positive score play. Each wagers up to their whole score, the clue is revealed, then you judge each response.
- **Game over**: Final standings and the champion are shown.

- **Tetris ceiling**: In the Tetris mini game the ceiling drops one row every 15 seconds (a solid wall fills the top of the well), so a team can't stall forever. Tune it with `SHRINK_EVERY_MS` in [`src/game/tetris.js`](src/game/tetris.js).

Contestants and scores persist in `localStorage`. **New game** keeps the board and contestants but resets scores and clues.

## Sound effects

- Arcade-style effects play for tile picks, right and wrong answers, the Daily Double, the shop (carnival jingle, card flips, roulette ball clacks, slot reels and jackpots) and every Live Games mini game.
- They are synthesised in the browser with the Web Audio API, so there are no audio files to add. All recipes live in [`src/audio/sfx.js`](src/audio/sfx.js); `play('coin')` fires one by name.
- **Sounds on / Sounds off** in the side rail (under the music button) mutes them. It is separate from the music and is remembered in `localStorage` under `jeopardy-sfx-prefs-v1`.
- Browsers only allow audio after a click or key press, so the first sound plays on your first interaction.

## Background music

- Drop a loop-friendly track at [`public/audio/jeopardy-theme.mp3`](public/audio/jeopardy-theme.mp3) (optional `.ogg`). The repo does **not** include the copyrighted TV theme; see [`public/audio/README.md`](public/audio/README.md).
- If no file is present, the host hears a short Web Audio “thinking” tone loop instead.
- **Music on / Music off** in the side rail (above **Reset**). Preference is stored in `localStorage` under `jeopardy-music-prefs-v1`.
- Music loops only during the **main board** phase (not Final Jeopardy!). Volume ducks to 30% while a clue modal is open.
- **Autoplay:** music starts **muted by default**. After you click or press a key anywhere on the page, unmute with **Music off** → **Music on** (or toggle once if you already prefer sound on).
