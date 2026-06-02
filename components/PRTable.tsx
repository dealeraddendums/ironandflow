'use client';
import type { GymPR } from '@/lib/supabase';

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PRTable({ prs, accent }: { prs: GymPR[]; accent: string }) {
  if (!prs.length) {
    return <p className="muted">No PRs yet — log a heavy set to set one.</p>;
  }
  return (
    <table className="pr-table">
      <thead>
        <tr>
          <th>Exercise</th>
          <th>Category</th>
          <th>Best</th>
          <th>Achieved</th>
        </tr>
      </thead>
      <tbody>
        {prs.map((p) => (
          <tr key={p.id}>
            <td style={{ fontWeight: 500 }}>{p.exercise}</td>
            <td className="muted">{p.category}</td>
            <td>
              <span style={{ color: accent }}>
                {p.best_sets ?? '—'}×{p.best_reps ?? '—'}
                {p.best_weight ? ` @ ${p.best_weight}` : ''}
              </span>
            </td>
            <td className="muted" style={{ fontSize: 12 }}>
              {fmtDate(p.achieved_at)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
