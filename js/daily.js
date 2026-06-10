export const EPOCH = '2026-06-10';

// Keyed by Date#getDay(): 0=Sun .. 6=Sat. All tuning constants live here.
export const SCHEDULE = {
  1: { size: 5, holes: 0, wormhole: false, extraClues: 6 }, // Mon
  2: { size: 5, holes: 0, wormhole: false, extraClues: 4 }, // Tue
  3: { size: 5, holes: 0, wormhole: true,  extraClues: 3 }, // Wed — wormhole day
  4: { size: 6, holes: 0, wormhole: false, extraClues: 6 }, // Thu
  5: { size: 6, holes: 0, wormhole: false, extraClues: 4 }, // Fri
  6: { size: 6, holes: 3, wormhole: false, extraClues: 4 }, // Sat
  0: { size: 7, holes: 3, wormhole: false, extraClues: 5 }, // Sun
};

export function localDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function puzzleNumber(dateStr) {
  const ms = Date.parse(dateStr + 'T00:00:00Z') - Date.parse(EPOCH + 'T00:00:00Z');
  return Math.round(ms / 86400000) + 1;
}

export function configFor(dateStr) {
  const weekday = new Date(dateStr + 'T12:00:00').getDay();
  return SCHEDULE[weekday];
}
