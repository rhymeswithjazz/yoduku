export function runtimeConfig() {
  const cfg = globalThis.window?.YODUKU_CONFIG ?? {};
  return {
    supabaseUrl: cfg.SUPABASE_URL ?? '',
    supabaseAnonKey: cfg.SUPABASE_ANON_KEY ?? '',
  };
}
