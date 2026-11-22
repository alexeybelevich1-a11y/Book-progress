import type { Progress } from '../lib/progress';

export function ProgressBar({ p, label }: { p: Progress; label?: string }) {
  const readingPct = p.total ? (p.reading / p.total) * 100 : 0;
  return (
    <div className="progress" aria-label={label ?? 'progress'}>
      <div className="bar">
        <span className="done" style={{ width: `${p.percent}%` }} />
        <span className="reading" style={{ width: `${readingPct}%` }} />
      </div>
      <small>
        {p.done}/{p.total} chapters · {p.percent}%{p.reading ? ` · ${p.reading} in progress` : ''}
      </small>
    </div>
  );
}
