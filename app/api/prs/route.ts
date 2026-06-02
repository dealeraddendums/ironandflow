import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const athlete = searchParams.get('athlete');
  if (!athlete) return NextResponse.json({ error: 'athlete required' }, { status: 400 });
  const { data, error } = await supabase
    .from('gym_prs')
    .select('*')
    .eq('athlete', athlete)
    .order('achieved_at', { ascending: false, nullsFirst: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
