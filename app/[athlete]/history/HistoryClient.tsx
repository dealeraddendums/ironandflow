'use client';
import { useCallback, useEffect, useState } from 'react';
import type { GymSet } from '@/lib/supabase';
import HistoryList from '@/components/HistoryList';

export default function HistoryClient({
  athleteId,
  accent,
}: {
  athleteId: string;
  accent: string;
}) {
  const [sets, setSets] = useState<GymSet[] | null>(null);

  const load = useCallback(async () => {
    const data = await fetch(`/api/sets?athlete=${athleteId}&limit=2000`).then((r) => r.json());
    setSets(Array.isArray(data) ? data : []);
  }, [athleteId]);

  useEffect(() => {
    load();
  }, [load]);

  async function del(id: string) {
    await fetch(`/api/sets/${id}`, { method: 'DELETE' });
    load();
  }

  if (sets === null) return <p className="muted">Loading…</p>;
  return <HistoryList sets={sets} onDelete={del} accent={accent} />;
}
