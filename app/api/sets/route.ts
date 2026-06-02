import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function athleteExists(id: string): Promise<boolean> {
  const { data } = await supabase.from('gym_athletes').select('id').eq('id', id).maybeSingle();
  return !!data;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const athlete = searchParams.get('athlete');
  const limit = Number(searchParams.get('limit') ?? '500');
  const since = searchParams.get('since');
  const dayLocal = searchParams.get('day');

  if (!athlete) return NextResponse.json({ error: 'athlete required' }, { status: 400 });

  let q = supabase
    .from('gym_sets')
    .select('*')
    .eq('athlete', athlete)
    .order('logged_at', { ascending: false })
    .limit(limit);

  if (since) q = q.gte('logged_at', since);
  if (dayLocal) {
    const start = new Date(`${dayLocal}T00:00:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    q = q.gte('logged_at', start.toISOString()).lt('logged_at', end.toISOString());
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { athlete, exercise, category, sets, reps, weight, notes } = body ?? {};

  if (!athlete || !(await athleteExists(athlete))) {
    return NextResponse.json({ error: 'unknown athlete' }, { status: 400 });
  }
  if (!exercise || !category) {
    return NextResponse.json({ error: 'exercise and category required' }, { status: 400 });
  }
  if (typeof sets !== 'number' || typeof reps !== 'number') {
    return NextResponse.json({ error: 'sets and reps required as numbers' }, { status: 400 });
  }

  const w = typeof weight === 'number' && Number.isFinite(weight) ? weight : null;

  const { data: existingPr } = await supabase
    .from('gym_prs')
    .select('*')
    .eq('athlete', athlete)
    .eq('exercise', exercise)
    .maybeSingle();

  let isPR = false;
  if (w !== null) {
    if (!existingPr || (existingPr.best_weight ?? -Infinity) < w) isPR = true;
  } else {
    if (!existingPr || (existingPr.best_reps ?? -Infinity) < reps) isPR = true;
  }

  const { data: inserted, error: insErr } = await supabase
    .from('gym_sets')
    .insert({
      athlete,
      exercise,
      category,
      sets,
      reps,
      weight: w,
      notes: notes ?? null,
      is_pr: isPR,
    })
    .select()
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  if (isPR) {
    await supabase.from('gym_prs').upsert(
      {
        athlete,
        exercise,
        category,
        best_sets: sets,
        best_reps: reps,
        best_weight: w,
        achieved_at: inserted.logged_at,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'athlete,exercise' },
    );
  }

  return NextResponse.json({ set: inserted, isPR });
}
