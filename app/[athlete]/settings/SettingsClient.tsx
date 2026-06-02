'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Athlete } from '@/lib/athletes';
import type { GymPinned } from '@/lib/supabase';
import PinnedManager from '@/components/PinnedManager';
import ProfileEditor from '@/components/ProfileEditor';

export default function SettingsClient({ athlete }: { athlete: Athlete }) {
  const [pinned, setPinned] = useState<GymPinned[]>([]);

  const load = useCallback(async () => {
    const data = await fetch(`/api/pinned?athlete=${athlete.id}`).then((r) => r.json());
    setPinned(Array.isArray(data) ? data : []);
  }, [athlete.id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h3 className="display" style={{ fontSize: 22, letterSpacing: '0.06em', margin: '8px 0 14px' }}>
          PROFILE
        </h3>
        <ProfileEditor athlete={athlete} />
      </div>
      <div>
        <h3 className="display" style={{ fontSize: 22, letterSpacing: '0.06em', margin: '8px 0 14px' }}>
          PINNED EXERCISES
        </h3>
        <PinnedManager athlete={athlete} pinned={pinned} onChange={load} />
      </div>
    </div>
  );
}
