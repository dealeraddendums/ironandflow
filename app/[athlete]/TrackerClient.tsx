'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Athlete } from '@/lib/athletes';
import type { GymSet, GymPR, GymPinned } from '@/lib/supabase';
import LogForm, { type LogFormPrefill } from '@/components/LogForm';
import TodaySession from '@/components/TodaySession';
import StatsBar from '@/components/StatsBar';
import AISuggestion from '@/components/AISuggestion';
import WeeklyChart from '@/components/WeeklyChart';
import DailyPlan from '@/components/DailyPlan';
import type { Suggestion } from '@/lib/ai';

function todayLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function TrackerClient({ athlete }: { athlete: Athlete }) {
  const [todaySets, setTodaySets] = useState<GymSet[]>([]);
  const [recent, setRecent] = useState<GymSet[]>([]);
  const [prs, setPrs] = useState<GymPR[]>([]);
  const [pinned, setPinned] = useState<GymPinned[]>([]);
  const [prefill, setPrefill] = useState<LogFormPrefill | null>(null);
  const [trigger, setTrigger] = useState(0);
  const [dataReady, setDataReady] = useState(false);

  const reload = useCallback(async () => {
    const today = todayLocalISO();
    const sinceIso = new Date(Date.now() - 14 * 24 * 3600_000).toISOString();
    const [todayRes, recentRes, prRes, pinRes] = await Promise.all([
      fetch(`/api/sets?athlete=${athlete.id}&day=${today}&limit=200`).then((r) => r.json()),
      fetch(`/api/sets?athlete=${athlete.id}&since=${sinceIso}&limit=500`).then((r) => r.json()),
      fetch(`/api/prs?athlete=${athlete.id}`).then((r) => r.json()),
      fetch(`/api/pinned?athlete=${athlete.id}`).then((r) => r.json()),
    ]);
    setTodaySets(Array.isArray(todayRes) ? todayRes : []);
    setRecent(Array.isArray(recentRes) ? recentRes : []);
    setPrs(Array.isArray(prRes) ? prRes : []);
    setPinned(Array.isArray(pinRes) ? pinRes : []);
    setDataReady(true);
  }, [athlete.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function deleteSet(id: string) {
    await fetch(`/api/sets/${id}`, { method: 'DELETE' });
    reload();
  }

  function onLogged() {
    reload().then(() => setTrigger((t) => t + 1));
  }

  function applySuggestion(s: Suggestion | LogFormPrefill) {
    setPrefill({
      exercise: s.exercise,
      category: s.category,
      sets: s.sets,
      reps: s.reps,
      weight: s.weight ?? null,
    });
  }

  const isVolumeMode =
    athlete.categories.some((c) => ['Push', 'Pull', 'Legs', 'Strength'].includes(c)) &&
    !athlete.categories.every((c) => ['Yoga', 'Stretch', 'Recovery', 'Pilates'].includes(c));

  const pinnedNames = [...new Set([...pinned.map((p) => p.exercise), ...athlete.pinned_default])];

  return (
    <main>
      <section className="section">
        <StatsBar athlete={athlete} todaySets={todaySets} recentSets={recent} prs={prs} />
      </section>

      <section className="section">
        <DailyPlan
          athlete={athlete}
          todaySets={todaySets}
          recentHistory={recent}
          prs={prs}
          pinned={pinned}
          dataReady={dataReady}
          onLogThis={applySuggestion}
        />
      </section>

      <section className="section">
        <LogForm
          athlete={athlete}
          pinnedNames={pinnedNames}
          prefill={prefill}
          onLogged={onLogged}
        />
      </section>

      <section className="section">
        <AISuggestion
          athlete={athlete}
          todaySets={todaySets}
          recentHistory={recent}
          prs={prs}
          pinned={pinned}
          triggerKey={trigger}
          onLogThis={applySuggestion}
        />
      </section>

      <section className="section">
        <TodaySession sets={todaySets} onDelete={deleteSet} />
      </section>

      <section className="section">
        <span className="eyebrow">Last 7 Days</span>
        <WeeklyChart
          athlete={athlete}
          sets={recent}
          mode={isVolumeMode ? 'volume' : 'sets'}
        />
      </section>
    </main>
  );
}
