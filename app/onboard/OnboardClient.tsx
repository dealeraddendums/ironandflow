'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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

export default function OnboardClient() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [accent, setAccent] = useState('#9aa6ff');
  const [focus, setFocus] = useState('');
  const [trainingDays, setTrainingDays] = useState('4');
  const [split, setSplit] = useState('');
  const [facility, setFacility] = useState('');
  const [goals, setGoals] = useState('');
  const [exText, setExText] = useState(
    'Push: Bench Press, Overhead Press, Dips\nPull: Pull-ups, Row, Bicep Curl\nLegs: Squat, Deadlift, Lunges\nCore: Plank, Hanging Leg Raise',
  );
  const [pinnedDefault, setPinnedDefault] = useState('');
  const [coachExtra, setCoachExtra] = useState('');
  const [busy, setBusy] = useState(false);

  function autoSlug(n: string) {
    return n.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return alert('Name required');
    const id = (slug || autoSlug(name)).trim();
    if (!id) return alert('Could not derive a slug — try a different name');
    setBusy(true);
    try {
      const { categories, exercises } = textToExercises(exText);
      if (categories.length === 0) {
        alert('Add at least one category & exercise');
        setBusy(false);
        return;
      }
      const payload = {
        id,
        name: name.trim(),
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
      const res = await fetch('/api/athletes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      router.push(`/${id}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 18 }}>
      <div className="field">
        <label>Name</label>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slug) setSlug(autoSlug(e.target.value));
          }}
          placeholder="e.g. Alex"
        />
      </div>
      <div className="field">
        <label>URL slug</label>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="alex"
        />
        <span className="help">Your page will be at /{slug || 'your-name'}</span>
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
        <input
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="e.g. Strength & Hypertrophy"
        />
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
        <input
          value={split}
          onChange={(e) => setSplit(e.target.value)}
          placeholder="e.g. Push / Pull / Legs"
        />
      </div>
      <div className="field">
        <label>Facility / equipment</label>
        <input
          value={facility}
          onChange={(e) => setFacility(e.target.value)}
          placeholder="e.g. commercial gym, full barbell + DBs"
        />
      </div>
      <div className="field">
        <label>Goals (one per line)</label>
        <textarea
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          placeholder={'Add 20 lbs to squat\nImprove conditioning\nFix shoulder mobility'}
        />
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
          placeholder="e.g. Squat, Deadlift, Bench Press"
        />
      </div>
      <div className="field">
        <label>Coaching notes for AI (optional)</label>
        <textarea
          value={coachExtra}
          onChange={(e) => setCoachExtra(e.target.value)}
          placeholder="Anything the coach should keep in mind — old injuries, focus weeks, etc."
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="btn btn-primary btn-block"
        style={{ background: accent }}
      >
        {busy ? 'Saving…' : 'Create profile'}
      </button>
    </form>
  );
}
