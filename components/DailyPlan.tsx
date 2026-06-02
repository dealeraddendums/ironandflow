'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Athlete } from '@/lib/athletes';
import type { GymSet, GymPR, GymPinned } from '@/lib/supabase';
import type { LogFormPrefill } from './LogForm';

export type PlanItem = {
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

export type DailyPlan = {
  sessionType: string;
  estimatedDuration: string;
  coachIntro: string;
  warmup: PlanItem[];
  mainWork: PlanItem[];
  accessories: PlanItem[];
  cooldown: PlanItem[];
};

type Props = {
  athlete: Athlete;
  todaySets: GymSet[];
  recentHistory: GymSet[];
  prs: GymPR[];
  pinned: GymPinned[];
  // True once the parent has finished its initial data fetch. The plan generator
  // must NOT run before this is true, otherwise it sends empty history to the AI
  // and produces a generic (always-identical) plan.
  dataReady?: boolean;
  onLogThis: (prefill: LogFormPrefill) => void;
  onPlanLoaded?: () => void;
};

const CHECKED_KEY = (a: string, d: string) => `ironflow:planChecked:${a}:${d}`;

const APP_TIMEZONE = 'America/Los_Angeles';

function todayLocalISO() {
  // Match the server: anchor "today" to the app timezone, not the browser's.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function todayLongLabel() {
  // e.g. "June 2, 2026"
  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

function isMobileViewport() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 719px)').matches;
}

export default function DailyPlan({
  athlete,
  todaySets,
  recentHistory,
  prs,
  pinned,
  dataReady = true,
  onLogThis,
  onPlanLoaded,
}: Props) {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [manualChecks, setManualChecks] = useState<Set<string>>(new Set());
  const [regenConfirm, setRegenConfirm] = useState(false);
  const [needsGenerate, setNeedsGenerate] = useState(false);
  const inFlight = useRef(false);
  const today = todayLocalISO();

  // Always keep the freshest copy of the context data so the generator never
  // captures the empty arrays present on the very first render.
  const dataRef = useRef({ todaySets, recentHistory, prs, pinned });
  dataRef.current = { todaySets, recentHistory, prs, pinned };

  // Init collapse state based on viewport
  useEffect(() => {
    setCollapsed(isMobileViewport());
  }, []);

  // Load manual check-offs (from local storage so check state survives across reloads in-day)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CHECKED_KEY(athlete.id, today));
      if (raw) setManualChecks(new Set(JSON.parse(raw)));
    } catch {}
  }, [athlete.id, today]);

  const persistChecks = useCallback(
    (s: Set<string>) => {
      try {
        sessionStorage.setItem(CHECKED_KEY(athlete.id, today), JSON.stringify(Array.from(s)));
      } catch {}
    },
    [athlete.id, today],
  );

  // POST to (re)generate a plan, always sending the freshest context from the ref.
  const generate = useCallback(
    async (force: boolean) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setLoading(true);
      setError(null);
      try {
        const { todaySets, recentHistory, prs, pinned } = dataRef.current;
        const res = await fetch('/api/routine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ athlete: athlete.id, todaySets, recentHistory, prs, pinned, force }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Plan generation failed');
        setNeedsGenerate(false);
        setPlan(data.plan as DailyPlan);
        onPlanLoaded?.();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Plan error');
      } finally {
        setLoading(false);
        inFlight.current = false;
      }
    },
    [athlete.id, onPlanLoaded],
  );

  // 1) On load (or athlete switch) check for today's cached plan. This needs no
  //    history, so it can run immediately. A cache miss flags that we must generate.
  useEffect(() => {
    let cancelled = false;
    setPlan(null);
    setNeedsGenerate(false);
    setError(null);
    setLoading(true);
    fetch(`/api/routine?athlete=${athlete.id}`)
      .then((r) => r.json())
      .then((cached) => {
        if (cancelled) return;
        if (cached?.plan) {
          setPlan(cached.plan as DailyPlan);
          setLoading(false);
          onPlanLoaded?.();
        } else {
          // No plan for today yet — generate once the context data has loaded.
          setNeedsGenerate(true);
        }
      })
      .catch(() => {
        if (!cancelled) setNeedsGenerate(true);
      });
    return () => {
      cancelled = true;
    };
  }, [athlete.id, onPlanLoaded]);

  // 2) Generate the day's plan only after the parent's context data is ready, so
  //    the AI sees real recent history instead of the initial empty arrays.
  useEffect(() => {
    if (needsGenerate && dataReady && !plan && !inFlight.current) {
      generate(false);
    }
  }, [needsGenerate, dataReady, plan, generate]);

  // What's "done" = exercise appears in todaySets OR was manually checked
  const doneSet = useMemo(() => {
    const s = new Set<string>(manualChecks);
    todaySets.forEach((t) => s.add(t.exercise.toLowerCase()));
    return s;
  }, [todaySets, manualChecks]);

  function isDone(ex: string) {
    return doneSet.has(ex.toLowerCase());
  }

  function toggleManualCheck(ex: string) {
    setManualChecks((prev) => {
      const next = new Set(prev);
      const k = ex.toLowerCase();
      if (next.has(k)) next.delete(k);
      else next.add(k);
      persistChecks(next);
      return next;
    });
  }

  async function regenerate() {
    if (!regenConfirm) {
      setRegenConfirm(true);
      setTimeout(() => setRegenConfirm(false), 4000);
      return;
    }
    setRegenConfirm(false);
    setManualChecks(new Set());
    persistChecks(new Set());
    setPlan(null);
    await fetch(`/api/routine?athlete=${athlete.id}`, { method: 'DELETE' });
    generate(true);
  }

  if (loading && !plan) {
    return (
      <div className="suggestion" style={{ ['--accent' as string]: athlete.accent } as React.CSSProperties}>
        <span className="eyebrow">Coach&apos;s Plan</span>
        <div className="skeleton" style={{ height: 28, width: '60%', margin: '10px 0' }} />
        <div className="skeleton" style={{ height: 14, width: '85%', margin: '6px 0' }} />
        <div className="skeleton" style={{ height: 14, width: '70%' }} />
        <div className="skeleton" style={{ height: 50, width: '100%', marginTop: 12 }} />
      </div>
    );
  }

  if (error && !plan) {
    return (
      <div className="suggestion" style={{ ['--accent' as string]: athlete.accent } as React.CSSProperties}>
        <span className="eyebrow">Coach&apos;s Plan</span>
        <p style={{ margin: '8px 0 4px' }}>Couldn&apos;t generate plan — log freely and suggestions will adapt.</p>
        <button className="btn btn-ghost" onClick={() => generate(true)} style={{ marginTop: 8 }}>
          Try again
        </button>
      </div>
    );
  }

  if (!plan) return null;

  const allItems = [
    ...plan.warmup,
    ...plan.mainWork,
    ...plan.accessories,
    ...plan.cooldown,
  ];
  const completedCount = allItems.filter((i) => isDone(i.exercise)).length;

  return (
    <div
      className="suggestion fade-up"
      style={{ ['--accent' as string]: athlete.accent } as React.CSSProperties}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 10,
        }}
      >
        <div>
          <span className="eyebrow">Coach&apos;s Plan · {todayLongLabel()}</span>
          <div className="exercise-name display" style={{ fontSize: 26, margin: '4px 0 0' }}>
            {plan.sessionType.toUpperCase()}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            {plan.estimatedDuration ? `${plan.estimatedDuration} · ` : ''}
            {completedCount}/{allItems.length} done
          </div>
        </div>
        <button
          className="muted"
          onClick={() => setCollapsed((c) => !c)}
          style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}
          aria-label={collapsed ? 'Expand plan' : 'Collapse plan'}
        >
          {collapsed ? 'Show' : 'Hide'}
        </button>
      </div>

      {plan.coachIntro ? (
        <p
          style={{
            margin: '12px 0 0',
            fontSize: 13,
            fontStyle: 'italic',
            color: 'var(--muted)',
            lineHeight: 1.55,
          }}
        >
          {plan.coachIntro}
        </p>
      ) : null}

      {!collapsed && (
        <div style={{ marginTop: 18 }}>
          <PlanSection
            label="Warm-up"
            items={plan.warmup}
            isDone={isDone}
            onLogThis={onLogThis}
            onToggleCheck={toggleManualCheck}
            accent={athlete.accent}
            kind="time"
          />
          <PlanSection
            label="Main Work"
            items={plan.mainWork}
            isDone={isDone}
            onLogThis={onLogThis}
            onToggleCheck={toggleManualCheck}
            accent={athlete.accent}
            kind="lift"
          />
          <PlanSection
            label="Accessories"
            items={plan.accessories}
            isDone={isDone}
            onLogThis={onLogThis}
            onToggleCheck={toggleManualCheck}
            accent={athlete.accent}
            kind="lift"
          />
          <PlanSection
            label="Cooldown"
            items={plan.cooldown}
            isDone={isDone}
            onLogThis={onLogThis}
            onToggleCheck={toggleManualCheck}
            accent={athlete.accent}
            kind="time"
          />
          <div
            style={{
              borderTop: '1px solid var(--border)',
              marginTop: 16,
              paddingTop: 12,
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={regenerate}
              className="muted"
              style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}
            >
              {regenConfirm
                ? '⚠ Tap again to replace today\'s plan'
                : '↻ Regenerate today\'s plan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanSection({
  label,
  items,
  isDone,
  onLogThis,
  onToggleCheck,
  accent,
  kind,
}: {
  label: string;
  items: PlanItem[];
  isDone: (ex: string) => boolean;
  onLogThis: (prefill: LogFormPrefill) => void;
  onToggleCheck: (ex: string) => void;
  accent: string;
  kind: 'lift' | 'time';
}) {
  if (!items?.length) return null;
  return (
    <div style={{ marginTop: 14 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>
        {label}
      </div>
      {items.map((it, idx) => {
        const done = isDone(it.exercise);
        const metric =
          kind === 'time' || (!it.sets && it.duration)
            ? it.duration ?? ''
            : `${it.sets ?? '?'}×${it.reps ?? '?'}${it.weight ? ` @ ${it.weight} lbs` : ''}`;
        return (
          <div
            key={`${it.exercise}-${idx}`}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '10px 0',
              borderTop: idx === 0 ? 'none' : '1px solid var(--border)',
              opacity: done ? 0.55 : 1,
            }}
          >
            <button
              onClick={() => onToggleCheck(it.exercise)}
              aria-label={done ? 'Mark not done' : 'Mark done'}
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                border: `1px solid ${done ? accent : 'var(--border)'}`,
                background: done ? accent : 'transparent',
                color: done ? '#000' : 'transparent',
                fontSize: 12,
                lineHeight: '18px',
                textAlign: 'center',
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              {done ? '✓' : ''}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexWrap: 'wrap',
                  textDecoration: done ? 'line-through' : 'none',
                }}
              >
                <strong style={{ fontWeight: it.isPinned ? 700 : 500 }}>
                  {it.isPinned ? '📌 ' : ''}
                  {it.exercise}
                </strong>
                {it.restSeconds ? (
                  <span
                    className="muted"
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      padding: '2px 6px',
                      borderRadius: 3,
                      border: '1px solid var(--border)',
                    }}
                  >
                    REST {it.restSeconds}s
                  </span>
                ) : null}
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                {metric}
              </div>
              {it.notes ? (
                <div
                  className="muted"
                  style={{ fontSize: 12, marginTop: 4, lineHeight: 1.4 }}
                >
                  {it.notes}
                </div>
              ) : null}
            </div>
            {kind === 'lift' && !done ? (
              <button
                onClick={() => {
                  onLogThis({
                    exercise: it.exercise,
                    category: it.category,
                    sets: typeof it.sets === 'number' ? it.sets : undefined,
                    reps: typeof it.reps === 'number' ? it.reps : undefined,
                    weight: it.weight ?? null,
                  });
                  // Scroll to log form
                  setTimeout(() => {
                    document
                      .querySelector('form input[placeholder="Exercise"]')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 50);
                }}
                className="btn btn-ghost"
                style={{ padding: '6px 10px', fontSize: 11, flexShrink: 0 }}
              >
                Log
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
