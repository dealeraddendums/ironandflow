'use client';
import { useEffect } from 'react';
import AthleteHeader from './AthleteHeader';
import BottomNav from './BottomNav';
import type { Athlete } from '@/lib/athletes';

export default function AthleteShell({
  athlete,
  allAthletes,
  children,
}: {
  athlete: Athlete;
  allAthletes: Athlete[];
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', athlete.accent);
  }, [athlete.accent]);

  return (
    <div className="shell">
      <AthleteHeader athlete={athlete} allAthletes={allAthletes} />
      {children}
      <BottomNav athlete={athlete} />
    </div>
  );
}
