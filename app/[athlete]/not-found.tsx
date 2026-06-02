import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="shell">
      <header className="app-header" style={{ marginBottom: 18 }}>
        <Link href="/" className="title">
          Iron / Flow
        </Link>
      </header>
      <main className="section">
        <h2 className="display" style={{ fontSize: 28 }}>
          ATHLETE NOT FOUND
        </h2>
        <p className="muted">No profile here yet.</p>
        <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
          <Link href="/" className="btn btn-ghost">
            Back to profiles
          </Link>
          <Link href="/onboard" className="btn btn-primary" style={{ background: '#fff', color: '#000' }}>
            Create profile
          </Link>
        </div>
      </main>
    </div>
  );
}
