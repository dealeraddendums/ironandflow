'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Athlete } from '@/lib/athletes';
import { metricLabelsFor, categoryForExercise } from '@/lib/athletes';

export type LogFormPrefill = Partial<{
  exercise: string;
  category: string;
  sets: number;
  reps: number;
  weight: number | null;
}>;

type Props = {
  athlete: Athlete;
  pinnedNames: string[];
  prefill?: LogFormPrefill | null;
  onLogged: (result: { isPR: boolean }) => void;
};

export default function LogForm({ athlete, pinnedNames, prefill, onLogged }: Props) {
  const [category, setCategory] = useState<string>(athlete.categories[0] ?? '');
  const [exercise, setExercise] = useState('');
  const [sets, setSets] = useState<string>('3');
  const [reps, setReps] = useState<string>('8');
  const [weight, setWeight] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [flashPR, setFlashPR] = useState(false);
  const exerciseRef = useRef<HTMLInputElement>(null);

  const labels = useMemo(() => metricLabelsFor(category || athlete.categories[0] || ''), [category, athlete]);

  // Apply prefill from suggestion
  useEffect(() => {
    if (!prefill) return;
    if (prefill.exercise) setExercise(prefill.exercise);
    if (prefill.category) setCategory(prefill.category);
    if (typeof prefill.sets === 'number') setSets(String(prefill.sets));
    if (typeof prefill.reps === 'number') setReps(String(prefill.reps));
    if (prefill.weight !== undefined)
      setWeight(prefill.weight === null ? '' : String(prefill.weight));
    exerciseRef.current?.focus();
  }, [prefill]);

  const exerciseList = useMemo(() => {
    const inCat = athlete.exercises[category] ?? [];
    // pinned first
    const pinnedSet = new Set(pinnedNames);
    const pinnedInCat = inCat.filter((e) => pinnedSet.has(e));
    const restInCat = inCat.filter((e) => !pinnedSet.has(e));
    return [...pinnedInCat, ...restInCat];
  }, [category, athlete, pinnedNames]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!exercise.trim()) {
      exerciseRef.current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const cat = athlete.exercises[category]?.includes(exercise.trim())
        ? category
        : categoryForExercise(athlete, exercise.trim()) || category;

      const payload: Record<string, unknown> = {
        athlete: athlete.id,
        exercise: exercise.trim(),
        category: cat,
        sets: Number(sets) || 0,
        reps: Number(reps) || 0,
        weight: weight === '' ? null : Number(weight),
        notes: notes.trim() || null,
      };
      const res = await fetch('/api/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      if (data.isPR) {
        setFlashPR(true);
        setTimeout(() => setFlashPR(false), 1800);
      }
      // Clear notes only, keep exercise to encourage multiple sets
      setNotes('');
      onLogged({ isPR: !!data.isPR });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 16 }}>
      <div className="chips" role="tablist">
        {athlete.categories.map((c) => (
          <button
            key={c}
            type="button"
            className={`chip ${c === category ? 'chip-active' : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="field" style={{ marginBottom: 0 }}>
        <input
          ref={exerciseRef}
          list={`ex-${category}`}
          placeholder="Exercise"
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
          autoComplete="off"
        />
        <datalist id={`ex-${category}`}>
          {exerciseList.map((e) => (
            <option key={e} value={e} />
          ))}
        </datalist>
      </div>

      <div className="grid-3">
        <div className="field" style={{ marginBottom: 0 }}>
          <label>{labels.a}</label>
          <input
            type="number"
            inputMode="numeric"
            value={sets}
            onChange={(e) => setSets(e.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>{labels.b}</label>
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>{labels.c}</label>
          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>
      </div>

      <input
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <button
        type="submit"
        className={`btn btn-primary btn-block ${flashPR ? 'pr-fire' : ''}`}
        disabled={submitting}
      >
        {flashPR ? '🏆 New PR!' : submitting ? 'Logging…' : 'Log Set'}
      </button>
    </form>
  );
}
