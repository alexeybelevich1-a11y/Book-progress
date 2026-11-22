export type ChapterStatus = 'unread' | 'reading' | 'done';

export interface Chapter {
  number: number;
  title: string;
  status: ChapterStatus;
  /** Local date (YYYY-MM-DD) the chapter was marked done. */
  completedAt?: string;
}

export interface Book {
  id: string;
  title: string;
  /** ISBN-13 when known, otherwise any user-supplied identifier (edition, call number…). */
  identifier: string;
  authors: string;
  chapters: Chapter[];
  createdAt: string;
}

export interface LogEntry {
  id: string;
  bookId: string;
  chapter: number;
  status: ChapterStatus;
  /** Local date YYYY-MM-DD */
  date: string;
}

export interface Settings {
  reminderEnabled: boolean;
  /** HH:MM, local time */
  reminderTime: string;
}

export interface AppState {
  version: 1;
  books: Book[];
  log: LogEntry[];
  settings: Settings;
  lastReminderDate?: string;
}
