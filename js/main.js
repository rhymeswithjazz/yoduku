import { hashString, mulberry32 } from './rng.js';
import { generatePuzzle } from './engine.js';
import { localDateString, puzzleNumber, configFor } from './daily.js';
import { createGame, restore, serialize, clickCell } from './game.js';
import { emptyStats, recordPlayed, recordSolved } from './stats.js';
import { buildBoard, buildLabel, render } from './ui.js';

const STATE_KEY = 'yoduku-state';
const STATS_KEY = 'yoduku-stats';

function readStorage(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeStorage(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private mode: play without saving */ }
}

const params = new URLSearchParams(location.search);
const override = params.get('d'); // dev/testing override: ?d=2026-06-14
const dateStr = override && /^\d{4}-\d{2}-\d{2}$/.test(override) ? override : localDateString(new Date());

const puzzle = generatePuzzle(configFor(dateStr), mulberry32(hashString(dateStr)));
const game = restore(puzzle, readStorage(STATE_KEY), dateStr) ?? createGame(puzzle);

let stats = emptyStats();
try {
  const raw = readStorage(STATS_KEY);
  if (raw) stats = { ...emptyStats(), ...JSON.parse(raw) };
} catch { /* corrupted: reset */ }

const ctx = {
  game,
  stats,
  number: puzzleNumber(dateStr),
  dateStr,
  save() {
    if (game.startedAt) recordPlayed(stats, dateStr);
    if (game.solved) recordSolved(stats, dateStr, game.checks);
    writeStorage(STATE_KEY, serialize(game, dateStr));
    writeStorage(STATS_KEY, JSON.stringify(stats));
  },
};

buildBoard(ctx, (cell) => {
  clickCell(ctx.game, cell); // interactions wired fully in Task 12
  ctx.save();
  render(ctx);
});
buildLabel(ctx);
render(ctx);
