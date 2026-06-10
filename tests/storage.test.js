import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMemoryLocalStore,
  createGameStorage,
  chooseProgress,
} from '../js/storage.js';

function progress(date, updatedAt, solved = false) {
  return {
    date,
    state: JSON.stringify({ date, solved }),
    updatedAt,
  };
}

test('signed-out storage writes progress and stats only to local storage', async () => {
  const local = createMemoryLocalStore();
  const cloud = {
    isSignedIn: () => false,
    saveProgress: async () => { throw new Error('cloud should not be called'); },
    saveStats: async () => { throw new Error('cloud should not be called'); },
  };
  const storage = createGameStorage({ local, cloud });

  await storage.save('2026-06-10', '{"game":true}', { played: 1 });

  assert.equal(local.getItem('yoduku-state'), '{"game":true}');
  assert.deepEqual(JSON.parse(local.getItem('yoduku-stats')), { played: 1 });
});

test('chooseProgress prefers newer cloud progress over older local progress', () => {
  const picked = chooseProgress(
    progress('2026-06-10', '2026-06-10T10:00:00.000Z'),
    progress('2026-06-10', '2026-06-10T11:00:00.000Z'),
  );

  assert.equal(picked.source, 'cloud');
  assert.equal(picked.progress.updatedAt, '2026-06-10T11:00:00.000Z');
});

test('chooseProgress keeps local progress when cloud is older', () => {
  const picked = chooseProgress(
    progress('2026-06-10', '2026-06-10T12:00:00.000Z'),
    progress('2026-06-10', '2026-06-10T11:00:00.000Z'),
  );

  assert.equal(picked.source, 'local');
  assert.equal(picked.progress.updatedAt, '2026-06-10T12:00:00.000Z');
});

test('signed-in storage uploads a solved local state once after sign-in', async () => {
  const local = createMemoryLocalStore({
    'yoduku-state': JSON.stringify({ date: '2026-06-10', solved: true }),
    'yoduku-stats': JSON.stringify({ played: 1, solved: 1 }),
  });
  const uploads = [];
  const cloud = {
    isSignedIn: () => true,
    loadProgress: async () => null,
    loadStats: async () => null,
    saveProgress: async (date, state) => uploads.push({ date, state }),
    saveStats: async () => {},
  };
  const storage = createGameStorage({ local, cloud });

  await storage.load('2026-06-10');
  await storage.load('2026-06-10');

  assert.equal(uploads.length, 1);
  assert.equal(uploads[0].date, '2026-06-10');
});
