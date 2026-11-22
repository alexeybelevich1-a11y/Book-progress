import type { AppState, Book, Chapter, ChapterStatus } from './types';

export const emptyState = (): AppState => ({
  version: 1,
  books: [],
  log: [],
  settings: { reminderEnabled: false, reminderTime: '20:00' },
});

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** YYYY-MM-DD in the user's local timezone. */
export function toLocalDate(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function makeChapters(count: number, titles: string[] = []): Chapter[] {
  return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, i) => ({
    number: i + 1,
    title: titles[i] ?? '',
    status: 'unread' as ChapterStatus,
  }));
}

export function createBook(input: {
  title: string;
  identifier?: string;
  authors?: string;
  chapterCount: number;
  chapterTitles?: string[];
}): Book {
  return {
    id: uid(),
    title: input.title.trim(),
    identifier: (input.identifier ?? '').trim(),
    authors: (input.authors ?? '').trim(),
    chapters: makeChapters(input.chapterCount, input.chapterTitles),
    createdAt: new Date().toISOString(),
  };
}

/** Grow or shrink the chapter list, keeping existing progress. */
export function resizeChapters(book: Book, count: number): Book {
  const n = Math.max(0, Math.floor(count));
  const kept = book.chapters.slice(0, n);
  const extra = makeChapters(n).slice(kept.length);
  return { ...book, chapters: [...kept, ...extra] };
}

export const nextStatus = (s: ChapterStatus): ChapterStatus =>
  s === 'unread' ? 'reading' : s === 'reading' ? 'done' : 'unread';

export function setChapterStatus(
  state: AppState,
  bookId: string,
  chapterNo: number,
  status: ChapterStatus,
  date: string = toLocalDate(),
): AppState {
  let changed = false;
  const books = state.books.map((b) => {
    if (b.id !== bookId) return b;
    return {
      ...b,
      chapters: b.chapters.map((c) => {
        if (c.number !== chapterNo || c.status === status) return c;
        changed = true;
        return { ...c, status, completedAt: status === 'done' ? date : undefined };
      }),
    };
  });
  if (!changed) return state;
  const log =
    status === 'unread'
      ? state.log
      : [...state.log, { id: uid(), bookId, chapter: chapterNo, status, date }];
  return { ...state, books, log };
}

export interface Progress {
  done: number;
  reading: number;
  total: number;
  percent: number;
}

export function bookProgress(book: Book): Progress {
  const total = book.chapters.length;
  const done = book.chapters.filter((c) => c.status === 'done').length;
  const reading = book.chapters.filter((c) => c.status === 'reading').length;
  return { done, reading, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

export function overallProgress(books: Book[]): Progress {
  const acc = books.map(bookProgress).reduce(
    (a, p) => ({ done: a.done + p.done, reading: a.reading + p.reading, total: a.total + p.total }),
    { done: 0, reading: 0, total: 0 },
  );
  return { ...acc, percent: acc.total ? Math.round((acc.done / acc.total) * 100) : 0 };
}

/** Consecutive days (ending today, or yesterday if nothing yet today) with any logged reading. */
export function readingStreak(log: { date: string }[], today: string = toLocalDate()): number {
  const days = new Set(log.map((e) => e.date));
  const d = new Date(`${today}T12:00:00`);
  if (!days.has(today)) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (days.has(toLocalDate(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export const readToday = (state: AppState, today: string = toLocalDate()) =>
  state.log.some((e) => e.date === today);
