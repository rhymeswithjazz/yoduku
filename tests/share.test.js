import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBoard } from '../js/engine.js';
import { shareText } from '../js/share.js';

test('shareText: header line and spoiler-free grid', () => {
  const board = makeBoard(3, [4], [0, 8]);
  const puzzle = {
    board,
    path: [],
    hardClues: new Map([[1, 6]]),
    normalClues: new Map([[1, 6], [3, 2]]),
  };
  const text = shareText(puzzle, 7, { solved: true, seconds: 201, checks: 1, hard: false });
  const lines = text.split('\n');
  assert.equal(lines[0], 'Yoduku #7 ✅ 3:21 · 1 check');
  assert.equal(lines.length, 4);                 // header + 3 rows
  assert.equal(lines[1], '🟪⬛🟨');               // wormhole, open, clue
  assert.equal(lines[2], '⬛🟫⬛');               // blocked center
  assert.equal(lines[3], '🟨⬛🟪');

  const hardText = shareText(puzzle, 7, { solved: true, seconds: 65, checks: 2, hard: true });
  assert.equal(hardText.split('\n')[0], 'Yoduku #7 ✅ 1:05 · 2 checks*');
  assert.equal(hardText.split('\n')[1], '🟪⬛⬛'); // hard grid hides the extra clue at cell 2
  assert.equal(hardText.split('\n')[3], '🟨⬛🟪'); // hard clue at cell 6 still shown
});
