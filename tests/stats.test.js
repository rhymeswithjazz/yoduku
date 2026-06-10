import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyStats, recordPlayed, recordSolved, prevDateString } from '../js/stats.js';

test('prevDateString crosses month boundaries', () => {
  assert.equal(prevDateString('2026-06-10'), '2026-06-09');
  assert.equal(prevDateString('2026-06-01'), '2026-05-31');
  assert.equal(prevDateString('2026-01-01'), '2025-12-31');
});

test('recordPlayed counts once per day', () => {
  const s = emptyStats();
  recordPlayed(s, '2026-06-10');
  recordPlayed(s, '2026-06-10');
  assert.equal(s.played, 1);
  recordPlayed(s, '2026-06-11');
  assert.equal(s.played, 2);
});

test('recordSolved: streaks extend, break, and bucket checks', () => {
  const s = emptyStats();
  recordSolved(s, '2026-06-10', 0);
  recordSolved(s, '2026-06-10', 0);              // idempotent per day
  assert.equal(s.solved, 1);
  assert.equal(s.currentStreak, 1);
  recordSolved(s, '2026-06-11', 1);              // consecutive day
  assert.equal(s.currentStreak, 2);
  recordSolved(s, '2026-06-14', 5);              // gap breaks streak
  assert.equal(s.currentStreak, 1);
  assert.equal(s.maxStreak, 2);
  assert.deepEqual(s.checkDist, { 0: 1, 1: 1, 2: 0, '3+': 1 });
});
