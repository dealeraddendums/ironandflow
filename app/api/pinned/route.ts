import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const athlete = searchParams.get('athlete');
  if (!athlete) return NextResponse.json({ error: 'athlete required' }, { status: 400 });
  const { data, error } = await supabase
    .from('gym_pinned')
    .select('*')
    .eq('athlete', athlete)
    .order('priority', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { athlete, exercise, category, priority } = body ?? {};
  if (!athlete) return NextResponse.json({ error: 'athlete required' }, { status: 400 });
  if (!exercise || !category) {
    return NextResponse.json({ error: 'exercise and category required' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('gym_pinned')
    .upsert(
      { athlete, exercise, category, priority: typeof priority === 'number' ? priority : 0 },
      { onConflict: 'athlete,exercise' },
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const athlete = searchParams.get('athlete');
  const exercise = searchParams.get('exercise');
  if (!athlete || !exercise) {
    return NextResponse.json({ error: 'athlete and exercise required' }, { status: 400 });
  }
  const { error } = await supabase
    .from('gym_pinned')
    .delete()
    .eq('athlete', athlete)
    .eq('exercise', exercise);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
