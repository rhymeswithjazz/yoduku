import { generatePuzzle, neighbors } from './engine.js';
import { configFor, puzzleNumber } from './daily.js';
import { hashString, mulberry32 } from './rng.js';

export function puzzleForDate(dateStr) {
  return generatePuzzle(configFor(dateStr), mulberry32(hashString(dateStr)));
}

export function validateSolveSubmission(submission) {
  if (!submission || !isDateString(submission.date)) {
    return invalid('invalid-date');
  }
  const mode = submission.mode === 'hard' ? 'hard' : submission.mode === 'normal' ? 'normal' : null;
  if (!mode) return invalid('invalid-mode');

  const startedAt = Number(submission.startedAt);
  const solvedAt = Number(submission.solvedAt);
  if (!Number.isFinite(startedAt) || !Number.isFinite(solvedAt) || solvedAt < startedAt) {
    return invalid('invalid-time');
  }

  const checks = Number(submission.checks);
  if (!Number.isInteger(checks) || checks < 0) return invalid('invalid-checks');

  const puzzle = puzzleForDate(submission.date);
  const board = puzzle.board;
  const clues = mode === 'hard' ? puzzle.hardClues : puzzle.normalClues;
  const placed = new Map(clues);
  const usedCells = new Set(clues.values());

  if (!Array.isArray(submission.player)) return invalid('invalid-player');
  for (const entry of submission.player) {
    if (!Array.isArray(entry) || entry.length !== 2) return invalid('invalid-player');
    const [num, cell] = entry;
    if (!Number.isInteger(num) || !Number.isInteger(cell)) return invalid('invalid-player');
    if (num < 1 || num > board.cellCount) return invalid('invalid-number');
    if (cell < 0 || cell >= board.size * board.size || board.blocked.has(cell)) return invalid('invalid-cell');
    if (clues.has(num)) return invalid('clue-number');
    if (placed.has(num)) return invalid('duplicate-number');
    if (usedCells.has(cell)) return invalid('duplicate-cell');
    placed.set(num, cell);
    usedCells.add(cell);
  }

  if (placed.size !== board.cellCount) return invalid('incomplete-solve');

  for (let num = 1; num <= board.cellCount; num++) {
    if (!placed.has(num)) return invalid('incomplete-solve');
    const cell = placed.get(num);
    if (clues.has(num) && clues.get(num) !== cell) return invalid('clue-mismatch');
    if (num > 1 && !neighbors(board, placed.get(num - 1)).includes(cell)) {
      return invalid('non-adjacent-chain');
    }
  }

  return {
    ok: true,
    solve: {
      date: submission.date,
      puzzle_number: puzzleNumber(submission.date),
      mode,
      checks,
      elapsed_seconds: Math.round((solvedAt - startedAt) / 1000),
      solved_at: new Date(solvedAt).toISOString(),
      display_name: cleanDisplayName(submission.displayName),
    },
  };
}

function cleanDisplayName(value) {
  const name = String(value ?? 'Player').trim().replace(/\s+/g, ' ').slice(0, 32);
  return name || 'Player';
}

function isDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function invalid(reason) {
  return { ok: false, reason };
}
