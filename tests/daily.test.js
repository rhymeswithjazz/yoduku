import test from 'node:test';
import assert from 'node:assert/strict';
import { EPOCH, SCHEDULE, localDateString, puzzleNumber, configFor } from '../js/daily.js';

test('epoch is puzzle #1 and numbering advances daily', () => {
  assert.equal(EPOCH, '2026-06-10');
  assert.equal(puzzleNumber('2026-06-10'), 1);
  assert.equal(puzzleNumber('2026-06-11'), 2);
  assert.equal(puzzleNumber('2026-06-17'), 8);
});

test('weekly schedule maps weekdays to configs', () => {
  assert.deepEqual(configFor('2026-06-10'), SCHEDULE[3]); // Wednesday
  assert.ok(configFor('2026-06-10').wormhole);            // wormhole Wednesday
  assert.equal(configFor('2026-06-13').holes, 3);         // Saturday
  assert.equal(configFor('2026-06-14').size, 7);          // Sunday
  assert.equal(configFor('2026-06-15').size, 5);          // Monday
  assert.ok(configFor('2026-06-15').extraClues > configFor('2026-06-09').extraClues); // Mon easier than Tue
});

test('localDateString uses local calendar date', () => {
  assert.equal(localDateString(new Date(2026, 5, 10, 23, 59)), '2026-06-10');
  assert.equal(localDateString(new Date(2026, 0, 1, 0, 0)), '2026-01-01');
});
