import { describe, expect, it } from 'vitest';
import { bookProgress, createBook, emptyState, overallProgress, readingStreak, resizeChapters, setChapterStatus } from './progress';
import { buildIcs, shouldRemind } from './reminder';

describe('progress', () => {
  it('tracks chapters out of order', () => {
    const b = createBook({ title: 'Harrison', chapterCount: 10 });
    let s = { ...emptyState(), books: [b] };
    s = setChapterStatus(s, b.id, 7, 'done', '2026-11-20');
    s = setChapterStatus(s, b.id, 2, 'reading', '2026-11-21');
    expect(bookProgress(s.books[0])).toEqual({ done: 1, reading: 1, total: 10, percent: 10 });
    expect(s.books[0].chapters[6].completedAt).toBe('2026-11-20');
    expect(s.log).toHaveLength(2);
  });

  it('does not log no-op changes or un-marking', () => {
    const b = createBook({ title: 'x', chapterCount: 2 });
    let s = setChapterStatus({ ...emptyState(), books: [b] }, b.id, 1, 'unread');
    expect(s.log).toHaveLength(0);
    s = setChapterStatus(s, b.id, 1, 'done');
    s = setChapterStatus(s, b.id, 1, 'unread');
    expect(s.log).toHaveLength(1);
    expect(s.books[0].chapters[0].completedAt).toBeUndefined();
  });

  it('aggregates overall progress by chapter', () => {
    const a = createBook({ title: 'a', chapterCount: 4 });
    const b = createBook({ title: 'b', chapterCount: 6 });
    a.chapters[0].status = 'done';
    b.chapters[0].status = 'done';
    expect(overallProgress([a, b]).percent).toBe(20);
  });

  it('resizes preserving progress', () => {
    const b = createBook({ title: 'a', chapterCount: 3, chapterTitles: ['A', 'B', 'C'] });
    b.chapters[1].status = 'done';
    const r = resizeChapters(b, 5);
    expect(r.chapters.map((c) => c.number)).toEqual([1, 2, 3, 4, 5]);
    expect(r.chapters[1].status).toBe('done');
    expect(resizeChapters(b, 2).chapters).toHaveLength(2);
  });

  it('computes streaks', () => {
    const log = ['2026-11-19', '2026-11-20', '2026-11-21'].map((date) => ({ date }));
    expect(readingStreak(log, '2026-11-21')).toBe(3);
    expect(readingStreak(log, '2026-11-22')).toBe(3); // today not read yet: streak still alive
    expect(readingStreak(log, '2026-11-23')).toBe(0);
  });
});

describe('reminder', () => {
  const settings = { reminderEnabled: true, reminderTime: '20:00' };
  const at = (h: number, m = 0) => new Date(2026, 10, 22, h, m);
  it('fires after the set time once a day when unread', () => {
    expect(shouldRemind(settings, at(19, 59), '2026-11-22', undefined, false)).toBe(false);
    expect(shouldRemind(settings, at(20, 0), '2026-11-22', undefined, false)).toBe(true);
    expect(shouldRemind(settings, at(21), '2026-11-22', '2026-11-22', false)).toBe(false);
    expect(shouldRemind(settings, at(21), '2026-11-22', undefined, true)).toBe(false);
    expect(shouldRemind({ ...settings, reminderEnabled: false }, at(21), '2026-11-22', undefined, false)).toBe(false);
  });
  it('builds a daily ics event', () => {
    const ics = buildIcs('07:30', new Date(2026, 10, 22));
    expect(ics).toContain('DTSTART:20261122T073000');
    expect(ics).toContain('RRULE:FREQ=DAILY');
  });
});
