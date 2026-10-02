# Background music

This app looks for **`jeopardy-theme.mp3`** (and optionally **`jeopardy-theme.ogg`**) in this folder.

We do **not** ship the copyrighted TV Jeopardy! theme. Add your own legally licensed track, or rely on the built-in Web Audio “thinking” tone loop when no file is present.

## Add or replace the track

1. Place your loop-friendly MP3 at `public/audio/jeopardy-theme.mp3`.
2. Optional: add `public/audio/jeopardy-theme.ogg` for broader browser support (the app prefers MP3 when both exist).
3. Refresh the host page. Use **Music** in the side rail to unmute.

## Royalty-free sources (examples)

Search for “game show loop” or “quiz background” on sites that clearly license commercial/event use (e.g. Pixabay, Free Music Archive with compatible license). Keep a copy of the license with your event files.

## Autoplay

Browsers block audio until the host clicks or presses a key once. Music stays **muted by default** until you toggle **Music** off/on or interact with the game; the first gesture unlocks playback.
