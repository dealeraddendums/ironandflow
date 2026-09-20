import type { Athlete } from './athletes';

// Single source of truth for the Claude model used by both AI routes
// (/api/routine and /api/suggest). Keep them on the same model so a retirement
// can never take out one surface and leave the other silently on a dead id.
export const COACH_MODEL = 'claude-opus-5';

export type GymSetLike = {
  exercise: string;
  category: string;
  sets: number;
  reps: number;
  weight: number | null;
  notes?: string | null;
  logged_at: string;
};

export type GymPRLike = {
  exercise: string;
  best_sets: number | null;
  best_reps: number | null;
  best_weight: number | null;
};

// All "today" boundaries are anchored to the athlete's wall-clock timezone, not
// the server's. The app is deployed on a UTC host, so using the server's local
// date would roll over at 4-5pm Pacific and file plans under the wrong calendar
// day — causing the daily plan to never regenerate correctly. Keep everything in
// America/Los_Angeles so the day boundary matches the user.
export const APP_TIMEZONE = 'America/Los_Angeles';

export function dayOfWeek(d = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    weekday: 'long',
  }).format(d);
}

export function todayLocalISO(d = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which is exactly the plan_date shape we store.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function summarizeSets(sets: GymSetLike[], label = 'logged'): string {
  if (!sets.length) return `(nothing ${label})`;
  return sets
    .map(
      (s) =>
        `- ${s.exercise} (${s.category}): ${s.sets}x${s.reps}${
          s.weight ? ` @ ${s.weight} lbs` : ''
        }${s.notes ? ` — "${s.notes}"` : ''}`,
    )
    .join('\n');
}

export function lastSessionInfo(history: GymSetLike[]): {
  date: string | null;
  muscleGroups: string[];
  exercises: string[];
} {
  if (!history.length) return { date: null, muscleGroups: [], exercises: [] };
  const sorted = history
    .slice()
    .sort((a, b) => +new Date(b.logged_at) - +new Date(a.logged_at));
  const latestDay = sorted[0].logged_at.slice(0, 10);
  const sameDay = sorted.filter((s) => s.logged_at.slice(0, 10) === latestDay);
  const muscleGroups = Array.from(new Set(sameDay.map((s) => s.category)));
  const exercises = Array.from(new Set(sameDay.map((s) => s.exercise)));
  return { date: latestDay, muscleGroups, exercises };
}

export function recentMuscleGroups(sets: GymSetLike[], hoursBack = 48): string {
  const cutoff = Date.now() - hoursBack * 3600_000;
  const recent = sets.filter((s) => new Date(s.logged_at).getTime() >= cutoff);
  if (!recent.length) return '(nothing trained in the last 48 hours)';
  const byCat = new Map<string, string[]>();
  for (const s of recent) {
    if (!byCat.has(s.category)) byCat.set(s.category, []);
    byCat.get(s.category)!.push(s.exercise);
  }
  return Array.from(byCat.entries())
    .map(([cat, exs]) => `${cat}: ${Array.from(new Set(exs)).join(', ')}`)
    .join('; ');
}

export function recentTrendOnExercises(sets: GymSetLike[]): string {
  const byExercise = new Map<string, GymSetLike[]>();
  for (const s of sets) {
    if (!byExercise.has(s.exercise)) byExercise.set(s.exercise, []);
    byExercise.get(s.exercise)!.push(s);
  }
  const lines: string[] = [];
  Array.from(byExercise.entries()).forEach(([ex, list]) => {
    const sorted = list.slice().sort((a, b) => +new Date(b.logged_at) - +new Date(a.logged_at));
    const lastThree = sorted.slice(0, 3);
    const summary = lastThree
      .map((s) => `${s.sets}x${s.reps}${s.weight ? `@${s.weight}` : ''}`)
      .join(' | ');
    lines.push(`- ${ex}: ${summary}`);
  });
  return lines.slice(0, 16).join('\n') || '(no recent history)';
}

export function prsLine(prs: GymPRLike[]): string {
  if (!prs.length) return '(no PRs yet)';
  return prs
    .slice(0, 20)
    .map(
      (p) =>
        `${p.exercise}: ${p.best_sets ?? '?'}x${p.best_reps ?? '?'}${
          p.best_weight ? ` @ ${p.best_weight} lbs` : ''
        }`,
    )
    .join('; ');
}

export function buildExerciseMenu(a: Athlete): string {
  return a.categories.map((cat) => `${cat}: ${(a.exercises[cat] ?? []).join(', ')}`).join('\n');
}

export function extractJSON(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    let depth = 0;
    for (let i = 0; i < trimmed.length; i++) {
      if (trimmed[i] === '{') depth++;
      else if (trimmed[i] === '}') {
        depth--;
        if (depth === 0) return trimmed.slice(0, i + 1);
      }
    }
  }
  const m = trimmed.match(/\{[\s\S]*\}/);
  return m ? m[0] : null;
}
