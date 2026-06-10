export function emptyStats() {
  return {
    played: 0,
    solved: 0,
    currentStreak: 0,
    maxStreak: 0,
    checkDist: { 0: 0, 1: 0, 2: 0, '3+': 0 },
    lastPlayed: null,
    lastSolved: null,
  };
}

export function recordPlayed(stats, dateStr) {
  if (stats.lastPlayed === dateStr) return stats;
  stats.played++;
  stats.lastPlayed = dateStr;
  return stats;
}

export function recordSolved(stats, dateStr, checks) {
  if (stats.lastSolved === dateStr) return stats;
  stats.currentStreak = stats.lastSolved === prevDateString(dateStr) ? stats.currentStreak + 1 : 1;
  stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
  stats.solved++;
  stats.checkDist[checks >= 3 ? '3+' : String(checks)]++;
  stats.lastSolved = dateStr;
  return stats;
}

export function prevDateString(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
