export async function getDailyLeaderboard(auth, date) {
  const client = await auth.getClient();
  if (!client) return [];
  const { data, error } = await client
    .from('daily_solves')
    .select('display_name, mode, checks, elapsed_seconds, solved_at')
    .eq('date', date)
    .order('checks', { ascending: true })
    .order('elapsed_seconds', { ascending: true })
    .order('solved_at', { ascending: true })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function submitSolve(auth, submission) {
  const token = await auth.accessToken();
  if (!token) return { ok: false, reason: 'signed-out' };
  const response = await fetch('/api/submit-solve', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(submission),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, reason: body.reason ?? 'submit-failed' };
  return { ok: true, solve: body.solve };
}

export function submissionFromGame(game, date, displayName) {
  return {
    date,
    mode: game.mode,
    player: [...game.player],
    checks: game.checks,
    startedAt: game.startedAt,
    solvedAt: game.solvedAt,
    displayName,
  };
}
