import { notFound } from 'next/navigation';
import { fetchAllAthletes, fetchAthlete } from '@/lib/athletes';
import AthleteShell from '@/components/AthleteShell';
import HistoryClient from './HistoryClient';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: { athlete: string } }) {
  const athlete = await fetchAthlete(params.athlete);
  if (!athlete) notFound();
  const all = await fetchAllAthletes();
  return (
    <AthleteShell athlete={athlete} allAthletes={all}>
      <main>
        <section className="section">
          <span className="eyebrow">History</span>
          <HistoryClient athleteId={athlete.id} accent={athlete.accent} />
        </section>
      </main>
    </AthleteShell>
  );
}
