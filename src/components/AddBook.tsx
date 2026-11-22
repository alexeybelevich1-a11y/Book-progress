import { useState } from 'react';
import { lookupIsbn, normalizeIsbn } from '../lib/isbn';

export interface NewBook {
  title: string;
  identifier: string;
  authors: string;
  chapterCount: number;
  chapterTitles: string[];
}

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY as string | undefined;

export function AddBook({ onAdd, onCancel }: { onAdd: (b: NewBook) => void; onCancel: () => void }) {
  const [isbn, setIsbn] = useState('');
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [chapters, setChapters] = useState('');
  const [titles, setTitles] = useState<string[]>([]);
  const [status, setStatus] = useState<{ kind: 'info' | 'error' | 'ok'; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function lookup() {
    setBusy(true);
    setStatus({ kind: 'info', msg: 'Searching Open Library and Google Books…' });
    try {
      const r = await lookupIsbn(isbn, undefined, { googleApiKey: GOOGLE_KEY });
      setTitle(r.title);
      setAuthors(r.authors.join(', '));
      setIdentifier(r.isbn13);
      if (r.chapterCount) {
        setChapters(String(r.chapterCount));
        setTitles(r.chapterTitles);
        setStatus({ kind: 'ok', msg: `Found via ${r.sources.join(' + ')} · ${r.chapterCount} chapters from the table of contents. Check the count.` });
      } else {
        setTitles([]);
        setStatus({
          kind: 'info',
          msg: `Found via ${r.sources.join(' + ')}${r.pages ? ` (${r.pages} pages)` : ''}, but no table of contents is published online. Please enter the chapter count.`,
        });
      }
    } catch (e) {
      setStatus({ kind: 'error', msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const count = Number(chapters);
  const canSave = title.trim() && Number.isInteger(count) && count > 0 && count <= 1000;

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSave) onAdd({ title, authors, identifier: identifier || isbn, chapterCount: count, chapterTitles: titles });
      }}
    >
      <h2>Add a book</h2>
      <label>
        ISBN
        <div className="row">
          <input value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="978-1-260-46459-7" inputMode="numeric" />
          <button type="button" onClick={lookup} disabled={busy || !normalizeIsbn(isbn)}>
            {busy ? 'Looking up…' : 'Look up'}
          </button>
        </div>
      </label>
      {status && <p className={`status ${status.kind}`}>{status.msg}</p>}
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label>
        Authors / editors
        <input value={authors} onChange={(e) => setAuthors(e.target.value)} />
      </label>
      <label>
        Identifier <small>(ISBN, edition…)</small>
        <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="e.g. Harrison's 21e" />
      </label>
      <label>
        Number of chapters
        <input
          type="number"
          min={1}
          max={1000}
          value={chapters}
          onChange={(e) => {
            setChapters(e.target.value);
            setTitles((t) => t.slice(0, Number(e.target.value) || 0));
          }}
          required
        />
      </label>
      {titles.length > 0 && (
        <details>
          <summary>{titles.length} chapter titles from the table of contents</summary>
          <ol className="toc">{titles.map((t, i) => <li key={i}>{t}</li>)}</ol>
        </details>
      )}
      <div className="row">
        <button type="submit" className="primary" disabled={!canSave}>Add book</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
