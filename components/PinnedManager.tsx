'use client';
import { useMemo, useState } from 'react';
import type { Athlete } from '@/lib/athletes';
import type { GymPinned } from '@/lib/supabase';
import { allExercises } from '@/lib/athletes';

export default function PinnedManager({
  athlete,
  pinned,
  onChange,
}: {
  athlete: Athlete;
  pinned: GymPinned[];
  onChange: () => void;
}) {
  const all = useMemo(() => allExercises(athlete), [athlete]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const pinnedSet = new Set(pinned.map((p) => p.exercise));
  const filtered = all.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()));
  const sorted = filtered.sort((a, b) => {
    const ap = pinnedSet.has(a.name) ? 0 : 1;
    const bp = pinnedSet.has(b.name) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return a.name.localeCompare(b.name);
  });

  async function toggle(name: string, category: string) {
    setBusy(name);
    try {
      if (pinnedSet.has(name)) {
        await fetch(
          `/api/pinned?athlete=${athlete.id}&exercise=${encodeURIComponent(name)}`,
          { method: 'DELETE' },
        );
      } else {
        await fetch('/api/pinned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ athlete: athlete.id, exercise: name, category, priority: 1 }),
        });
      }
      onChange();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        Pinned exercises are prioritized in AI suggestions and autocomplete.
      </p>
      <input
        placeholder="Search exercises"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 16 }}
      />
      <div>
        {sorted.map((e) => {
          const isPinned = pinnedSet.has(e.name);
          return (
            <div key={e.name} className="pin-row">
              <div>
                <div style={{ fontWeight: 500 }}>{e.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {e.category}
                </div>
              </div>
              <button
                onClick={() => toggle(e.name, e.category)}
                disabled={busy === e.name}
                aria-label={isPinned ? 'Unpin' : 'Pin'}
                style={{
                  fontSize: 22,
                  color: isPinned ? athlete.accent : 'var(--muted)',
                  padding: 4,
                }}
              >
                {isPinned ? '★' : '☆'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
