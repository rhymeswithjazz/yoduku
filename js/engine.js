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
  for (const cell of board.open) (cellColor(board, cell) === 0 ? dark++ : light++);
  const diff = Math.abs(dark - light);
  return board.cellCount % 2 === 0 ? diff === 0 : diff === 1;
}

// Returns null when the budget is exhausted or no path exists from the chosen
// start — callers retry with fresh randomness (see generatePuzzle).
export function generatePath(board, rand, budget = 200000) {
  const total = board.cellCount;
  const starts = startCandidates(board);
  const start = starts[(rand() * starts.length) | 0];
  const path = [start];
  const visited = new Set([start]);
  const state = { nodes: 0 };
  if (extendPath(board, rand, path, visited, total, state, budget)) return path;
  return null;
}

// On a bipartite grid (no wormhole), a Hamiltonian path over an odd number of
// cells must start and end on the majority color; with unequal colors and an
// even count no path exists at all (parityOk catches that). Restricting starts
// to the majority color turns ~half of all attempts from guaranteed failures
// into hits.
function startCandidates(board) {
  if (board.wormhole) return board.open;
  let dark = 0, light = 0;
  for (const cell of board.open) (cellColor(board, cell) === 0 ? dark++ : light++);
  if (dark === light) return board.open;
  const majority = dark > light ? 0 : 1;
  return board.open.filter((cell) => cellColor(board, cell) === majority);
}

function cellColor(board, cell) {
  const r = (cell / board.size) | 0;
  return (r + (cell % board.size)) % 2;
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

export function countSolutions(board, clues, prefix, limit = 2) {
  const total = board.cellCount;
  if (prefix.length === 0) return 0;
  const cellClue = new Map();
  for (const [num, cell] of clues) cellClue.set(cell, num);
  const visited = new Set(prefix);
  let count = 0;

  function step(cell, num) {
    if (num === total) { count++; return; }
    const want = clues.get(num + 1);
    for (const n of neighbors(board, cell)) {
      if (count >= limit) return;
      if (visited.has(n)) continue;
      if (want !== undefined ? n !== want : cellClue.has(n)) continue;
      visited.add(n);
      if (remainderConnected(board, visited, total)) step(n, num + 1);
      visited.delete(n);
    }
  }

  step(prefix[prefix.length - 1], prefix.length);
  return count;
}

export function selectClues(board, path, extraCount, rand) {
  const total = path.length;
  const clueOf = (num) => path[num - 1];
  const floor = Math.max(5, Math.ceil(total / 4));

  const hard = new Map();
  for (let num = 1; num <= total; num++) hard.set(num, clueOf(num));
  const order = shuffle([...hard.keys()].filter((n) => n !== 1), rand);
  for (const num of order) {
    if (hard.size <= floor) break;
    hard.delete(num);
    if (countSolutions(board, hard, [clueOf(1)], 2) !== 1) hard.set(num, clueOf(num));
  }

  const removed = [];
  for (let num = 2; num <= total; num++) if (!hard.has(num)) removed.push(num);
  const normal = new Map(hard);
  for (const num of shuffle(removed, rand).slice(0, extraCount)) normal.set(num, clueOf(num));
  return { hard, normal };
}
