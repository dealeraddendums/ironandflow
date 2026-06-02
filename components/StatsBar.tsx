'use client';
import type { Athlete } from '@/lib/athletes';
import type { GymSet, GymPR } from '@/lib/supabase';

function startOfWeek(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Sun
  x.setDate(x.getDate() - day);
  return x;
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function StatsBar({
  athlete,
  todaySets,
  recentSets,
  prs,
}: {
  athlete: Athlete;
  todaySets: GymSet[];
  recentSets: GymSet[];
  prs: GymPR[];
}) {
  const todayCount = todaySets.reduce((a, s) => a + (s.sets || 0), 0);
  const weekStart = startOfWeek();
  const daySet = new Set<string>();
  for (const s of recentSets) {
    const d = new Date(s.logged_at);
    if (d >= weekStart) daySet.add(startOfDay(d).toISOString());
  }
  const daysTrained = daySet.size;
  return (
    <div className="grid-3">
      <Stat label="Today" value={todayCount} accent={athlete.accent} />
      <Stat label="This Week" value={`${daysTrained}/${athlete.training_days}`} accent={athlete.accent} />
      <Stat label="Total PRs" value={prs.length} accent={athlete.accent} />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="stat">
      <span className="stat-value" style={{ color: accent }}>
        {value}
      </span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
