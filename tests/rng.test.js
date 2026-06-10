import test from 'node:test';
import assert from 'node:assert/strict';
import { hashString, mulberry32, shuffle } from '../js/rng.js';

test('hashString is deterministic and 32-bit unsigned', () => {
  assert.equal(hashString('2026-06-10'), hashString('2026-06-10'));
  assert.notEqual(hashString('2026-06-10'), hashString('2026-06-11'));
  const h = hashString('anything');
  assert.ok(Number.isInteger(h) && h >= 0 && h <= 0xffffffff);
});

test('mulberry32 reproduces sequences and stays in [0,1)', () => {
  const a = mulberry32(123), b = mulberry32(123);
  for (let i = 0; i < 100; i++) {
    const v = a();
    assert.equal(v, b());
    assert.ok(v >= 0 && v < 1);
  }
});

test('shuffle is a seeded permutation and leaves the input untouched', () => {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8];
  const s1 = shuffle(arr, mulberry32(7));
  const s2 = shuffle(arr, mulberry32(7));
  assert.deepEqual(s1, s2);
  assert.deepEqual(arr, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual([...s1].sort((x, y) => x - y), arr);
});
