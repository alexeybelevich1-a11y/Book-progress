import type { Settings } from './types';

/** Should the in-app reminder fire now? Once per day, after the set time, only if nothing read yet today. */
export function shouldRemind(
  settings: Settings,
  now: Date,
  today: string,
  lastReminderDate: string | undefined,
  hasReadToday: boolean,
): boolean {
  if (!settings.reminderEnabled || hasReadToday || lastReminderDate === today) return false;
  const [h, m] = settings.reminderTime.split(':').map(Number);
  return now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
}

/**
 * A daily repeating calendar event. Importing it into Google/Apple/Outlook calendar
 * gives a reliable phone reminder even when the app is closed.
 */
export function buildIcs(time: string, start: Date = new Date()): string {
  const [h, m] = time.split(':').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}`;
  const t = `${pad(h)}${pad(m)}00`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Book Progress//EN',
    'BEGIN:VEVENT',
    `UID:book-progress-daily-${day}@book-progress.local`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${day}T${t}`,
    'DURATION:PT30M',
    'RRULE:FREQ=DAILY',
    'SUMMARY:📖 Read a chapter',
    'DESCRIPTION:Time for your daily medical reading. Log it in Book Progress.',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Time to read',
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
