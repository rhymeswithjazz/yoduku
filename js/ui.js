import { placedMap, chainHead, chainCells } from './game.js';

const VB = 1000; // svg viewBox edge
const GAP = 15;  // VB * 1.5% — keep in sync with .board gap

let cells = [];

export function buildBoard(ctx, onCellClick) {
  const { board } = ctx.game.puzzle;
  const el = document.getElementById('board');
  el.style.setProperty('--n', board.size);
  document.getElementById('chain-svg').setAttribute('viewBox', `0 0 ${VB} ${VB}`);
  cells = [];
  for (let i = 0; i < board.size * board.size; i++) {
    const btn = document.createElement('button');
    btn.className = 'cell';
    btn.dataset.cell = i;
    el.appendChild(btn);
    cells.push(btn);
  }
  el.addEventListener('click', (e) => {
    const target = e.target.closest('.cell');
    if (target) onCellClick(Number(target.dataset.cell));
  });
}

export function cellEl(cell) {
  return cells[cell];
}

export function render(ctx) {
  const game = ctx.game;
  const { board } = game.puzzle;
  const byCell = new Map();
  for (const [num, info] of placedMap(game)) byCell.set(info.cell, { num, clue: info.clue });
  const head = chainHead(game);

  for (let i = 0; i < cells.length; i++) {
    const btn = cells[i];
    btn.className = 'cell';
    btn.textContent = '';
    if (board.blocked.has(i)) { btn.classList.add('blocked'); btn.disabled = true; continue; }
    btn.disabled = game.solved;
    if (board.wormhole && (board.wormhole[0] === i || board.wormhole[1] === i)) btn.classList.add('worm');
    const entry = byCell.get(i);
    if (entry) {
      btn.textContent = entry.num;
      btn.classList.add(entry.clue ? 'clue' : 'filled');
    }
  }
  if (!game.solved) cells[head.cell].classList.add('head');

  drawChain(ctx);
  document.getElementById('checks-used').textContent = game.checks ? `${game.checks} ✓` : '';
  document.getElementById('btn-check').disabled = game.solved;
}

function drawChain(ctx) {
  const { board } = ctx.game.puzzle;
  const svg = document.getElementById('chain-svg');
  const chain = chainCells(ctx.game);
  const n = board.size;
  const w = (VB - (n - 1) * GAP) / n;
  const center = (cell) => [
    (cell % n) * (w + GAP) + w / 2,
    ((cell / n) | 0) * (w + GAP) + w / 2,
  ];
  let html = '';
  for (let i = 1; i < chain.length; i++) {
    const [x1, y1] = center(chain[i - 1]);
    const [x2, y2] = center(chain[i]);
    if (isOrtho(chain[i - 1], chain[i], n)) {
      html += `<line class="link" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    } else {
      // wormhole jump: dashed arc bowed perpendicular to the segment
      const mx = (x1 + x2) / 2 + (y2 - y1) * 0.18;
      const my = (y1 + y2) / 2 - (x2 - x1) * 0.18;
      html += `<path class="jump" d="M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}"/>`;
    }
  }
  svg.innerHTML = html;
}

function isOrtho(a, b, n) {
  return Math.abs(((a / n) | 0) - ((b / n) | 0)) + Math.abs((a % n) - (b % n)) === 1;
}

export function buildLabel(ctx) {
  const d = new Date(ctx.dateStr + 'T12:00:00');
  const fmt = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const board = ctx.game.puzzle.board;
  const tags = [];
  if (board.wormhole) tags.push('wormhole day');
  if (board.blocked.size) tags.push('obstructed sky');
  document.getElementById('puzzle-label').textContent =
    `No. ${ctx.number} · ${fmt}${tags.length ? ' · ' + tags.join(' · ') : ''}`;
}
