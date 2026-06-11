import test from 'node:test';
import assert from 'node:assert/strict';
import { runtimeConfig } from '../js/config.js';

test('runtimeConfig normalizes a bare Supabase host to https URL', () => {
  const previousWindow = globalThis.window;
  globalThis.window = {
    YODUKU_CONFIG: {
      SUPABASE_URL: 'example.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key',
    },
  };

  try {
    assert.deepEqual(runtimeConfig(), {
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'anon-key',
    });
  } finally {
    globalThis.window = previousWindow;
  }
});
