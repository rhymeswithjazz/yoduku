export const STATE_KEY = 'yoduku-state';
export const STATS_KEY = 'yoduku-stats';
const UPLOADED_PREFIX = 'yoduku-uploaded-solve-';

export function createBrowserLocalStore(storage = globalThis.localStorage) {
  return {
    getItem(key) {
      try { return storage.getItem(key); } catch { return null; }
    },
    setItem(key, value) {
      try { storage.setItem(key, value); } catch { /* private mode: ignore */ }
    },
    removeItem(key) {
      try { storage.removeItem(key); } catch { /* private mode: ignore */ }
    },
  };
}

export function createMemoryLocalStore(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

export function createGameStorage({ local = createBrowserLocalStore(), cloud = null, now = () => new Date() } = {}) {
  return {
    async load(date) {
      const localProgress = localProgressFor(local, date);
      let cloudProgress = null;
      let cloudStats = null;

      if (cloud?.isSignedIn?.()) {
        cloudProgress = await cloud.loadProgress(date);
        cloudStats = await cloud.loadStats();
      }

      const picked = chooseProgress(localProgress, cloudProgress);
      if (picked.source === 'cloud') {
        local.setItem(STATE_KEY, picked.progress.state);
      }

      const stats = cloudStats ?? readStats(local);
      if (cloudStats) local.setItem(STATS_KEY, JSON.stringify(cloudStats));

      if (cloud?.isSignedIn?.() && localProgress && !cloudProgress && isSolvedState(localProgress.state)) {
        await uploadSolvedLocalOnce(local, cloud, date, localProgress.state);
      }

      return {
        state: picked.progress?.state ?? null,
        stats,
        source: picked.source,
      };
    },

    async save(date, state, stats) {
      local.setItem(STATE_KEY, state);
      local.setItem(STATS_KEY, JSON.stringify(stats));
      if (cloud?.isSignedIn?.()) {
        const updatedAt = now().toISOString();
        await cloud.saveProgress(date, state, updatedAt);
        await cloud.saveStats(stats);
      }
    },
  };
}

export function createSupabaseCloudStore(auth) {
  return {
    isSignedIn() {
      return !!auth.user;
    },

    async loadProgress(date) {
      const client = await auth.getClient();
      const user = auth.user;
      if (!client || !user) return null;
      const { data, error } = await client
        .from('game_progress')
        .select('state, updated_at')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { date, state: JSON.stringify(data.state), updatedAt: data.updated_at };
    },

    async saveProgress(date, state, updatedAt) {
      const client = await auth.getClient();
      const user = auth.user;
      if (!client || !user) return;
      const parsed = JSON.parse(state);
      const { error } = await client.from('game_progress').upsert({
        user_id: user.id,
        date,
        mode: parsed.mode,
        player: parsed.player ?? [],
        checks: parsed.checks ?? 0,
        started_at_ms: parsed.startedAt,
        solved_at_ms: parsed.solvedAt,
        solved: !!parsed.solved,
        state: parsed,
        updated_at: updatedAt,
      }, { onConflict: 'user_id,date' });
      if (error) throw error;
    },

    async loadStats() {
      const client = await auth.getClient();
      const user = auth.user;
      if (!client || !user) return null;
      const { data, error } = await client
        .from('user_stats')
        .select('stats')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.stats ?? null;
    },

    async saveStats(stats) {
      const client = await auth.getClient();
      const user = auth.user;
      if (!client || !user) return;
      const { error } = await client.from('user_stats').upsert({
        user_id: user.id,
        stats,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (error) throw error;
    },
  };
}

export function chooseProgress(localProgress, cloudProgress) {
  if (!localProgress && !cloudProgress) return { source: 'none', progress: null };
  if (!localProgress) return { source: 'cloud', progress: cloudProgress };
  if (!cloudProgress) return { source: 'local', progress: localProgress };

  const localTime = Date.parse(localProgress.updatedAt ?? '') || 0;
  const cloudTime = Date.parse(cloudProgress.updatedAt ?? '') || 0;
  return cloudTime > localTime
    ? { source: 'cloud', progress: cloudProgress }
    : { source: 'local', progress: localProgress };
}

function localProgressFor(local, date) {
  const state = local.getItem(STATE_KEY);
  if (!state) return null;
  try {
    const parsed = JSON.parse(state);
    if (parsed?.date !== date) return null;
    return { date, state, updatedAt: parsed.updatedAt ?? null };
  } catch {
    return null;
  }
}

function readStats(local) {
  const stats = local.getItem(STATS_KEY);
  if (!stats) return null;
  try {
    return JSON.parse(stats);
  } catch {
    return null;
  }
}

function isSolvedState(state) {
  try {
    return JSON.parse(state)?.solved === true;
  } catch {
    return false;
  }
}

async function uploadSolvedLocalOnce(local, cloud, date, state) {
  const key = `${UPLOADED_PREFIX}${date}`;
  if (local.getItem(key)) return;
  await cloud.saveProgress(date, state, new Date().toISOString());
  local.setItem(key, '1');
}
