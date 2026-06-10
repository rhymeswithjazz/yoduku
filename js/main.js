import { hashString, mulberry32 } from './rng.js';
import { generatePuzzle } from './engine.js';
import { localDateString, puzzleNumber, configFor } from './daily.js';
import { createGame, restore, serialize } from './game.js';
import { emptyStats, recordPlayed, recordSolved } from './stats.js';
import { initUI, wireSettings } from './ui.js';
import { createAuth } from './auth.js';
import { submitSolve } from './leaderboard.js';
import { createBrowserLocalStore, createGameStorage, createSupabaseCloudStore } from './storage.js';

const params = new URLSearchParams(location.search);
const override = params.get('d'); // dev/testing override: ?d=2026-06-14
const dateStr = override && /^\d{4}-\d{2}-\d{2}$/.test(override) ? override : localDateString(new Date());

const puzzle = generatePuzzle(configFor(dateStr), mulberry32(hashString(dateStr)));
const auth = createAuth();
try {
  await auth.init();
} catch {
  // Bad/missing network config should not block local play.
}

const local = createBrowserLocalStore();
const cloud = auth.enabled ? createSupabaseCloudStore(auth) : null;
let storage = createGameStorage({ local, cloud });
let loaded = { state: null, stats: null };
try {
  loaded = await storage.load(dateStr);
} catch {
  storage = createGameStorage({ local });
  loaded = await storage.load(dateStr);
}

const game = restore(puzzle, loaded.state, dateStr) ?? createGame(puzzle);

let stats = emptyStats();
try {
  if (loaded.stats) {
    const parsed = loaded.stats;
    stats = { ...emptyStats(), ...parsed, checkDist: { ...emptyStats().checkDist, ...(parsed.checkDist ?? {}) } };
  }
} catch { /* corrupted: reset */ }

const ctx = {
  game,
  stats,
  number: puzzleNumber(dateStr),
  dateStr,
  save() {
    if (game.startedAt) recordPlayed(stats, dateStr);
    if (game.solved) recordSolved(stats, dateStr, game.checks);
    storage.save(dateStr, serialize(game, dateStr), stats).catch(() => {});
  },
  auth,
  submitSolve(submission) {
    return submitSolve(auth, submission);
  },
};

initUI(ctx);
wireSettings(ctx);
