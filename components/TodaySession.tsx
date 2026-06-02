'use client';
import type { GymSet } from '@/lib/supabase';

export default function TodaySession({
  sets,
  onDelete,
}: {
  sets: GymSet[];
  onDelete: (id: string) => void;
}) {
  const totalSets = sets.reduce((a, s) => a + (s.sets || 0), 0);
  const exercises = new Set(sets.map((s) => s.exercise)).size;
  const volume = sets.reduce((a, s) => a + (s.sets || 0) * (s.reps || 0) * (s.weight || 0), 0);

  if (!sets.length) {
    return (
      <div className="stack" style={{ gap: 6 }}>
        <span className="eyebrow">Today</span>
        <p className="muted" style={{ margin: 0 }}>
          No sets yet. Log your first one.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        className="row"
        style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}
      >
        <span className="eyebrow">Today</span>
        <span className="muted" style={{ fontSize: 12 }}>
          {totalSets} sets · {exercises} exercises
          {volume > 0 ? ` · ${volume.toLocaleString()} lbs` : ''}
        </span>
      </div>
      <div>
        {sets.map((s) => {
          const t = new Date(s.logged_at);
          const time = t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
          return (
            <div key={s.id} className="set-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontWeight: 500 }}>{s.exercise}</strong>
                  {s.is_pr ? <span className="pr-badge">PR</span> : null}
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                  {s.sets}×{s.reps}
                  {s.weight ? ` @ ${s.weight} lbs` : ''}
                  {s.notes ? ` · ${s.notes}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="muted" style={{ fontSize: 12 }}>
                  {time}
                </span>
                <button
                  onClick={() => onDelete(s.id)}
                  className="muted"
                  aria-label="Delete set"
                  style={{ fontSize: 16, padding: 4 }}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
