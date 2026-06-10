# Yoduku — Design Spec

**Date:** 2026-06-10
**Status:** Approved pending user review

## Overview

Yoduku is a daily browser puzzle game. A hidden Hamiltonian path numbered 1–N snakes
through a grid; consecutive numbers always occupy orthogonally adjacent cells. A few
clue numbers (always including 1) are pre-revealed and locked. The player reconstructs
the path by clicking cells to extend a chain from 1. Everyone gets the same board each
day (date-seeded, fully client-side, no backend).

## Game Rules

- The grid is filled by a single path visiting every open cell exactly once, numbered
  1–N (N = number of open cells).
- Consecutive numbers must be **orthogonally adjacent** (4-way). No diagonals.
- Clue cells are pre-filled and cannot be changed.
- The puzzle always has **exactly one solution** (enforced at generation).

## Input: Locked-Order Chain Building

- The **chain head** is the highest number n such that 1…n are all on the board and
  each consecutive pair is adjacent. Initially the head is the clue `1` (or further,
  if clues happen to chain from 1).
- **Clicking an empty cell adjacent to the head** places n+1 there.
- After any placement the head is recomputed: if the next number(s) are clues adjacent
  in sequence, the chain extends through them automatically.
- If the head's successor is a clue but the head is **not** adjacent to that clue's
  cell, the player has built a dead branch and must backtrack.
- **Clicking a player-filled cell clears it and every later player-filled number**
  (chain truncation). Clues are never cleared.
- Clicking an empty cell not adjacent to the head is a no-op with a brief shake/flash
  feedback.
- A full board is valid by construction → **win auto-detects** on placing the final
  number. The board then locks.

## Check Button: Solvability Lifeline

- Pressing **Check** runs the solver against the current chain + visible clues and
  answers one binary question: *"Can this position still be completed?"*
  - **Still solvable** → reassuring message.
  - **Dead end** → "Back up — this can't be completed." No hint about how far back.
- Check presses are counted and reported in the share string. Solving with 0 checks
  is the flex.
- Check is disabled on an empty chain and after winning.

## Daily System & Weekly Schedule

- **Seed:** the local date string (`YYYY-MM-DD`) hashed into a 32-bit seed for a
  mulberry32 PRNG. All generation randomness flows from this PRNG → deterministic
  daily boards with no server.
- **Puzzle number:** days since epoch date **2026-06-10** (= puzzle #1), so the
  number is derivable from the date alone.
- **Weekly schedule** (weekday from the local date):

| Day | Size | Blocked cells | Extra clues (normal mode) |
|-----|------|---------------|---------------------------|
| Mon | 5×5  | 0 | +6 |
| Tue | 5×5  | 0 | +4 |
| Wed | 5×5  | 0 (wormhole day) | +3 |
| Thu | 6×6  | 0 | +6 |
| Fri | 6×6  | 0 | +4 |
| Sat | 6×6  | 3 | +4 |
| Sun | 7×7  | 3 | +5 |

Clue counts are tunable constants in one place; the table above is the launch tuning.

### Wormhole Wednesday

- One seeded pair of non-adjacent cells counts as adjacent (rendered with matching
  glyphs/colors). The pair is part of the adjacency function, so generator, solver,
  and input all honor it with no special cases.
- Generation retries until the solution path **traverses** the wormhole edge (cap:
  200 path attempts per wormhole pair, then re-pick the pair). Wormholes are never
  decoys.

### Blocked cells (Sat/Sun)

- Seeded random placement of blocked cells; regenerate placement if no Hamiltonian
  path exists on the remaining cells. Blocked cells render as solid obstacles and
  ignore clicks. N shrinks accordingly (e.g. 6×6 − 3 holes → path 1–33).

## Hard Mode

- Generation first finds a **minimal-ish unique clue set**: start from a spread of
  candidate clues, greedily remove clues while the solution stays unique. That set is
  **hard mode**.
- Then add the day's *extra clues* (schedule table) → **normal mode**. Both clue sets
  yield exactly one solution.
- A settings toggle switches modes. Switching to hard clears any placed numbers that
  depended on a now-hidden clue (simplest: truncate the chain to what remains valid).
  Solving in hard mode adds `*` to the share string.

## Win, Stats, Share

- On win: stop the timer, lock the board, show a results modal.
- **Stats (localStorage):** games played (a day counts as played on the first
  placement), games solved, win %, current streak, max streak, and a distribution of
  checks used (0 / 1 / 2 / 3+), Wordle-style.
- **Streak:** consecutive calendar days with a solve. Solving today's puzzle after
  midnight still counts for the puzzle's date.
- **Share** copies plain text to the clipboard, e.g.:

```
Yoduku #42 ✅ 3:21 · 1 check*
⬛🟨⬛⬛⬛
⬛⬛⬛🟪⬛
🟨⬛⬛⬛⬛
⬛⬛🟫⬛🟨
🟨⬛⬛⬛🟪
```

  Emoji grid legend: 🟨 clue, 🟪 wormhole ends, 🟫 blocked, ⬛ open. This is the
  public board layout — no solution information leaks. `*` = hard mode.

## Timer

- Starts on the player's first placement; pauses are not tracked (wall-clock from
  first move to win). Elapsed time persists in localStorage with the day's board.

## Persistence (localStorage)

- `yoduku-state`: date, mode, chain placements, check count, timer start, solved flag.
  Restored on reload if the date matches; discarded otherwise.
- `yoduku-stats`: the stats object above.
- Corrupted/unparseable storage is silently discarded and reset.

## Architecture

Vanilla static site, no build step, ES modules. Deployable to any static host.

| File | Responsibility |
|------|----------------|
| `index.html` | Shell: grid container, buttons, modals (help, stats, settings) |
| `style.css` | All styling |
| `js/rng.js` | mulberry32 PRNG + date-string hash |
| `js/engine.js` | Pure logic: board/adjacency (incl. holes + wormhole), Hamiltonian path generation, counting solver (with connectivity pruning; counts capped at 2), clue selection |
| `js/daily.js` | Date → seed, puzzle number, weekly schedule constants |
| `js/game.js` | Game state: chain head computation, placement/truncation, lifeline check, win detection, persistence |
| `js/ui.js` | Rendering, animations, modals, share/clipboard, timer display |
| `js/main.js` | Wiring/bootstrap |

`engine.js` and `daily.js` are pure (no DOM, no storage) so they run under Node for
tests. The solver uses dead-end and connectivity pruning so 7×7 generation and
lifeline checks stay fast (target: < 1s worst case on a 7×7; generation runs once at
load).

## Error Handling & Edge Cases

- Invalid clicks (non-adjacent, blocked, clue cells) → no-op + shake feedback.
- Solved board ignores all input except Share/stats.
- Date change while the page is open: handled on next load (no live rollover).
- Clipboard API failure → fall back to a selectable text box in the modal.
- localStorage unavailable (private mode) → game works, stats/resume silently off.

## Testing

A Node-runnable test file (`npm test` via plain `node --test` or a bare script)
asserting, for a sweep of seeds and all 7 weekday configurations:

1. Generated paths are valid Hamiltonian paths on the open cells (adjacency incl.
   wormholes, every open cell visited once).
2. The same date string always reproduces an identical puzzle (determinism).
3. Both hard and normal clue sets yield **exactly one** solution.
4. Wednesday solutions traverse the wormhole edge.
5. Chain-head computation, placement legality, and truncation behave per the rules
   above (unit tests on `game.js` logic with storage stubbed).
6. The lifeline solver returns true for prefixes of the real solution and false for
   a known dead-end position.

## Out of Scope (explicitly)

- Backend, accounts, leaderboards.
- Practice/archive mode (daily only).
- Mobile app packaging (the site is responsive; that's it).
- Building the chain downward from N ("both ends" twist — rejected).

## Visual Direction

Styling is decided at implementation time via the frontend-design skill: a polished,
distinctive look (not a generic AI-generated aesthetic). The grid is the hero;
wormholes and blocked cells must be visually unmistakable. Responsive down to
~380px-wide screens.
