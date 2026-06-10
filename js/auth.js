import { runtimeConfig } from './config.js';

const SUPABASE_SDK_URL = 'https://esm.sh/@supabase/supabase-js@2';

export function createAuth(config = runtimeConfig()) {
  let clientPromise = null;
  let session = null;
  const enabled = !!(config.supabaseUrl && config.supabaseAnonKey);

  async function getClient() {
    if (!enabled) return null;
    if (!clientPromise) {
      clientPromise = import(SUPABASE_SDK_URL).then(({ createClient }) =>
        createClient(config.supabaseUrl, config.supabaseAnonKey, {
          auth: { persistSession: true, autoRefreshToken: true },
        })
      );
    }
    return clientPromise;
  }

  return {
    enabled,

    get session() {
      return session;
    },

    get user() {
      return session?.user ?? null;
    },

    async init() {
      const client = await getClient();
      if (!client) return null;
      const { data } = await client.auth.getSession();
      session = data.session ?? null;
      client.auth.onAuthStateChange((_event, nextSession) => {
        session = nextSession;
      });
      return session;
    },

    getClient,

    async signInWithOtp(email) {
      const client = await getClient();
      if (!client) throw new Error('Supabase is not configured.');
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: globalThis.location?.origin },
      });
      if (error) throw error;
    },

    async signOut() {
      const client = await getClient();
      if (!client) return;
      await client.auth.signOut();
      session = null;
    },

    async accessToken() {
      const client = await getClient();
      if (!client) return null;
      const { data } = await client.auth.getSession();
      session = data.session ?? null;
      return session?.access_token ?? null;
    },
  };
}
