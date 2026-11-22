import { useState } from 'react';
import { bookProgress, nextStatus } from '../lib/progress';
import type { Book, ChapterStatus, LogEntry } from '../lib/types';
import { ProgressBar } from './ProgressBar';

const LABEL: Record<ChapterStatus, string> = { unread: 'Not started', reading: 'In progress', done: 'Done' };

export function BookView(props: {
  book: Book;
  log: LogEntry[];
  onStatus: (chapter: number, s: ChapterStatus) => void;
  onUpdate: (b: Book) => void;
  onResize: (n: number) => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const { book } = props;
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [filter, setFilter] = useState<ChapterStatus | 'all'>('all');
  const p = bookProgress(book);
  const recent = props.log.filter((e) => e.bookId === book.id).slice(-10).reverse();
  const shown = book.chapters.filter((c) => filter === 'all' || c.status === filter);

  return (
    <section>
      <button className="link" onClick={props.onBack}>← All books</button>
      <div className="card">
        <h2>{book.title}</h2>
        <p className="muted">
          {book.authors}
          {book.identifier && <> · <code>{book.identifier}</code></>}
        </p>
        <ProgressBar p={p} />
        <p className="hint">Tap a chapter to cycle: not started → in progress → done. Read in any order.</p>
        <div className="row filters">
          {(['all', 'unread', 'reading', 'done'] as const).map((f) => (
            <button key={f} className={filter === f ? 'chip active' : 'chip'} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : LABEL[f]}
            </button>
          ))}
          <button className="chip" onClick={() => setEditing(!editing)}>{editing ? 'Finish editing' : 'Edit chapters'}</button>
        </div>

        {editing ? (
          <div className="edit">
            <label>
              Number of chapters
              <input type="number" min={1} max={1000} defaultValue={book.chapters.length}
                onBlur={(e) => { const n = Number(e.target.value); if (n > 0 && n <= 1000) props.onResize(n); }} />
            </label>
            <ol className="edit-list">
              {book.chapters.map((c) => (
                <li key={c.number}>
                  <input
                    placeholder={`Chapter ${c.number} title`}
                    value={c.title}
                    onChange={(e) => props.onUpdate({
                      ...book,
                      chapters: book.chapters.map((x) => (x.number === c.number ? { ...x, title: e.target.value } : x)),
                    })}
                  />
                </li>
              ))}
            </ol>
            {confirmDelete ? (
              <div className="row">
                <span>Delete this book and its reading log?</span>
                <button className="danger" onClick={props.onDelete}>Yes, delete</button>
                <button onClick={() => setConfirmDelete(false)}>Keep</button>
              </div>
            ) : (
              <button className="danger" onClick={() => setConfirmDelete(true)}>Delete book</button>
            )}
          </div>
        ) : (
          <div className="grid">
            {shown.map((c) => (
              <button
                key={c.number}
                className={`chapter ${c.status}`}
                title={`${c.title || `Chapter ${c.number}`} · ${LABEL[c.status]}${c.completedAt ? ` (${c.completedAt})` : ''}`}
                onClick={() => props.onStatus(c.number, nextStatus(c.status))}
              >
                <b>{c.number}</b>
                {c.title && <span>{c.title}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {recent.length > 0 && (
        <div className="card">
          <h3>Recent activity</h3>
          <ul className="log">
            {recent.map((e) => (
              <li key={e.id}>
                <span className="muted">{e.date}</span> Chapter {e.chapter}
                {book.chapters[e.chapter - 1]?.title && ` · ${book.chapters[e.chapter - 1].title}`} — {LABEL[e.status]}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
