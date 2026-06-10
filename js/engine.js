import { shuffle } from './rng.js';

export function makeBoard(size, blocked = [], wormhole = null) {
  const blockedSet = new Set(blocked);
  const open = [];
  for (let i = 0; i < size * size; i++) if (!blockedSet.has(i)) open.push(i);
  return { size, blocked: blockedSet, wormhole, open, cellCount: open.length };
}

export function neighbors(board, cell) {
  const { size, blocked, wormhole } = board;
  const r = (cell / size) | 0;
  const c = cell % size;
  const out = [];
  if (r > 0) out.push(cell - size);
  if (r < size - 1) out.push(cell + size);
  if (c > 0) out.push(cell - 1);
  if (c < size - 1) out.push(cell + 1);
  const open = out.filter((n) => !blocked.has(n));
  if (wormhole) {
    if (cell === wormhole[0]) open.push(wormhole[1]);
    if (cell === wormhole[1]) open.push(wormhole[0]);
  }
  return open;
}

export function adjacent(board, a, b) {
  return neighbors(board, a).includes(b);
}

export function parityOk(board) {
  if (board.wormhole) return true; // wormhole may join same-colored cells
  let dark = 0, light = 0;
  for (const cell of board.open) {
    const r = (cell / board.size) | 0;
    if ((r + (cell % board.size)) % 2 === 0) dark++; else light++;
  }
  const diff = Math.abs(dark - light);
  return board.cellCount % 2 === 0 ? diff === 0 : diff === 1;
}

export function generatePath(board, rand, budget = 200000) {
  const total = board.cellCount;
  const start = board.open[(rand() * board.open.length) | 0];
  const path = [start];
  const visited = new Set([start]);
  const state = { nodes: 0 };
  if (extendPath(board, rand, path, visited, total, state, budget)) return path;
  return null;
}

function extendPath(board, rand, path, visited, total, state, budget) {
  if (path.length === total) return true;
  if (++state.nodes > budget) return false;
  const head = path[path.length - 1];
  const options = shuffle(neighbors(board, head).filter((c) => !visited.has(c)), rand);
  for (const n of options) {
    visited.add(n);
    path.push(n);
    if (remainderConnected(board, visited, total) &&
        extendPath(board, rand, path, visited, total, state, budget)) return true;
    path.pop();
    visited.delete(n);
  }
  return false;
}

function remainderConnected(board, visited, total) {
  const remaining = total - visited.size;
  if (remaining === 0) return true;
  let seed = -1;
  for (const c of board.open) if (!visited.has(c)) { seed = c; break; }
  const seen = new Set([seed]);
  const stack = [seed];
  while (stack.length) {
    for (const n of neighbors(board, stack.pop())) {
      if (!visited.has(n) && !seen.has(n)) { seen.add(n); stack.push(n); }
    }
  }
  return seen.size === remaining;
}

export function pathIsValid(board, path) {
  if (path.length !== board.cellCount) return false;
  if (new Set(path).size !== path.length) return false;
  for (const cell of path) {
    if (cell < 0 || cell >= board.size * board.size || board.blocked.has(cell)) return false;
  }
  for (let i = 1; i < path.length; i++) {
    if (!adjacent(board, path[i - 1], path[i])) return false;
  }
  return true;
}
