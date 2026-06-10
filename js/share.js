export function shareText(puzzle, number, { solved, seconds, checks, hard }) {
  const board = puzzle.board;
  const clueCells = new Set((hard ? puzzle.hardClues : puzzle.normalClues).values());
  const lines = [];
  for (let r = 0; r < board.size; r++) {
    let line = '';
    for (let c = 0; c < board.size; c++) {
      const cell = r * board.size + c;
      if (board.blocked.has(cell)) line += '🟫';
      else if (board.wormhole && (cell === board.wormhole[0] || cell === board.wormhole[1])) line += '🟪';
      else if (clueCells.has(cell)) line += '🟨';
      else line += '⬛';
    }
    lines.push(line);
  }
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const checksLabel = `${checks} ${checks === 1 ? 'check' : 'checks'}`;
  const head = `Yoduku #${number} ${solved ? '✅' : '❌'} ${time} · ${checksLabel}${hard ? '*' : ''}`;
  return [head, ...lines].join('\n');
}
