export default function HomePage({ dashboard, isLoading, onEnroll, onRequest }) {
  return (
    <section className="hero card section-anchor">
      <div className="hero-copy">
        <p className="eyebrow">Community music network</p>
        <h1>Connect local musicians with the events that need live sound.</h1>
        <p className="hero-text">
          Music Connect helps community organizers discover musicians for neighborhood gatherings, nonprofit events, school
          programs, and celebrations while giving performers a place to enroll and share their details.
        </p>
        <div className="hero-actions">
          <button className="button primary" type="button" onClick={onEnroll}>
            Enroll a musician
          </button>
          <button className="button secondary" type="button" onClick={onRequest}>
            Request a performance
          </button>
        </div>
      </div>

      <div className="hero-panel">
        {dashboard ? (
          <>
            <div className="stat-grid">
              <article>
                <strong>{dashboard.musician_count}</strong>
                <span>enrolled musicians</span>
              </article>
              <article>
                <strong>{dashboard.event_count}</strong>
                <span>community events</span>
              </article>
              <article>
                <strong>{dashboard.request_count}</strong>
                <span>performance requests</span>
              </article>
              <article>
                <strong>{dashboard.community_impact_score}</strong>
                <span>impact score</span>
              </article>
            </div>
            <div className="spotlight">
              <span>Featured idea</span>
              <h2>Weekend piano sets for public gatherings</h2>
              <p>Perfect for warm introductions, family programming, and community dinners.</p>
            </div>
          </>
        ) : (
          <div className="loading-state">{isLoading ? 'Loading community network…' : 'Community data unavailable.'}</div>
        )}
      </div>
    </section>
  )
}
