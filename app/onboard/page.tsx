import OnboardClient from './OnboardClient';

export default function Page() {
  return (
    <div className="shell">
      <header className="app-header" style={{ marginBottom: 18 }}>
        <a href="/" className="title">
          Iron / Flow
        </a>
      </header>
      <main>
        <section className="section">
          <span className="eyebrow">New Athlete</span>
          <h2 className="display" style={{ fontSize: 32, letterSpacing: '0.04em', margin: '6px 0 16px' }}>
            SET UP YOUR PROFILE
          </h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Fill in your training focus, goals, and the exercises you actually use. Everything can be edited later in Settings.
          </p>
          <OnboardClient />
        </section>
      </main>
    </div>
  );
}
