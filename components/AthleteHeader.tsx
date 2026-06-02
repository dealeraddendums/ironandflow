'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Athlete } from '@/lib/athletes';

export default function AthleteHeader({
  athlete,
  allAthletes,
}: {
  athlete: Athlete;
  allAthletes: Athlete[];
}) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const base = `/${athlete.id}`;
  const tab = (suffix: string) =>
    pathname === `${base}${suffix}` || (suffix === '' && pathname === base);

  function onSwitch(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (next === '__new__') {
      router.push('/onboard');
    } else {
      router.push(`/${next}`);
    }
  }

  return (
    <>
      <header className="app-header">
        <Link href="/" className="title">
          Iron / Flow
        </Link>
        <div className="switcher">
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: athlete.accent }} />
          <select value={athlete.id} onChange={onSwitch} aria-label="Switch athlete">
            {allAthletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
            <option value="__new__">＋ Add athlete</option>
          </select>
        </div>
      </header>
      <nav className="tabs">
        <Link href={`${base}`} data-active={tab('')}>
          Log
        </Link>
        <Link href={`${base}/history`} data-active={tab('/history')}>
          History
        </Link>
        <Link href={`${base}/prs`} data-active={tab('/prs')}>
          PRs
        </Link>
        <Link href={`${base}/settings`} data-active={tab('/settings')}>
          Settings
        </Link>
      </nav>
    </>
  );
}
