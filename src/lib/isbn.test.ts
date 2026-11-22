import { describe, expect, it } from 'vitest';
import { countChapters, lookupIsbn, normalizeIsbn } from './isbn';

const res = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body });

describe('normalizeIsbn', () => {
  it('accepts hyphenated ISBN-13', () => expect(normalizeIsbn('978-0-306-40615-7')).toBe('9780306406157'));
  it('converts ISBN-10 to 13', () => expect(normalizeIsbn('0-306-40615-2')).toBe('9780306406157'));
  it('handles X check digit', () => expect(normalizeIsbn('080442957X')).toBe('9780804429573'));
  it('rejects bad checksum', () => expect(normalizeIsbn('9780306406158')).toBeNull());
  it('rejects junk', () => expect(normalizeIsbn('hello')).toBeNull());
});

describe('countChapters', () => {
  it('counts explicitly labelled chapters and skips front matter', () => {
    const toc = [
      { level: 0, title: 'Preface' },
      { level: 0, title: 'Part I: Cardiology' },
      { level: 1, label: 'Chapter 1', title: 'Heart Failure' },
      { level: 1, label: 'Chapter 2', title: 'Arrhythmias' },
      { level: 0, title: 'Part II: Nephrology' },
      { level: 1, label: 'Chapter 3', title: 'AKI' },
      { level: 0, title: 'Index' },
    ];
    expect(countChapters(toc)).toEqual({ count: 3, titles: ['Heart Failure', 'Arrhythmias', 'AKI'] });
  });

  it('uses the level below Part headings when chapters are unlabelled', () => {
    const toc = [
      { level: 0, title: 'Foreword' },
      { level: 0, title: 'Section 1 Basics' },
      { level: 1, title: 'Cell injury' },
      { level: 1, title: 'Inflammation' },
      { level: 2, title: 'Acute inflammation' },
      { level: 0, title: 'Section 2 Systems' },
      { level: 1, title: 'Blood vessels' },
      { level: 0, title: 'Index' },
    ];
    expect(countChapters(toc)?.count).toBe(3);
  });

  it('handles flat numbered lists', () => {
    const toc = [{ title: '1. Anatomy' }, { title: '2. Physiology' }, { title: 'Index' }];
    expect(countChapters(toc)).toEqual({ count: 2, titles: ['Anatomy', 'Physiology'] });
  });

  it('returns null when empty', () => expect(countChapters(undefined)).toBeNull());
});

describe('lookupIsbn', () => {
  const isbn = '9780306406157';

  it('combines title + subtitle and counts TOC from Open Library', async () => {
    const fetchFn = async (url: string) => {
      if (url.includes('api/books')) {
        return res({
          [`ISBN:${isbn}`]: {
            title: 'Robbins Basic Pathology',
            subtitle: 'Tenth Edition',
            authors: [{ name: 'Vinay Kumar' }],
            number_of_pages: 935,
            table_of_contents: [
              { level: 0, label: '1', title: 'The Cell' },
              { level: 0, label: '2', title: 'Inflammation' },
            ],
          },
        });
      }
      throw new Error('unexpected ' + url);
    };
    const r = await lookupIsbn('978-0-306-40615-7', fetchFn);
    expect(r.title).toBe('Robbins Basic Pathology: Tenth Edition');
    expect(r.authors).toEqual(['Vinay Kumar']);
    expect(r.chapterCount).toBe(2);
    expect(r.sources).toEqual(['Open Library']);
  });

  it('falls back to Google Books when Open Library has nothing', async () => {
    const calls: string[] = [];
    const fetchFn = async (url: string) => {
      calls.push(url);
      if (url.includes('api/books')) return res({});
      if (url.includes('/isbn/')) return res({}, false, 404);
      return res({ items: [{ volumeInfo: { title: 'Guyton', subtitle: 'Medical Physiology', authors: ['Hall'], pageCount: 1152 } }] });
    };
    const r = await lookupIsbn(isbn, fetchFn, { googleApiKey: 'k' });
    expect(r.title).toBe('Guyton: Medical Physiology');
    expect(r.chapterCount).toBeUndefined();
    expect(r.pages).toBe(1152);
    expect(calls.at(-1)).toContain('&key=k');
  });

  it('throws on invalid ISBN without calling the network', async () => {
    await expect(lookupIsbn('123', async () => { throw new Error('no'); })).rejects.toThrow(/valid ISBN/);
  });

  it('reports source errors when nothing found', async () => {
    await expect(lookupIsbn(isbn, async () => res({}, false, 503))).rejects.toThrow(/503/);
  });
});
