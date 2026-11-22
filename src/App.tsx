import { useEffect, useState } from 'react';
import { AddBook } from './components/AddBook';
import { BookView } from './components/BookView';
import { ProgressBar } from './components/ProgressBar';
import { Settings } from './components/Settings';
import { bookProgress, createBook, overallProgress, readingStreak, readToday, resizeChapters, setChapterStatus, toLocalDate } from './lib/progress';
import { shouldRemind } from './lib/reminder';
import { loadState, saveState } from './lib/storage';
import type { AppState } from './lib/types';

type View = { name: 'home' } | { name: 'add' } | { name: 'book'; id: string } | { name: 'settings' };

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [view, setView] = useState<View>({ name: 'home' });
  const [banner, setBanner] = useState(false);

  useEffect(() => saveState(state), [state]);

  // Daily reminder check while the app is open.
  useEffect(() => {
    const tick = () => {
      const today = toLocalDate();
      setState((s) => {
        if (!shouldRemind(s.settings, new Date(), today, s.lastReminderDate, readToday(s, today))) return s;
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('MedRead Tracker', { body: "You haven't logged any reading today. One chapter?" });
        }
        setBanner(true);
        return { ...s, lastReminderDate: today };
      });
    };
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);

  const overall = overallProgress(state.books);
  const streak = readingStreak(state.log);
  const book = view.name === 'book' ? state.books.find((b) => b.id === view.id) : undefined;
  const updateBook = (id: string, f: (b: AppState['books'][number]) => AppState['books'][number]) =>
    setState((s) => ({ ...s, books: s.books.map((b) => (b.id === id ? f(b) : b)) }));

  return (
    <main>
      <header>
        <h1 onClick={() => setView({ name: 'home' })}>📖 MedRead</h1>
        <nav>
          <button className="link" onClick={() => setView({ name: 'settings' })}>⚙ Settings</button>
        </nav>
      </header>

      {banner && !readToday(state) && (
        <div className="banner">⏰ Daily reminder: no reading logged today yet. <button className="link" onClick={() => setBanner(false)}>Dismiss</button></div>
      )}

      {view.name === 'home' && (
        <>
          <div className="card stats">
            <div><b>{state.books.length}</b><small>books</small></div>
            <div><b>{overall.percent}%</b><small>overall</small></div>
            <div><b>{streak}</b><small>day streak</small></div>
            <div><b>{readToday(state) ? '✓' : '–'}</b><small>today</small></div>
          </div>
          {state.books.length > 0 && <ProgressBar p={overall} label="overall progress" />}
          <div className="books">
            {state.books.map((b) => (
              <button key={b.id} className="card book" onClick={() => setView({ name: 'book', id: b.id })}>
                <h3>{b.title}</h3>
                <p className="muted">{[b.authors, b.identifier].filter(Boolean).join(' · ')}</p>
                <ProgressBar p={bookProgress(b)} />
              </button>
            ))}
          </div>
          {!state.books.length && <p className="empty">No books yet. Add your first textbook. ISBN lookup fills in the title and chapter count.</p>}
          <button className="primary wide" onClick={() => setView({ name: 'add' })}>+ Add book</button>
        </>
      )}

      {view.name === 'add' && (
        <AddBook
          onCancel={() => setView({ name: 'home' })}
          onAdd={(nb) => {
            const b = createBook(nb);
            setState((s) => ({ ...s, books: [...s.books, b] }));
            setView({ name: 'book', id: b.id });
          }}
        />
      )}

      {view.name === 'book' && book && (
        <BookView
          book={book}
          log={state.log}
          onBack={() => setView({ name: 'home' })}
          onStatus={(ch, st) => setState((s) => setChapterStatus(s, book.id, ch, st))}
          onUpdate={(nb) => updateBook(book.id, () => nb)}
          onResize={(n) => updateBook(book.id, (b) => resizeChapters(b, n))}
          onDelete={() => {
            setState((s) => ({ ...s, books: s.books.filter((b) => b.id !== book.id), log: s.log.filter((e) => e.bookId !== book.id) }));
            setView({ name: 'home' });
          }}
        />
      )}

      {view.name === 'settings' && (
        <>
          <button className="link" onClick={() => setView({ name: 'home' })}>← Back</button>
          <Settings state={state} onSettings={(st) => setState((s) => ({ ...s, settings: st }))} onImport={setState} />
        </>
      )}
    </main>
  );
}
