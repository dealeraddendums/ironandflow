import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabase
    .from('gym_athletes')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = String(body.id ?? '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (!id || id.length < 2) {
    return NextResponse.json({ error: 'id must be a short slug (a-z, 0-9, -)' }, { status: 400 });
  }
  const payload = {
    id,
    name: String(body.name ?? id).trim() || id,
    accent: String(body.accent ?? '#888888'),
    focus: String(body.focus ?? ''),
    training_days: Number(body.training_days ?? 3),
    split: String(body.split ?? ''),
    facility: String(body.facility ?? ''),
    goals: Array.isArray(body.goals) ? body.goals.map(String) : [],
    categories: Array.isArray(body.categories) ? body.categories.map(String) : [],
    exercises:
      typeof body.exercises === 'object' && body.exercises !== null ? body.exercises : {},
    pinned_default: Array.isArray(body.pinned_default) ? body.pinned_default.map(String) : [],
    coach_extra: String(body.coach_extra ?? ''),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('gym_athletes')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
