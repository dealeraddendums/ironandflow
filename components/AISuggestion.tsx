'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Athlete } from '@/lib/athletes';
import type { GymSet, GymPR, GymPinned } from '@/lib/supabase';
import type { Suggestion } from '@/lib/ai';
import { fetchSuggestion, postFeedback } from '@/lib/ai';

type Props = {
  athlete: Athlete;
  todaySets: GymSet[];
  recentHistory: GymSet[];
  prs: GymPR[];
  pinned: GymPinned[];
  triggerKey: number; // bumped by parent after each log
  onLogThis: (s: Suggestion) => void;
};

const CACHE_PREFIX = 'ironflow:lastSuggestion:';

export default function AISuggestion({
  athlete,
  todaySets,
  recentHistory,
  prs,
  pinned,
  triggerKey,
  onLogThis,
}: Props) {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [cached, setCached] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (typeof window === 'undefined') return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setCached(false);
    setFeedback(null);
    try {
      const s = await fetchSuggestion(
        { athlete: athlete.id, todaySets, recentHistory, prs, pinned },
        ac.signal,
      );
      setSuggestion(s);
      sessionStorage.setItem(CACHE_PREFIX + athlete.id, JSON.stringify(s));
    } catch (e: unknown) {
      if ((e as Error).name === 'AbortError') return;
      try {
        const last = sessionStorage.getItem(CACHE_PREFIX + athlete.id);
        if (last) {
          setSuggestion(JSON.parse(last));
          setCached(true);
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  }, [athlete.id, todaySets, recentHistory, prs, pinned]);

  // Trigger: page load if sets exist OR every time triggerKey changes (after log)
  useEffect(() => {
    if (triggerKey === 0 && todaySets.length === 0) return;
    const t = setTimeout(() => load(), triggerKey === 0 ? 0 : 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerKey]);

  if (!suggestion && !loading) return null;

  return (
    <div
      className="suggestion fade-up"
      style={{ ['--accent' as string]: athlete.accent } as React.CSSProperties}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="eyebrow">Coach says</span>
        {cached ? <span className="muted" style={{ fontSize: 11 }}>cached</span> : null}
      </div>
      {loading && !suggestion ? (
        <>
          <div className="skeleton" style={{ height: 36, width: '70%', margin: '8px 0' }} />
          <div className="skeleton" style={{ height: 14, width: '90%', margin: '8px 0' }} />
          <div className="skeleton" style={{ height: 14, width: '60%' }} />
        </>
      ) : (
        suggestion && (
          <>
            <div className="exercise-name display">{suggestion.exercise}</div>
            <div className="row" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <span style={{ fontSize: 15 }}>
                {suggestion.sets} × {suggestion.reps}
                {suggestion.weight ? ` @ ${suggestion.weight} lbs` : ''}
              </span>
              <span className={`intensity-badge intensity-${suggestion.intensity}`}>
                {suggestion.intensity}
              </span>
            </div>
            <p style={{ margin: '6px 0', fontSize: 14, color: 'var(--text)' }}>
              {suggestion.rationale}
            </p>
            <p style={{ margin: '4px 0 16px', fontSize: 13, fontStyle: 'italic', color: 'var(--muted)' }}>
              {suggestion.coachNote}
            </p>
            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, background: athlete.accent }}
                onClick={() => {
                  onLogThis(suggestion);
                  postFeedback(athlete.id, suggestion, true);
                  setFeedback('up');
                }}
              >
                ✓ Log This
              </button>
              <button className="btn btn-ghost" onClick={() => load()} disabled={loading}>
                {loading ? '…' : 'Skip →'}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
              <button
                aria-label="thumbs up"
                onClick={() => {
                  postFeedback(athlete.id, suggestion, true);
                  setFeedback('up');
                }}
                style={{
                  fontSize: 16,
                  opacity: feedback === 'up' ? 1 : 0.4,
                  color: feedback === 'up' ? athlete.accent : 'var(--muted)',
                }}
              >
                👍
              </button>
              <button
                aria-label="thumbs down"
                onClick={() => {
                  postFeedback(athlete.id, suggestion, false);
                  setFeedback('down');
                  setTimeout(() => load(), 200);
                }}
                style={{
                  fontSize: 16,
                  opacity: feedback === 'down' ? 1 : 0.4,
                  color: feedback === 'down' ? '#ff7a4d' : 'var(--muted)',
                }}
              >
                👎
              </button>
            </div>
          </>
        )
      )}
    </div>
  );
}
