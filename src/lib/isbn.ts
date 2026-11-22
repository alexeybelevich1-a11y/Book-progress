/**
 * ISBN lookup: full title, authors and chapter count.
 * Sources (both free, CORS-enabled, no key required):
 *   1. Open Library  – title, subtitle, authors and (often) table of contents
 *   2. Google Books  – fallback for title / authors / page count
 */

export interface IsbnResult {
  isbn13: string;
  title: string;
  authors: string[];
  publisher?: string;
  publishDate?: string;
  pages?: number;
  /** Undefined when no table of contents was found – the user must enter it. */
  chapterCount?: number;
  chapterTitles: string[];
  sources: string[];
}

type Fetch = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>;

const digits = (s: string) => s.replace(/[^0-9Xx]/g, '').toUpperCase();

function validIsbn10(s: string): boolean {
  if (!/^\d{9}[\dX]$/.test(s)) return false;
  const sum = [...s].reduce((a, ch, i) => a + (ch === 'X' ? 10 : +ch) * (10 - i), 0);
  return sum % 11 === 0;
}

function validIsbn13(s: string): boolean {
  if (!/^\d{13}$/.test(s)) return false;
  const sum = [...s].reduce((a, ch, i) => a + +ch * (i % 2 ? 3 : 1), 0);
  return sum % 10 === 0;
}

function isbn10to13(s: string): string {
  const core = '978' + s.slice(0, 9);
  const sum = [...core].reduce((a, ch, i) => a + +ch * (i % 2 ? 3 : 1), 0);
  return core + ((10 - (sum % 10)) % 10);
}

/** Returns a normalized ISBN-13, or null if the input is not a valid ISBN. */
export function normalizeIsbn(input: string): string | null {
  const s = digits(input);
  if (s.length === 13 && validIsbn13(s)) return s;
  if (s.length === 10 && validIsbn10(s)) return isbn10to13(s);
  return null;
}

interface TocEntry {
  level?: number;
  label?: string;
  title?: string;
}

const FRONT_BACK_MATTER =
  /^(contents|table of contents|preface|foreword|acknowledg|dedication|introduction to the .* edition|contributors|abbreviations|index|glossary|references|bibliography|appendi|answers|credits|about the author|copyright|title page|half title|list of)/i;
const PART_HEADING = /^(part|section|unit|volume)\b/i;

/**
 * Count chapters in an Open Library table of contents.
 * Medical textbooks are usually Part → Chapter, so we prefer entries explicitly
 * labelled "Chapter N" / numbered, and otherwise take the deepest level that isn't
 * front/back matter or a Part/Section heading.
 */
export function countChapters(toc: TocEntry[] | undefined): { count: number; titles: string[] } | null {
  if (!toc?.length) return null;
  const entries = toc
    .map((e) => ({ level: e.level ?? 0, label: (e.label ?? '').trim(), title: (e.title ?? '').trim() }))
    .filter((e) => e.title || e.label);

  const text = (e: { label: string; title: string }) => `${e.label} ${e.title}`.trim();
  const isChapterish = (e: { label: string; title: string }) =>
    /^(chapter|ch\.?)\s*\d+/i.test(text(e)) || /^\d+\.?$/.test(e.label) || /^\d+[.:)]?\s+\S/.test(e.title);

  let chosen = entries.filter(isChapterish);
  if (chosen.length < 2) {
    const body = entries.filter((e) => !FRONT_BACK_MATTER.test(e.title || e.label) && !PART_HEADING.test(text(e)));
    if (!body.length) return null;
    const levels = [...new Set(body.map((e) => e.level))].sort((a, b) => a - b);
    // If Part headings exist at the top level, chapters are one level below them.
    const hasParts = entries.some((e) => PART_HEADING.test(text(e)) && e.level === levels[0]);
    const level = hasParts && levels.length > 1 ? levels[1] : levels[0];
    chosen = body.filter((e) => e.level === level);
  }
  if (!chosen.length) return null;
  const titles = chosen.map((e) =>
    (e.title || e.label).replace(/^(chapter|ch\.?)\s*\d+[.:)-]?\s*/i, '').replace(/^\d+[.:)]?\s+/, ''),
  );
  return { count: chosen.length, titles };
}

const joinTitle = (title?: string, subtitle?: string) =>
  [title?.trim(), subtitle?.trim()].filter(Boolean).join(': ');

export async function lookupIsbn(
  input: string,
  fetchFn: Fetch = (u) => fetch(u),
  opts: { googleApiKey?: string } = {},
): Promise<IsbnResult> {
  const isbn13 = normalizeIsbn(input);
  if (!isbn13) throw new Error('That is not a valid ISBN-10 or ISBN-13.');

  const result: IsbnResult = { isbn13, title: '', authors: [], chapterTitles: [], sources: [] };
  const errors: string[] = [];

  // 1. Open Library Books API (title, subtitle, authors, sometimes TOC)
  try {
    const r = await fetchFn(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn13}&jscmd=data&format=json`);
    if (r.ok) {
      const data = (await r.json())[`ISBN:${isbn13}`];
      if (data) {
        result.sources.push('Open Library');
        result.title = joinTitle(data.title, data.subtitle);
        result.authors = (data.authors ?? []).map((a: { name: string }) => a.name);
        result.publisher = data.publishers?.[0]?.name;
        result.publishDate = data.publish_date;
        result.pages = data.number_of_pages;
        const ch = countChapters(data.table_of_contents);
        if (ch) Object.assign(result, { chapterCount: ch.count, chapterTitles: ch.titles });
      }
    } else errors.push(`Open Library ${r.status}`);
  } catch (e) {
    errors.push(`Open Library: ${(e as Error).message}`);
  }

  // 1b. Open Library edition record – sometimes carries a TOC the Books API omits.
  if (result.chapterCount === undefined) {
    try {
      const r = await fetchFn(`https://openlibrary.org/isbn/${isbn13}.json`);
      if (r.ok) {
        const ed = await r.json();
        if (!result.title) result.title = joinTitle(ed.title, ed.subtitle);
        if (!result.pages && ed.number_of_pages) result.pages = ed.number_of_pages;
        const ch = countChapters(ed.table_of_contents);
        if (ch) Object.assign(result, { chapterCount: ch.count, chapterTitles: ch.titles });
        if (!result.sources.includes('Open Library')) result.sources.push('Open Library');
      }
    } catch {
      /* optional */
    }
  }

  // 2. Google Books – fill in whatever is still missing.
  if (!result.title || !result.authors.length || !result.pages) {
    try {
      const key = opts.googleApiKey ? `&key=${encodeURIComponent(opts.googleApiKey)}` : '';
      const r = await fetchFn(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn13}${key}`);
      if (r.ok) {
        const v = (await r.json()).items?.[0]?.volumeInfo;
        if (v) {
          result.sources.push('Google Books');
          if (!result.title) result.title = joinTitle(v.title, v.subtitle);
          if (!result.authors.length) result.authors = v.authors ?? [];
          result.publisher ??= v.publisher;
          result.publishDate ??= v.publishedDate;
          result.pages ??= v.pageCount;
        }
      } else errors.push(`Google Books ${r.status}`);
    } catch (e) {
      errors.push(`Google Books: ${(e as Error).message}`);
    }
  }

  if (!result.title) {
    throw new Error(
      errors.length ? `No book found (${errors.join('; ')}).` : `No book found for ISBN ${isbn13}.`,
    );
  }
  return result;
}
