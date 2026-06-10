import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, hashString } from '../js/rng.js';
import { makeBoard, neighbors, adjacent, parityOk } from '../js/engine.js';

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
