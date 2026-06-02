import { notFound } from 'next/navigation';
import { fetchAllAthletes, fetchAthlete } from '@/lib/athletes';
import AthleteShell from '@/components/AthleteShell';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: { athlete: string } }) {
  const athlete = await fetchAthlete(params.athlete);
  if (!athlete) notFound();
  const all = await fetchAllAthletes();
  return (
    <AthleteShell athlete={athlete} allAthletes={all}>
      <main>
        <section className="section">
          <span className="eyebrow">Settings</span>
          <SettingsClient athlete={athlete} />
        </section>
      </main>
    </AthleteShell>
  );
}
