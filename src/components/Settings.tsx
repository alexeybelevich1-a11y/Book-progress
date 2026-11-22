import { useRef, useState } from 'react';
import { buildIcs } from '../lib/reminder';
import { download, parseBackup } from '../lib/storage';
import type { AppState, Settings as S } from '../lib/types';

export function Settings({ state, onSettings, onImport }: {
  state: AppState;
  onSettings: (s: S) => void;
  onImport: (s: AppState) => void;
}) {
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<AppState | null>(null);
  const [importError, setImportError] = useState('');
  const s = state.settings;
  const supported = typeof Notification !== 'undefined';

  async function toggle(enabled: boolean) {
    if (enabled && supported && Notification.permission === 'default') await Notification.requestPermission();
    onSettings({ ...s, reminderEnabled: enabled });
  }

  return (
    <div className="card">
      <h2>Daily reminder</h2>
      <label className="row">
        <input type="checkbox" checked={s.reminderEnabled} onChange={(e) => toggle(e.target.checked)} />
        Remind me if I haven't read yet today
      </label>
      <label>
        Time
        <input type="time" value={s.reminderTime} onChange={(e) => onSettings({ ...s, reminderTime: e.target.value })} />
      </label>
      {supported && s.reminderEnabled && Notification.permission === 'denied' && (
        <p className="status error">Notifications are blocked in this browser. Use the calendar reminder below.</p>
      )}
      <p className="hint">
        In-app reminders only fire while the app is open. For a reminder on your phone that always works,
        add the daily event to your calendar:
      </p>
      <button onClick={() => download('book-progress-daily-reminder.ics', buildIcs(s.reminderTime), 'text/calendar')}>
        📅 Add daily reminder to calendar
      </button>

      <h2>Backup</h2>
      <p className="hint">Your data is stored only in this browser. Export a backup to move it to another device.</p>
      <div className="row">
        <button onClick={() => download(`book-progress-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2), 'application/json')}>
          Export
        </button>
        <button onClick={() => file.current?.click()}>Import</button>
        <input ref={file} type="file" accept="application/json" hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            setImportError('');
            setPending(parseBackup(await f.text()));
          } catch (err) { setImportError((err as Error).message); }
          e.target.value = '';
        }} />
      </div>
      {importError && <p className="status error">{importError}</p>}
      {pending && (
        <div className="row status info">
          <span>Replace all current data with this backup ({pending.books.length} books)?</span>
          <button className="danger" onClick={() => { onImport(pending); setPending(null); }}>Replace</button>
          <button onClick={() => setPending(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
}
