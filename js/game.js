import { neighbors, countSolutions } from './engine.js';

export function createGame(puzzle, mode = 'normal') {
  return {
    puzzle,
    mode,
    player: new Map(), // number -> cell, player placements only
    checks: 0,
    startedAt: null,
    solvedAt: null,
    solved: false,
  };
}

export function clues(game) {
  return game.mode === 'hard' ? game.puzzle.hardClues : game.puzzle.normalClues;
}

// number -> { cell, clue } for everything currently on the board
export function placedMap(game) {
  const m = new Map();
  for (const [num, cell] of clues(game)) m.set(num, { cell, clue: true });
  for (const [num, cell] of game.player) if (!m.has(num)) m.set(num, { cell, clue: false });
  return m;
}

export function chainHead(game) {
  const m = placedMap(game);
  const board = game.puzzle.board;
  let { cell } = m.get(1); // clue 1 always exists
  let num = 1;
  for (;;) {
    const next = m.get(num + 1);
    if (!next || !neighbors(board, cell).includes(next.cell)) break;
    cell = next.cell;
    num++;
  }
  return { num, cell };
}

export function chainCells(game) {
  const m = placedMap(game);
  const { num } = chainHead(game);
  const cells = [];
  for (let i = 1; i <= num; i++) cells.push(m.get(i).cell);
  return cells;
}

export function clickCell(game, cell) {
  if (game.solved) return { type: 'ignored' };
  const board = game.puzzle.board;
  if (board.blocked.has(cell)) return { type: 'ignored' };

  const clueMap = clues(game);
  for (const c of clueMap.values()) if (c === cell) return { type: 'rejected' };

  for (const [num, c] of game.player) {
    if (c === cell) {
      for (const n of [...game.player.keys()]) if (n >= num) game.player.delete(n);
      return { type: 'truncated', num };
    }
  }

  const head = chainHead(game);
  const nextNum = head.num + 1;
  if (nextNum > board.cellCount) return { type: 'ignored' };
  if (clueMap.has(nextNum)) return { type: 'rejected' }; // must connect to the clue itself
  if (!neighbors(board, head.cell).includes(cell)) return { type: 'rejected' };

  game.player.set(nextNum, cell);
  if (game.startedAt === null) game.startedAt = Date.now();
  if (chainHead(game).num === board.cellCount) {
    game.solved = true;
    game.solvedAt = Date.now();
    return { type: 'won', num: nextNum };
  }
  return { type: 'placed', num: nextNum };
}

export function lifeline(game) {
  game.checks++;
  return countSolutions(game.puzzle.board, clues(game), chainCells(game), 1) > 0;
}

export function setMode(game, mode) {
  if (game.mode === mode || game.solved) return;
  game.mode = mode;
  const clueMap = clues(game);
  const clueCells = new Set(clueMap.values());
  for (const [num, cell] of [...game.player]) {
    if (clueMap.has(num) || clueCells.has(cell)) game.player.delete(num);
  }
  const head = chainHead(game).num;
  for (const n of [...game.player.keys()]) if (n > head) game.player.delete(n);
}

export function serialize(game, dateStr) {
  return JSON.stringify({
    date: dateStr,
    mode: game.mode,
    player: [...game.player],
    checks: game.checks,
    startedAt: game.startedAt,
    solvedAt: game.solvedAt,
    solved: game.solved,
  });
}

export function restore(puzzle, json, dateStr) {
  if (!json) return null;
  try {
    const data = JSON.parse(json);
    if (!data || data.date !== dateStr) return null;
    const game = createGame(puzzle, data.mode === 'hard' ? 'hard' : 'normal');
    game.checks = data.checks | 0;
    game.startedAt = data.startedAt ?? null;
    game.solvedAt = data.solvedAt ?? null;
    const clueMap = clues(game);
    const clueCells = new Set(clueMap.values());
    for (const [num, cell] of data.player ?? []) {
      if (!Number.isInteger(num) || !Number.isInteger(cell)) return null;
      if (clueMap.has(num) || clueCells.has(cell)) return null;
      game.player.set(num, cell);
    }
    const head = chainHead(game).num;
    for (const n of [...game.player.keys()]) if (n > head) game.player.delete(n);
    game.solved = !!data.solved && chainHead(game).num === puzzle.board.cellCount;
    return game;
  } catch {
    return null;
  }
}
