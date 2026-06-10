import test from 'node:test';
import assert from 'node:assert/strict';
import { hashString, mulberry32 } from '../js/rng.js';
import { generatePuzzle } from '../js/engine.js';
import { configFor } from '../js/daily.js';
import { validateSolveSubmission } from '../js/validation.js';

function solvedSubmission(dateStr = '2026-06-10', mode = 'normal') {
  const puzzle = generatePuzzle(configFor(dateStr), mulberry32(hashString(dateStr)));
  const clues = mode === 'hard' ? puzzle.hardClues : puzzle.normalClues;
  const player = [];
  for (let i = 0; i < puzzle.path.length; i++) {
    const num = i + 1;
    if (!clues.has(num)) player.push([num, puzzle.path[i]]);
  }
  return {
    date: dateStr,
    mode,
    player,
    checks: 1,
    startedAt: 1_000_000,
    solvedAt: 1_185_000,
    displayName: 'Rae',
  };
}

test('validateSolveSubmission accepts a complete deterministic solve', () => {
  const result = validateSolveSubmission(solvedSubmission());

  assert.equal(result.ok, true);
  assert.equal(result.solve.date, '2026-06-10');
  assert.equal(result.solve.puzzle_number, 1);
  assert.equal(result.solve.mode, 'normal');
  assert.equal(result.solve.checks, 1);
  assert.equal(result.solve.elapsed_seconds, 185);
  assert.equal(result.solve.display_name, 'Rae');
});

test('validateSolveSubmission rejects wrong date shape', () => {
  const result = validateSolveSubmission({ ...solvedSubmission(), date: 'June 10' });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'invalid-date');
});

test('validateSolveSubmission rejects invalid calendar dates', () => {
  const result = validateSolveSubmission({ ...solvedSubmission(), date: '2026-99-99' });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'invalid-date');
});

test('validateSolveSubmission rejects duplicate player cells', () => {
  const submission = solvedSubmission();
  submission.player[1] = [submission.player[1][0], submission.player[0][1]];

  const result = validateSolveSubmission(submission);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'duplicate-cell');
});

test('validateSolveSubmission rejects missing numbers', () => {
  const submission = solvedSubmission();
  submission.player.pop();

  const result = validateSolveSubmission(submission);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'incomplete-solve');
});

test('validateSolveSubmission rejects non-adjacent chains', () => {
  const submission = solvedSubmission();
  const [first, second] = submission.player;
  submission.player[0] = [first[0], second[1]];
  submission.player[1] = [second[0], first[1]];

  const result = validateSolveSubmission(submission);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'non-adjacent-chain');
});
