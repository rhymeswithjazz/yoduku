import { validateSolveSubmission } from '../js/validation.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    res.status(405).json({ ok: false, reason: 'method-not-allowed' });
    return;
  }

  const env = readEnv();
  if (!env.ok) {
    res.status(500).json({ ok: false, reason: env.reason });
    return;
  }

  const token = bearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ ok: false, reason: 'missing-token' });
    return;
  }

  const user = await loadUser(env, token);
  if (!user?.id) {
    res.status(401).json({ ok: false, reason: 'invalid-token' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
  } catch {
    res.status(400).json({ ok: false, reason: 'invalid-json' });
    return;
  }
  const validation = validateSolveSubmission({
    ...body,
    displayName: body?.displayName || user.email?.split('@')[0] || 'Player',
  });
  if (!validation.ok) {
    res.status(400).json(validation);
    return;
  }

  const row = {
    user_id: user.id,
    ...validation.solve,
  };

  const saved = await upsertSolve(env, row);
  if (!saved.ok) {
    res.status(502).json(saved);
    return;
  }

  res.status(200).json({ ok: true, solve: saved.solve });
}

function readEnv() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return { ok: false, reason: 'supabase-not-configured' };
  return { ok: true, supabaseUrl, anonKey, serviceRoleKey };
}

function bearerToken(value = '') {
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

async function loadUser(env, token) {
  const response = await fetch(`${env.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: env.anonKey,
      authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) return null;
  return response.json();
}

async function upsertSolve(env, row) {
  const response = await fetch(`${env.supabaseUrl}/rest/v1/daily_solves?on_conflict=user_id,date`, {
    method: 'POST',
    headers: {
      apikey: env.serviceRoleKey,
      authorization: `Bearer ${env.serviceRoleKey}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(row),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) return { ok: false, reason: 'supabase-write-failed', detail: body };
  return { ok: true, solve: Array.isArray(body) ? body[0] : body };
}
