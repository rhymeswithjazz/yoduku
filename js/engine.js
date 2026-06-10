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
