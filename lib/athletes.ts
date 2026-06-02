import { supabase } from './supabase';

export type Athlete = {
  id: string;
  name: string;
  accent: string;
  focus: string;
  training_days: number;
  split: string;
  facility: string;
  goals: string[];
  categories: string[];
  exercises: Record<string, string[]>;
  pinned_default: string[];
  coach_extra: string;
  created_at?: string;
  updated_at?: string;
};

export type MetricLabels = { a: string; b: string; c: string };

// Mobility-style categories use rounds/duration/hold rather than sets/reps/weight
const MOBILITY_CATEGORIES = new Set([
  'yoga',
  'stretch',
  'stretching',
  'pilates',
  'recovery',
  'mobility',
  'breathwork',
]);

export function metricLabelsFor(category: string): MetricLabels {
  if (MOBILITY_CATEGORIES.has(category.toLowerCase())) {
    return { a: 'Rounds', b: 'Duration (min)', c: 'Hold (sec)' };
  }
  return { a: 'Sets', b: 'Reps', c: 'Weight (lbs)' };
}

export function categoryForExercise(athlete: Athlete, exercise: string): string {
  for (const cat of athlete.categories) {
    if (athlete.exercises[cat]?.includes(exercise)) return cat;
  }
  return athlete.categories[0] ?? 'Other';
}

export function allExercises(athlete: Athlete): { name: string; category: string }[] {
  const out: { name: string; category: string }[] = [];
  for (const cat of athlete.categories) {
    for (const ex of athlete.exercises[cat] ?? []) out.push({ name: ex, category: cat });
  }
  return out;
}

export async function fetchAllAthletes(): Promise<Athlete[]> {
  const { data, error } = await supabase
    .from('gym_athletes')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Athlete[];
}

export async function fetchAthlete(id: string): Promise<Athlete | null> {
  const { data, error } = await supabase
    .from('gym_athletes')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Athlete) ?? null;
}

export function buildCoachPrompt(a: Athlete): string {
  return `You are a personal strength and conditioning coach for ${a.name}. Their focus is ${a.focus}. They train ${a.training_days} days per week. Split: ${a.split}.
Goals: ${a.goals.join('; ')}.
Non-negotiables (pinned exercises that should appear regularly): ${a.pinned_default.join(', ') || 'none specified'}.
Additional coaching notes: ${a.coach_extra || '(none)'}.`;
}
