export function runtimeConfig() {
  const cfg = globalThis.window?.YODUKU_CONFIG ?? {};
  return {
    supabaseUrl: normalizeSupabaseUrl(cfg.SUPABASE_URL ?? ''),
    supabaseAnonKey: cfg.SUPABASE_ANON_KEY ?? '',
  };
}

function normalizeSupabaseUrl(value) {
  const url = String(value).trim();
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
