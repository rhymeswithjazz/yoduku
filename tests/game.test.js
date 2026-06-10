import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBoard } from '../js/engine.js';
import { createGame, clues, placedMap, chainHead, chainCells, clickCell, lifeline, setMode, serialize, restore } from '../js/game.js';

// 3x3 snake: cells 0,1,2,5,4,3,6,7,8 hold numbers 1..9
function tinyPuzzle() {
  const board = makeBoard(3);
  const path = [0, 1, 2, 5, 4, 3, 6, 7, 8];
  return {
    board,
    path,
    hardClues: new Map([[1, 0], [9, 8]]),
    normalClues: new Map([[1, 0], [4, 5], [9, 8]]),
  };
}

test('initial head is clue 1', () => {
  const g = createGame(tinyPuzzle());
  assert.deepEqual(chainHead(g), { num: 1, cell: 0 });
  assert.deepEqual(chainCells(g), [0]);
  assert.equal(clues(g).size, 3);
});

test('placing extends the chain; reaching an adjacent clue auto-extends through it', () => {
  const g = createGame(tinyPuzzle());
  assert.equal(clickCell(g, 1).type, 'placed');          // 2 @ 1
  assert.equal(clickCell(g, 2).type, 'placed');          // 3 @ 2, clue 4 @ 5 adjacent
  assert.deepEqual(chainHead(g), { num: 4, cell: 5 });   // auto-extended through clue
  assert.deepEqual(chainCells(g), [0, 1, 2, 5]);
});

test('rejections: non-adjacent, clue cell, dead-branch clue successor, startedAt set', () => {
  const g = createGame(tinyPuzzle());
  assert.equal(g.startedAt, null);
  assert.equal(clickCell(g, 4).type, 'rejected');        // not adjacent to head 0
  assert.equal(clickCell(g, 8).type, 'rejected');        // clue cell
  assert.equal(clickCell(g, 3).type, 'placed');          // 2 @ 3
  assert.ok(g.startedAt !== null);
  assert.equal(clickCell(g, 6).type, 'placed');          // 3 @ 6; head not adjacent to clue 4 @ 5
  assert.equal(clickCell(g, 7).type, 'rejected');        // next number is a clue: must connect to it
});

test('clicking a player cell truncates it and everything after', () => {
  const g = createGame(tinyPuzzle());
  clickCell(g, 1); clickCell(g, 2);                      // 2 @ 1, 3 @ 2, head auto 4 @ 5
  assert.equal(clickCell(g, 1).type, 'truncated');       // clears 2 and 3
  assert.deepEqual(chainHead(g), { num: 1, cell: 0 });
  assert.equal(g.player.size, 0);
});

test('completing the path wins and locks the board', () => {
  const g = createGame(tinyPuzzle());
  clickCell(g, 1); clickCell(g, 2);                      // head 4 @ 5
  clickCell(g, 4); clickCell(g, 3); clickCell(g, 6);     // 5,6,7
  const last = clickCell(g, 7);                          // 8 @ 7; 9 is adjacent clue -> complete
  assert.equal(last.type, 'won');
  assert.ok(g.solved && g.solvedAt !== null);
  assert.equal(clickCell(g, 1).type, 'ignored');         // locked after win
});

test('lifeline reports solvability and counts checks', () => {
  const g = createGame(tinyPuzzle(), 'hard');            // clues: 1@0, 9@8
  assert.equal(lifeline(g), true);
  clickCell(g, 1); clickCell(g, 4);                      // 2@1, 3@4 — known dead end
  assert.equal(lifeline(g), false);
  assert.equal(g.checks, 2);
});

test('setMode to hard hides extra clues and truncates orphaned numbers', () => {
  const g = createGame(tinyPuzzle());                    // normal: 1@0, 4@5, 9@8
  clickCell(g, 1); clickCell(g, 2);                      // head auto-extends to 4 @ 5
  setMode(g, 'hard');                                    // clue 4 hidden
  assert.deepEqual(chainHead(g), { num: 3, cell: 2 });
  assert.equal(clickCell(g, 5).type, 'placed');          // player now places 4 @ 5 themselves
  setMode(g, 'normal');                                  // clue 4 reappears at the same cell
  assert.deepEqual(chainHead(g), { num: 4, cell: 5 });
  assert.equal(g.player.has(4), false);                  // clue owns it again
});

test('serialize/restore round-trips and rejects bad payloads', () => {
  const puzzle = tinyPuzzle();
  const g = createGame(puzzle);
  clickCell(g, 1); clickCell(g, 2);
  g.checks = 1;
  const json = serialize(g, '2026-06-10');

  const back = restore(puzzle, json, '2026-06-10');
  assert.ok(back);
  assert.deepEqual(chainCells(back), chainCells(g));
  assert.equal(back.checks, 1);

  assert.equal(restore(puzzle, json, '2026-06-11'), null);      // wrong date
  assert.equal(restore(puzzle, 'not json{', '2026-06-10'), null); // corrupted
  const tampered = JSON.parse(json);
  tampered.player.push([5, 8]);                                  // player number on a clue cell
  assert.equal(restore(puzzle, JSON.stringify(tampered), '2026-06-10'), null);
});
