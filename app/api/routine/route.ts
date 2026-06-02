import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import { buildCoachPrompt, type Athlete, allExercises } from '@/lib/athletes';
import {
  buildExerciseMenu,
  dayOfWeek,
  extractJSON,
  lastSessionInfo,
  prsLine,
  recentMuscleGroups,
  recentTrendOnExercises,
  todayLocalISO,
  type GymPRLike,
  type GymSetLike,
} from '@/lib/coach';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const apiKey = process.env.ANTHROPIC_API_KEY;
const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

const MODEL = 'claude-sonnet-4-20250514';

type PlanItem = {
  exercise: string;
  category?: string;
  sets?: number;
  reps?: number;
  weight?: number | null;
  duration?: string;
  restSeconds?: number;
  notes?: string;
  isPinned?: boolean;
};

type DailyPlan = {
  sessionType: string;
  estimatedDuration: string;
  warmup: PlanItem[];
  mainWork: PlanItem[];
  accessories: PlanItem[];
  cooldown: PlanItem[];
  coachIntro: string;
};

async function generatePlan(
  cfg: Athlete,
  todaySets: GymSetLike[],
  recentHistory: GymSetLike[],
  prs: GymPRLike[],
  pinnedNames: string[],
): Promise<DailyPlan> {
  if (!anthropic) throw new Error('ANTHROPIC_API_KEY not configured');

  const effectivePinned = Array.from(new Set([...pinnedNames, ...(cfg.pinned_default ?? [])]));
  const last = lastSessionInfo(recentHistory);
  const dow = dayOfWeek();

  const systemPrompt = `${buildCoachPrompt(cfg)}

AVAILABLE EXERCISES (every exercise you suggest in mainWork / accessories MUST be an exact name from this list):
${buildExerciseMenu(cfg)}

Their pinned (non-negotiable) exercises: ${effectivePinned.join(', ') || 'none'}.

CONTEXT FOR TODAY'S PLAN
- Today's date: ${todayLocalISO()} (${dow})
- Last training session: ${last.date ?? '(no prior sessions on record)'}
- Last session muscle groups: ${last.muscleGroups.join(', ') || 'n/a'}
- Last session exercises: ${last.exercises.join(', ') || 'n/a'}
- Muscle groups trained in last 48h: ${recentMuscleGroups(recentHistory)}
- Recent trend on key exercises (last 3 sessions each):
${recentTrendOnExercises(recentHistory)}
- Current PRs: ${prsLine(prs)}

VARIETY RULES (today must be meaningfully different from last session)
- The athlete's last session was on ${last.date ?? '(none on record)'} where they trained: ${last.exercises.join(', ') || 'n/a'} (session muscle groups: ${last.muscleGroups.join(', ') || 'n/a'}).
- Do NOT repeat the same session type label as last time.
- Do NOT open mainWork with the same primary lift as last session.
- Rotate the split: if last session was an Upper day, today must be a Lower day (or an explicit recovery/mobility day) — and vice versa.
- Check the recent history above and ensure no primary muscle group is trained heavy on consecutive days.
- The coachIntro text must be freshly written for today — not a restatement of a prior day's intro.

STRUCTURAL RULES
- Build a full session: warmup → mainWork → accessories → cooldown.
- Main work: 2-3 compound lifts pulled from the pinned list when applicable. Rotate which compound opens the session — don't always start with the same one.
- Accessories: 3-4 exercises targeting lagging or supporting groups.
- Progressive overload: if the trend shows the same weight on an exercise for 3+ recent sessions, bump it (+5 lbs isolation, +10 lbs compound). Reference the prior best in the relevant note.
- Never schedule a primary muscle group that was hit yesterday for heavy work today — alternate.
- For mobility-style sessions (yoga / stretch / pilates / recovery dominant): sequence dynamic → active → deeper holds → recovery. Use "duration" instead of weight on those rows.
- Honor any extra coaching notes the athlete has set on their profile.

OUTPUT
Return ONE JSON object, no markdown fences, matching this schema:
{
  "sessionType": string,                 // e.g. "Upper A — Strength Focus" or "Mobility — Hip Focus"
  "estimatedDuration": string,           // e.g. "55 min"
  "coachIntro": string,                  // 1-3 sentences explaining the day's intent
  "warmup":      [{ "exercise": string, "duration"?: string, "notes"?: string }],
  "mainWork":    [{ "exercise": string, "category": string, "sets": number, "reps": number, "weight"?: number|null, "restSeconds"?: number, "notes"?: string, "isPinned"?: boolean }],
  "accessories": [{ "exercise": string, "category": string, "sets": number, "reps": number, "weight"?: number|null, "restSeconds"?: number, "notes"?: string, "isPinned"?: boolean }],
  "cooldown":    [{ "exercise": string, "duration"?: string, "notes"?: string }]
}

For mobility-dominant athletes you may put their work in mainWork with "duration" instead of "sets/reps/weight" — that's fine; weight is null for non-loaded work.`;

  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content:
          "Generate today's full workout plan for this athlete. Return ONLY the JSON object — no preamble, no markdown.",
      },
    ],
  });

  const textBlock = resp.content.find((b) => b.type === 'text');
  const raw = textBlock && textBlock.type === 'text' ? textBlock.text : '';
  const jsonStr = extractJSON(raw);
  if (!jsonStr) throw new Error(`No JSON in plan response: ${raw.slice(0, 200)}`);
  const parsed = JSON.parse(jsonStr) as DailyPlan;

  // Normalize: ensure arrays exist, validate exercise names, mark isPinned
  const menu = allExercises(cfg);
  const menuByLower = new Map(menu.map((m) => [m.name.toLowerCase(), m]));
  const pinnedSet = new Set(effectivePinned.map((p) => p.toLowerCase()));

  const fix = (items: PlanItem[] | undefined): PlanItem[] => {
    if (!Array.isArray(items)) return [];
    return items.map((it) => {
      const name = String(it.exercise ?? '').trim();
      const match = menuByLower.get(name.toLowerCase());
      const out: PlanItem = { ...it, exercise: match ? match.name : name };
      if (match) out.category = match.category;
      if (typeof it.sets === 'string') out.sets = Number(it.sets) || undefined;
      if (typeof it.reps === 'string') out.reps = Number(it.reps) || undefined;
      if (typeof it.weight === 'string') out.weight = Number(it.weight) || null;
      out.isPinned = pinnedSet.has(name.toLowerCase());
      return out;
    });
  };

  return {
    sessionType: parsed.sessionType ?? "Today's Session",
    estimatedDuration: parsed.estimatedDuration ?? '',
    coachIntro: parsed.coachIntro ?? '',
    warmup: fix(parsed.warmup),
    mainWork: fix(parsed.mainWork),
    accessories: fix(parsed.accessories),
    cooldown: fix(parsed.cooldown),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const athlete = searchParams.get('athlete');
  const date = searchParams.get('date') ?? todayLocalISO();
  if (!athlete) return NextResponse.json({ error: 'athlete required' }, { status: 400 });
  const { data, error } = await supabase
    .from('gym_daily_plans')
    .select('*')
    .eq('athlete', athlete)
    .eq('plan_date', date)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ plan: null });
  return NextResponse.json({ plan: data.plan, generated_at: data.generated_at });
}

export async function POST(req: NextRequest) {
  if (!anthropic) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const body = await req.json();
  const {
    athlete: athleteId,
    todaySets = [],
    recentHistory = [],
    prs = [],
    pinned = [],
    force = false,
  } = body ?? {};

  if (!athleteId) {
    return NextResponse.json({ error: 'athlete required' }, { status: 400 });
  }

  const { data: athlete, error: athErr } = await supabase
    .from('gym_athletes')
    .select('*')
    .eq('id', athleteId)
    .maybeSingle();
  if (athErr) return NextResponse.json({ error: athErr.message }, { status: 500 });
  if (!athlete) return NextResponse.json({ error: 'unknown athlete' }, { status: 404 });

  const today = todayLocalISO();

  if (!force) {
    const { data: existing } = await supabase
      .from('gym_daily_plans')
      .select('*')
      .eq('athlete', athleteId)
      .eq('plan_date', today)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ plan: existing.plan, generated_at: existing.generated_at, cached: true });
    }
  }

  try {
    const pinnedNames = (pinned as { exercise: string }[]).map((p) => p.exercise);
    const plan = await generatePlan(
      athlete as Athlete,
      todaySets,
      recentHistory,
      prs,
      pinnedNames,
    );

    const { error: saveErr } = await supabase
      .from('gym_daily_plans')
      .upsert(
        { athlete: athleteId, plan_date: today, plan, generated_at: new Date().toISOString() },
        { onConflict: 'athlete,plan_date' },
      );
    if (saveErr) {
      // Still return the plan even if cache save fails
      return NextResponse.json({ plan, cached: false, saveError: saveErr.message });
    }
    return NextResponse.json({ plan, cached: false });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Plan generation error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const athlete = searchParams.get('athlete');
  const date = searchParams.get('date') ?? todayLocalISO();
  if (!athlete) return NextResponse.json({ error: 'athlete required' }, { status: 400 });
  const { error } = await supabase
    .from('gym_daily_plans')
    .delete()
    .eq('athlete', athlete)
    .eq('plan_date', date);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
