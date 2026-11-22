import { emptyState } from './progress';
import type { AppState } from './types';

const KEY = 'medread:v1';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s?.version === 1) return { ...emptyState(), ...s };
    }
  } catch {
    /* storage unavailable */
  }
  return emptyState();
}

export function saveState(s: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

export function parseBackup(text: string): AppState {
  const s = JSON.parse(text);
  if (s?.version !== 1 || !Array.isArray(s.books)) throw new Error('Not a MedRead backup file.');
  return { ...emptyState(), ...s };
}

export function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
