import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: false },
});

export type GymSet = {
  id: string;
  athlete: 'allan' | 'carol';
  exercise: string;
  category: string;
  sets: number;
  reps: number;
  weight: number | null;
  notes: string | null;
  is_pr: boolean;
  logged_at: string;
  created_at: string;
};

export type GymPR = {
  id: string;
  athlete: 'allan' | 'carol';
  exercise: string;
  category: string;
  best_sets: number | null;
  best_reps: number | null;
  best_weight: number | null;
  achieved_at: string | null;
  updated_at: string;
};

export type GymPinned = {
  id: string;
  athlete: 'allan' | 'carol';
  exercise: string;
  category: string;
  priority: number;
  created_at: string;
};
