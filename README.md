# Book Progress

A reading-progress tracker for **medical textbooks**, which you rarely read cover to cover or in order.

## Features
- **ISBN lookup** gets the full title (with subtitle/edition), authors, and chapter count from the published table of contents (Open Library, with Google Books as a fallback). When no table of contents is online, you enter the count yourself.
- **Non-linear chapter grid**: tap any chapter to cycle *not started → in progress → done*.
- **Book identifier** (ISBN-13 or your own label, e.g. "Harrison's 21e").
- **Progress** for each book and overall, a daily **streak**, and a recent-activity log.
- **Daily reminder**: an in-app/browser notification while the app is open, plus a downloadable repeating calendar event (`.ics`) for reminders that work even when the app is closed.
- Data is stored in the browser (`localStorage`), with JSON export/import for backup.

## Development
```bash
npm ci
npm run dev        # http://localhost:5173
npm test           # unit tests (vitest)
npm run build      # typecheck + production build to dist/
```

Optional: set `VITE_GOOGLE_BOOKS_API_KEY` in `.env.local` to raise the Google Books quota. This key ships in the browser bundle, so use a key restricted to the Books API and your domain.
