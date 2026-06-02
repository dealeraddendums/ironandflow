import Link from 'next/link';
import { fetchAllAthletes } from '@/lib/athletes';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const athletes = await fetchAllAthletes();
  return (
    <div className="shell">
      <header className="app-header" style={{ borderBottom: 'none', marginBottom: 18 }}>
        <span className="title">Iron / Flow</span>
      </header>
      <p className="muted" style={{ marginTop: 0, marginBottom: 24 }}>
        Choose a profile.
      </p>
      <div>
        {athletes.map((a) => (
          <Link key={a.id} href={`/${a.id}`} className="athlete-tile">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span className="dot" style={{ background: a.accent }} />
              <div>
                <div className="display" style={{ fontSize: 22, letterSpacing: '0.08em' }}>
                  {a.name.toUpperCase()}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {a.focus}
                </div>
              </div>
            </div>
            <span className="muted">→</span>
          </Link>
        ))}
        <Link
          href="/onboard"
          className="athlete-tile"
          style={{ justifyContent: 'center', color: 'var(--muted)' }}
        >
          ＋ Add athlete
        </Link>
      </div>
    </div>
  );
}
