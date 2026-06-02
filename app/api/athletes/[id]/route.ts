import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase
    .from('gym_athletes')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of [
    'name',
    'accent',
    'focus',
    'training_days',
    'split',
    'facility',
    'goals',
    'categories',
    'exercises',
    'pinned_default',
    'coach_extra',
  ]) {
    if (k in body) update[k] = body[k];
  }
  const { data, error } = await supabase
    .from('gym_athletes')
    .update(update)
    .eq('id', params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await supabase.from('gym_athletes').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
