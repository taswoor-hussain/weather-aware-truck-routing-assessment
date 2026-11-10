function App() {
  return (
    <main className="app-shell">
      <header className="brand">
        <span className="brand-mark" aria-hidden="true">
          ↗
        </span>
        <span>Roadwise</span>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <span className="eyebrow">Weather-aware truck routing</span>
        <h1 id="page-title">Plan a safer trip.</h1>
        <p>
          Compare routes using the weather your truck is expected to encounter,
          your cargo weight, and time on the road.
        </p>
      </section>

      <section className="setup-card" aria-label="Project setup status">
        <div>
          <h2>Trip planner foundation</h2>
          <p>The React shell and Django health endpoint are ready for integration.</p>
        </div>
        <span className="status">Setup complete</span>
      </section>
    </main>
  )
}

export default App
