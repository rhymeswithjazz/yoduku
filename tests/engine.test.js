import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, hashString } from '../js/rng.js';
import { makeBoard, neighbors, adjacent, parityOk, generatePath, pathIsValid, countSolutions, selectClues } from '../js/engine.js';

test('neighbors: center, edge, corner on 5x5', () => {
  const b = makeBoard(5);
  assert.deepEqual([...neighbors(b, 12)].sort((x, y) => x - y), [7, 11, 13, 17]);
  assert.deepEqual([...neighbors(b, 0)].sort((x, y) => x - y), [1, 5]);
  assert.deepEqual([...neighbors(b, 4)].sort((x, y) => x - y), [3, 9]);
});

test('blocked cells are excluded from open list and adjacency', () => {
  const b = makeBoard(5, [7]);
  assert.equal(b.cellCount, 24);
  assert.ok(!b.open.includes(7));
  assert.ok(!neighbors(b, 12).includes(7));
});

test('wormhole pair are mutual neighbors', () => {
  const b = makeBoard(5, [], [0, 24]);
  assert.ok(neighbors(b, 0).includes(24));
  assert.ok(neighbors(b, 24).includes(0));
  assert.ok(adjacent(b, 0, 24));
  assert.ok(!adjacent(b, 0, 23));
});

test('parityOk: checkerboard balance', () => {
  assert.ok(parityOk(makeBoard(5)));            // 13/12, odd count, diff 1
  assert.ok(parityOk(makeBoard(5, [0])));       // 12/12, even count, diff 0
  assert.ok(!parityOk(makeBoard(5, [1])));      // 13/11, even count, diff 2
  assert.ok(!parityOk(makeBoard(6, [0, 2, 4]))); // removed 3 same-color: 15/18
  assert.ok(parityOk(makeBoard(6, [0, 8, 21]))); // 16/17, odd count, diff 1
  assert.ok(parityOk(makeBoard(5, [1], [0, 24]))); // wormhole skips the check
});

test('generatePath: valid Hamiltonian path on plain 5x5', () => {
  const b = makeBoard(5);
  const p = generatePath(b, mulberry32(42));
  assert.ok(p);
  assert.ok(pathIsValid(b, p));
});

test('generatePath: works with holes and with a wormhole', () => {
  const holed = makeBoard(6, [0, 8, 21]);
  const p1 = generatePath(holed, mulberry32(1));
  assert.ok(p1 && pathIsValid(holed, p1));
  assert.equal(p1.length, 33);

  const wormy = makeBoard(5, [], [2, 22]);
  const p2 = generatePath(wormy, mulberry32(5));
  assert.ok(p2 && pathIsValid(wormy, p2));
});

test('generatePath is deterministic per seed', () => {
  const b = makeBoard(7);
  assert.deepEqual(generatePath(b, mulberry32(99)), generatePath(b, mulberry32(99)));
});

test('pathIsValid rejects bad paths', () => {
  const b = makeBoard(5);
  const good = generatePath(b, mulberry32(3));
  assert.ok(!pathIsValid(b, good.slice(1)));            // wrong length
  assert.ok(!pathIsValid(b, [...Array(25).keys()]));    // 0..24 row-major: cell 4 -> 5 not adjacent
  const dup = good.slice(); dup[3] = dup[5];
  assert.ok(!pathIsValid(b, dup));                      // duplicate cell
});

test('generatePath succeeds across many seeds', () => {
  const b = makeBoard(5);
  for (let s = 0; s < 50; s++) {
    const p = generatePath(b, mulberry32(s));
    assert.ok(p && pathIsValid(b, p), `seed ${s}`);
  }
});

test('countSolutions: fully-clued board has exactly one solution', () => {
  const b = makeBoard(5);
  const path = generatePath(b, mulberry32(8));
  const all = new Map(path.map((cell, i) => [i + 1, cell]));
  assert.equal(countSolutions(b, all, [path[0]], 2), 1);
});

test('countSolutions: clue-1-only board hits the cap', () => {
  const b = makeBoard(5);
  const path = generatePath(b, mulberry32(8));
  assert.equal(countSolutions(b, new Map([[1, path[0]]]), [path[0]], 2), 2);
});

test('countSolutions: prefix of the real solution stays solvable', () => {
  const b = makeBoard(5);
  const path = generatePath(b, mulberry32(8));
  const all = new Map(path.map((cell, i) => [i + 1, cell]));
  assert.equal(countSolutions(b, all, path.slice(0, 10), 2), 1);
});

test('countSolutions: dead-end prefix yields 0', () => {
  // 3x3 grid, clue 1 at cell 0 and clue 9 at cell 8.
  // Chain 1@0, 2@1, 3@4 can no longer cover all cells ending at 8.
  const b = makeBoard(3);
  const cluesMap = new Map([[1, 0], [9, 8]]);
  assert.equal(countSolutions(b, cluesMap, [0, 1, 4], 2), 0);
  assert.ok(countSolutions(b, cluesMap, [0], 2) >= 1);
});

test('selectClues: both sets unique, 1 always present, normal extends hard', () => {
  const b = makeBoard(5);
  const rand = mulberry32(hashString('clue-test'));
  const path = generatePath(b, rand);
  const { hard, normal } = selectClues(b, path, 4, rand);

  assert.ok(hard.has(1) && normal.has(1));
  assert.ok(hard.size < 25, 'greedy removal actually removed clues');
  assert.equal(normal.size, hard.size + 4);
  for (const [num, cell] of hard) {
    assert.equal(cell, path[num - 1]);
    assert.equal(normal.get(num), cell);
  }
  assert.equal(countSolutions(b, hard, [path[0]], 2), 1);
  assert.equal(countSolutions(b, normal, [path[0]], 2), 1);
});
