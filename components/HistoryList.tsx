'use client';
import { useMemo, useState } from 'react';
import type { GymSet } from '@/lib/supabase';

function groupByDay(sets: GymSet[]) {
  const groups = new Map<string, GymSet[]>();
  for (const s of sets) {
    const d = new Date(s.logged_at);
    const key = d.toISOString().slice(0, 10);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  return Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

function formatDay(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function HistoryList({
  sets,
  onDelete,
  accent,
}: {
  sets: GymSet[];
  onDelete: (id: string) => void;
  accent: string;
}) {
  const grouped = useMemo(() => groupByDay(sets), [sets]);
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const visible = grouped.slice(0, (page + 1) * pageSize);

  if (!grouped.length) {
    return <p className="muted">No history yet.</p>;
  }

  return (
    <div>
      {visible.map(([day, daySets]) => {
        const totalSets = daySets.reduce((a, s) => a + (s.sets || 0), 0);
        const volume = daySets.reduce(
          (a, s) => a + (s.sets || 0) * (s.reps || 0) * (s.weight || 0),
          0,
        );
        return (
          <section key={day}>
            <div className="history-day">
              <h3>{formatDay(day)}</h3>
              <span className="muted" style={{ fontSize: 12 }}>
                {totalSets} sets{volume > 0 ? ` · ${volume.toLocaleString()} lbs` : ''}
              </span>
            </div>
            <div>
              {daySets.map((s) => (
                <div key={s.id} className="set-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontWeight: 500 }}>{s.exercise}</strong>
                      {s.is_pr ? (
                        <span className="pr-badge" style={{ background: accent + '22', color: accent }}>
                          PR
                        </span>
                      ) : null}
                    </div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                      {s.sets}×{s.reps}
                      {s.weight ? ` @ ${s.weight} lbs` : ''}
                      {s.notes ? ` · ${s.notes}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => onDelete(s.id)}
                    className="muted"
                    aria-label="Delete"
                    style={{ fontSize: 16, padding: 4 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      {grouped.length > visible.length ? (
        <button
          className="btn btn-ghost btn-block"
          onClick={() => setPage((p) => p + 1)}
          style={{ marginTop: 18 }}
        >
          Load more
        </button>
      ) : null}
    </div>
  );
}
