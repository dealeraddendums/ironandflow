'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Athlete } from '@/lib/athletes';

function exercisesToText(exercises: Record<string, string[]>, categories: string[]): string {
  return categories.map((c) => `${c}: ${(exercises[c] ?? []).join(', ')}`).join('\n');
}

function textToExercises(text: string): {
  categories: string[];
  exercises: Record<string, string[]>;
} {
  const cats: string[] = [];
  const out: Record<string, string[]> = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const cat = line.slice(0, idx).trim();
    const items = line
      .slice(idx + 1)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!cat || items.length === 0) continue;
    cats.push(cat);
    out[cat] = items;
  }
  return { categories: cats, exercises: out };
}

export default function ProfileEditor({ athlete }: { athlete: Athlete }) {
  const router = useRouter();
  const [name, setName] = useState(athlete.name);
  const [accent, setAccent] = useState(athlete.accent);
  const [focus, setFocus] = useState(athlete.focus);
  const [trainingDays, setTrainingDays] = useState(String(athlete.training_days));
  const [split, setSplit] = useState(athlete.split);
  const [facility, setFacility] = useState(athlete.facility ?? '');
  const [goals, setGoals] = useState((athlete.goals ?? []).join('\n'));
  const [exText, setExText] = useState(
    exercisesToText(athlete.exercises ?? {}, athlete.categories ?? []),
  );
  const [pinnedDefault, setPinnedDefault] = useState((athlete.pinned_default ?? []).join(', '));
  const [coachExtra, setCoachExtra] = useState(athlete.coach_extra ?? '');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const { categories, exercises } = textToExercises(exText);
      const payload = {
        name,
        accent,
        focus,
        training_days: Number(trainingDays) || 3,
        split,
        facility,
        goals: goals
          .split('\n')
          .map((g) => g.trim())
          .filter(Boolean),
        categories,
        exercises,
        pinned_default: pinnedDefault
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean),
        coach_extra: coachExtra,
      };
      const res = await fetch(`/api/athletes/${athlete.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      router.refresh();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${athlete.name}'s profile? All their data stays in the DB but the profile is removed.`))
      return;
    const res = await fetch(`/api/athletes/${athlete.id}`, { method: 'DELETE' });
    if (res.ok) router.push('/');
  }

  return (
    <div>
      <div className="field">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Accent color</label>
        <div className="row">
          <input value={accent} onChange={(e) => setAccent(e.target.value)} />
          <input
            type="color"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            style={{ width: 48, padding: 0, height: 44 }}
          />
        </div>
      </div>
      <div className="field">
        <label>Focus</label>
        <input value={focus} onChange={(e) => setFocus(e.target.value)} />
      </div>
      <div className="field">
        <label>Training days / week</label>
        <input
          type="number"
          value={trainingDays}
          onChange={(e) => setTrainingDays(e.target.value)}
        />
      </div>
      <div className="field">
        <label>Split</label>
        <input value={split} onChange={(e) => setSplit(e.target.value)} />
      </div>
      <div className="field">
        <label>Facility / equipment</label>
        <input
          value={facility}
          onChange={(e) => setFacility(e.target.value)}
          placeholder="e.g. home gym (rack, barbell, DBs)"
        />
      </div>
      <div className="field">
        <label>Goals (one per line)</label>
        <textarea value={goals} onChange={(e) => setGoals(e.target.value)} />
      </div>
      <div className="field">
        <label>Exercise menu</label>
        <p className="help">
          One category per line: <code>Category: ex1, ex2, ex3</code>
        </p>
        <textarea
          value={exText}
          onChange={(e) => setExText(e.target.value)}
          style={{ minHeight: 180 }}
        />
      </div>
      <div className="field">
        <label>Pinned (non-negotiable) exercises, comma separated</label>
        <input
          value={pinnedDefault}
          onChange={(e) => setPinnedDefault(e.target.value)}
        />
      </div>
      <div className="field">
        <label>Coaching notes for AI (optional)</label>
        <textarea value={coachExtra} onChange={(e) => setCoachExtra(e.target.value)} />
      </div>
      <div className="row" style={{ gap: 10, marginTop: 12 }}>
        <button
          onClick={save}
          disabled={busy}
          className="btn btn-primary"
          style={{ background: athlete.accent, flex: 1 }}
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button onClick={remove} className="btn btn-ghost" style={{ color: '#ff7a4d' }}>
          Delete profile
        </button>
      </div>
    </div>
  );
}
