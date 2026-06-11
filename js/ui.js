import { placedMap, chainHead, chainCells, clickCell, lifeline, setMode } from './game.js';
import { shareText } from './share.js';
import { getDailyLeaderboard, submissionFromGame } from './leaderboard.js';

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

export function initUI(ctx) {
  buildBoard(ctx, (cell) => handleClick(ctx, cell));
  buildLabel(ctx);
  wireControls(ctx);
  render(ctx);
  if (ctx.game.solved) openWin(ctx);
  setInterval(() => updateTimer(ctx), 1000);
  updateTimer(ctx);
}

function handleClick(ctx, cell) {
  const result = clickCell(ctx.game, cell);
  if (result.type === 'rejected') {
    const btn = cellEl(cell);
    btn.classList.add('shake');
    setTimeout(() => btn.classList.remove('shake'), 300);
    return;
  }
  if (result.type === 'ignored') return;
  ctx.save();
  render(ctx);
  updateTimer(ctx);
  if (result.type === 'won') {
    submitLeaderboardResult(ctx);
    celebrate(ctx);
  }
}

function celebrate(ctx) {
  const placed = placedMap(ctx.game);
  for (const [num, info] of placed) {
    const btn = cellEl(info.cell);
    btn.style.animationDelay = `${num * 28}ms`;
    btn.classList.add('won');
  }
  setTimeout(() => openWin(ctx), placed.size * 28 + 900);
}

function wireControls(ctx) {
  document.getElementById('btn-check').addEventListener('click', () => onCheck(ctx));
  document.getElementById('btn-help').addEventListener('click', () =>
    document.getElementById('modal-help').showModal());
  document.getElementById('btn-leaderboard').addEventListener('click', () => openLeaderboard(ctx));
  document.getElementById('btn-stats').addEventListener('click', () => openStats(ctx));
  document.getElementById('btn-settings').addEventListener('click', () => openSettings(ctx));
  document.getElementById('btn-share').addEventListener('click', () => share(ctx));
  wireAccount(ctx);
  for (const btn of document.querySelectorAll('[data-close]')) {
    btn.addEventListener('click', () => btn.closest('dialog').close());
  }
}

function onCheck(ctx) {
  if (ctx.game.solved) return;
  if (ctx.game.player.size === 0) { toast('Place a number first', ''); return; }
  const ok = lifeline(ctx.game);
  ctx.save();
  render(ctx);
  toast(ok ? 'Still charted — this can be completed' : 'Dead end — back up', ok ? 'good' : 'bad');
}

function openStats(ctx) {
  const s = ctx.stats;
  document.getElementById('st-played').textContent = s.played;
  document.getElementById('st-pct').textContent = s.played ? Math.round((s.solved / s.played) * 100) : 0;
  document.getElementById('st-streak').textContent = s.currentStreak;
  document.getElementById('st-max').textContent = s.maxStreak;
  const max = Math.max(1, ...Object.values(s.checkDist));
  document.getElementById('dist').innerHTML = ['0', '1', '2', '3+'].map((k) =>
    `<div class="dist-row"><span>${k}</span><div class="bar" style="width:${(s.checkDist[k] / max) * 100}%"></div><span>${s.checkDist[k]}</span></div>`
  ).join('');
  document.getElementById('modal-stats').showModal();
}

async function openLeaderboard(ctx) {
  const list = document.getElementById('leaderboard-list');
  list.innerHTML = '<p class="leaderboard-empty">Loading...</p>';
  document.getElementById('modal-leaderboard').showModal();
  try {
    const rows = await getDailyLeaderboard(ctx.auth, ctx.dateStr);
    if (!rows.length) {
      list.innerHTML = '<p class="leaderboard-empty">No signed-in solves yet today.</p>';
      return;
    }
    list.innerHTML = rows.map((row, index) => `
      <div class="leaderboard-row">
        <span class="rank">${index + 1}</span>
        <span class="name">${escapeHtml(row.display_name)}</span>
        <span class="meta">${row.checks} ${row.checks === 1 ? 'check' : 'checks'}</span>
        <span>${fmtTime(row.elapsed_seconds)}</span>
      </div>
    `).join('');
  } catch {
    list.innerHTML = '<p class="leaderboard-empty">Leaderboard is unavailable right now.</p>';
  }
}

function openSettings(ctx) {
  document.getElementById('hard-toggle').checked = ctx.game.mode === 'hard';
  updateAccountUI(ctx);
  document.getElementById('modal-settings').showModal();
}

export function wireSettings(ctx) {
  document.getElementById('hard-toggle').addEventListener('change', (e) => {
    setMode(ctx.game, e.target.checked ? 'hard' : 'normal');
    ctx.save();
    render(ctx);
    toast(e.target.checked ? 'Hard mode: extra clues hidden' : 'Normal mode', '');
  });
}

function wireAccount(ctx) {
  document.getElementById('account-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('account-email').value.trim();
    if (!email) return;
    try {
      await ctx.auth.signInWithOtp(email);
      toast('Check your email for a sign-in link', 'good');
    } catch (error) {
      console.error('Magic link sign-in failed:', error);
      toast(error?.message || 'Sign-in failed', 'bad');
    }
  });
  document.getElementById('btn-sign-out').addEventListener('click', async () => {
    await ctx.auth.signOut();
    location.reload();
  });
}

function updateAccountUI(ctx) {
  const status = document.getElementById('account-status');
  const form = document.getElementById('account-form');
  const signOut = document.getElementById('btn-sign-out');
  if (!ctx.auth.enabled) {
    status.textContent = 'Local play only. Add Supabase config to enable sign-in and leaderboard sync.';
    form.hidden = true;
    signOut.hidden = true;
    return;
  }
  if (ctx.auth.user) {
    status.textContent = `Signed in as ${ctx.auth.user.email ?? 'player'}.`;
    form.hidden = true;
    signOut.hidden = false;
    return;
  }
  status.textContent = 'Sign in with an email magic link to sync stats and appear on the daily leaderboard.';
  form.hidden = false;
  signOut.hidden = true;
}

async function submitLeaderboardResult(ctx) {
  if (!ctx.auth.user) return;
  const displayName = ctx.auth.user.email?.split('@')[0] ?? 'Player';
  const submission = submissionFromGame(ctx.game, ctx.dateStr, displayName);
  const result = await ctx.submitSolve(submission).catch(() => ({ ok: false }));
  if (result.ok) toast('Leaderboard updated', 'good');
}

function openWin(ctx) {
  const g = ctx.game;
  const seconds = Math.max(0, Math.round((g.solvedAt - g.startedAt) / 1000));
  document.getElementById('win-time').textContent = fmtTime(seconds);
  document.getElementById('win-checks').textContent = g.checks;
  document.getElementById('win-streak').textContent = ctx.stats.currentStreak;
  document.getElementById('modal-win').showModal();
}

async function share(ctx) {
  const g = ctx.game;
  const seconds = Math.max(0, Math.round((g.solvedAt - g.startedAt) / 1000));
  const text = shareText(g.puzzle, ctx.number, {
    solved: true, seconds, checks: g.checks, hard: g.mode === 'hard',
  });
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard', 'good');
  } catch {
    const box = document.getElementById('share-fallback');
    box.value = text;
    box.hidden = false;
    box.select();
  }
}

let toastTimer;
function toast(msg, kind) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function updateTimer(ctx) {
  const g = ctx.game;
  let secs = 0;
  if (g.startedAt) secs = Math.max(0, Math.round(((g.solved ? g.solvedAt : Date.now()) - g.startedAt) / 1000));
  document.getElementById('timer').textContent = fmtTime(secs);
}

function fmtTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
