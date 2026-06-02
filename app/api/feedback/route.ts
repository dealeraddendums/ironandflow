import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { athlete, suggestion, accepted } = body ?? {};
  if (!athlete || !suggestion || typeof accepted !== 'boolean') {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }
  const { error } = await supabase
    .from('gym_suggestion_feedback')
    .insert({ athlete, suggestion, accepted });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
