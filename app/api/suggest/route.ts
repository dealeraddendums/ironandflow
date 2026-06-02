import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import { allExercises, buildCoachPrompt, type Athlete } from '@/lib/athletes';
import {
  buildExerciseMenu,
  dayOfWeek,
  extractJSON,
  prsLine,
  recentMuscleGroups,
  recentTrendOnExercises,
  summarizeSets,
  todayLocalISO,
} from '@/lib/coach';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const apiKey = process.env.ANTHROPIC_API_KEY;
const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

const MODEL = 'claude-sonnet-4-20250514';

type Suggestion = {
  exercise: string;
  category: string;
  sets: number;
  reps: number;
  weight: number | null;
  rationale: string;
  coachNote: string;
  intensity: 'heavy' | 'moderate' | 'light' | 'mobility';
};

type PlanItem = {
  exercise: string;
  category?: string;
  sets?: number;
  reps?: number;
  weight?: number | null;
  duration?: string;
  notes?: string;
  isPinned?: boolean;
};

type DailyPlan = {
  sessionType?: string;
  mainWork?: PlanItem[];
  accessories?: PlanItem[];
  warmup?: PlanItem[];
  cooldown?: PlanItem[];
  coachIntro?: string;
};

function pinnedDoneToday(sets: { exercise: string }[], pinnedNames: string[]): string {
  const doneNames = new Set(sets.map((s) => s.exercise));
  const done = pinnedNames.filter((p) => doneNames.has(p));
  const remaining = pinnedNames.filter((p) => !doneNames.has(p));
  return `Pinned done today: ${done.length ? done.join(', ') : 'none'}. Pinned still pending: ${
    remaining.length ? remaining.join(', ') : 'none'
  }.`;
}

function planProgress(plan: DailyPlan | null, todaySets: { exercise: string }[]): string {
  if (!plan) return '(no daily plan generated yet)';
  const done = new Set(todaySets.map((s) => s.exercise));
  const planned = [
    ...(plan.warmup ?? []),
    ...(plan.mainWork ?? []),
    ...(plan.accessories ?? []),
    ...(plan.cooldown ?? []),
  ];
  const completed = planned.filter((p) => done.has(p.exercise));
  const remaining = planned.filter((p) => !done.has(p.exercise));
  const remainingList = remaining
    .slice(0, 6)
    .map((p) => p.exercise)
    .join(', ');
  return `Today's plan: "${plan.sessionType ?? 'session'}". ${completed.length}/${planned.length} exercises done so far. Remaining (next up): ${remainingList || 'none'}.`;
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
  } = body ?? {};

  if (!athleteId) {
    return NextResponse.json({ error: 'athlete required' }, { status: 400 });
  }

  const { data: athlete, error } = await supabase
    .from('gym_athletes')
    .select('*')
    .eq('id', athleteId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!athlete) return NextResponse.json({ error: 'unknown athlete' }, { status: 404 });

  // Pull today's daily plan if it exists
  const today = todayLocalISO();
  const { data: planRow } = await supabase
    .from('gym_daily_plans')
    .select('plan')
    .eq('athlete', athleteId)
    .eq('plan_date', today)
    .maybeSingle();
  const plan: DailyPlan | null = (planRow?.plan as DailyPlan) ?? null;

  const cfg = athlete as Athlete;
  const pinnedNames: string[] = (pinned as { exercise: string }[]).map((p) => p.exercise);
  const effectivePinned = Array.from(new Set([...pinnedNames, ...(cfg.pinned_default ?? [])]));

  const sessionPosition =
    todaySets.length === 0
      ? 'pre-session (no sets logged yet)'
      : todaySets.length <= 2
      ? 'early in the session'
      : todaySets.length <= 5
      ? 'mid-session'
      : 'late in the session';

  const planContext = plan
    ? `
TODAY'S PLAN (already generated for this athlete):
- Session type: ${plan.sessionType ?? '(unknown)'}
- Coach intro: ${plan.coachIntro ?? ''}
- Main work planned: ${(plan.mainWork ?? []).map((p) => p.exercise).join(', ') || 'n/a'}
- Accessories planned: ${(plan.accessories ?? []).map((p) => p.exercise).join(', ') || 'n/a'}
- Plan progress so far: ${planProgress(plan, todaySets)}

The athlete is following this plan today. Default to suggesting the next un-completed planned exercise in order. If you propose an alternative (because they're short on time, fatigued, or context demands it), say so explicitly in the rationale.
`
    : '\n(No plan generated for today — suggest free-form based on goals & history.)\n';

  const systemPrompt = `${buildCoachPrompt(cfg)}

AVAILABLE EXERCISES (you MUST pick one of these — exact name match):
${buildExerciseMenu(cfg)}

CONTEXT FOR THIS SUGGESTION
- Day of week: ${dayOfWeek()}
- Session position: ${sessionPosition}
- Logged today so far:
${summarizeSets(todaySets, 'logged today')}
- Muscle groups trained in last 48h: ${recentMuscleGroups(recentHistory)}
- Recent trend on key exercises (last 3 sessions each):
${recentTrendOnExercises(recentHistory)}
- Current PRs: ${prsLine(prs)}
- ${pinnedDoneToday(todaySets, effectivePinned)}
${planContext}

RESPONSE RULES
- Reply with ONE JSON object only, no markdown, no prose around it.
- "exercise" MUST be an exact match from the available exercises list above.
- "category" MUST match the category of the exercise.
- "weight" is a number for weighted lifts; null for bodyweight or mobility/yoga/stretch/recovery.
- Reference plan progress in your rationale when relevant (e.g. "You're 3 of 5 through today's plan — Incline Curl is next").
- If the athlete held the same weight for 3+ recent sessions on this exercise, bump it (5 lbs isolation, 10 lbs compound).
- If a PR exists for the suggested exercise, reference the prior best in "rationale".
- "intensity": "heavy" / "moderate" / "light" / "mobility".
- Keep "rationale" to 1-2 sentences. Keep "coachNote" to a short cue.

OUTPUT SCHEMA (return exactly this shape):
{
  "exercise": string,
  "category": string,
  "sets": number,
  "reps": number,
  "weight": number | null,
  "rationale": string,
  "coachNote": string,
  "intensity": "heavy" | "moderate" | "light" | "mobility"
}`;

  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content:
            'Suggest the single best next exercise/set for me right now. Return ONLY the JSON object — no preamble, no markdown fences.',
        },
      ],
    });

    const textBlock = resp.content.find((b) => b.type === 'text');
    const raw = textBlock && textBlock.type === 'text' ? textBlock.text : '';
    const jsonStr = extractJSON(raw);
    if (!jsonStr) throw new Error(`No JSON in response: ${raw.slice(0, 200)}`);
    const parsed = JSON.parse(jsonStr) as Suggestion;

    const menu = allExercises(cfg);
    const match = menu.find(
      (m) => m.name.toLowerCase() === String(parsed.exercise).toLowerCase(),
    );
    if (match) {
      parsed.exercise = match.name;
      parsed.category = match.category;
    }
    parsed.sets = Number(parsed.sets) || 3;
    parsed.reps = Number(parsed.reps) || 8;
    parsed.weight =
      parsed.weight === null || parsed.weight === undefined ? null : Number(parsed.weight);
    if (!parsed.intensity) parsed.intensity = 'moderate';

    return NextResponse.json(parsed);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'AI error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
