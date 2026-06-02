'use client';
import { useEffect, useState } from 'react';
import type { GymPR } from '@/lib/supabase';
import PRTable from '@/components/PRTable';

export default function PRsClient({ athleteId, accent }: { athleteId: string; accent: string }) {
  const [prs, setPrs] = useState<GymPR[] | null>(null);
  useEffect(() => {
    fetch(`/api/prs?athlete=${athleteId}`)
      .then((r) => r.json())
      .then((d) => setPrs(Array.isArray(d) ? d : []));
  }, [athleteId]);
  if (prs === null) return <p className="muted">Loading…</p>;
  return <PRTable prs={prs} accent={accent} />;
}
