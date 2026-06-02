import type { GymSet, GymPR, GymPinned } from './supabase';

export type Suggestion = {
  exercise: string;
  category: string;
  sets: number;
  reps: number;
  weight: number | null;
  rationale: string;
  coachNote: string;
  intensity: 'heavy' | 'moderate' | 'light' | 'mobility';
};

export type SuggestRequest = {
  athlete: string;
  todaySets: GymSet[];
  recentHistory: GymSet[];
  prs: GymPR[];
  pinned: GymPinned[];
};

export async function fetchSuggestion(req: SuggestRequest, signal?: AbortSignal): Promise<Suggestion> {
  const res = await fetch('/api/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Suggestion failed: ${res.status} ${txt}`);
  }
  return res.json();
}

export async function postFeedback(athlete: string, suggestion: Suggestion, accepted: boolean) {
  await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ athlete, suggestion, accepted }),
  });
}
