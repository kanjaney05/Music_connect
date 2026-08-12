export default function HomePage({
  dashboard,
  isLoading,
  onEnroll,
  onRequest,
  currentUser,
  canEnroll,
  canRequest,
  publicServiceProviders = [],
  onContactProvider,
  isLanding = false,
}) {
  const isConsumer = currentUser?.role === 'CONSUMER'

  if (!isLanding) {
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
            {canEnroll ? (
              <button className="button primary" type="button" onClick={onEnroll}>
                Enroll a musician
              </button>
            ) : null}
            {canRequest ? (
              <button className="button secondary" type="button" onClick={onRequest}>
                Request a performance
              </button>
            ) : null}
          </div>
          {currentUser ? <p className="role-chip">Signed in as {currentUser.email} · {currentUser.role}</p> : null}
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

  return (
    <div className="landing-stack">
      <section className="hero card section-anchor landing-hero">
        <div className="hero-copy">
          <p className="eyebrow">Community music network</p>
          <h1>Welcome to Music Connect!</h1>
          <p className="hero-text">
            Welcome to Music Connect! This is the hub of local musicians that want opportunities to play in events happening in their local communities.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#service-providers">
              View service provider profiles
            </a>
            {onRequest ? (
              <button className="button secondary" type="button" onClick={onRequest}>
                Request a performance
              </button>
            ) : null}
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

      <section id="service-providers" className="card list-card landing-section-card section-anchor">
        <div className="section-head">
          <p className="eyebrow">Service provider profiles</p>
          <h2>Browse musicians ready to play</h2>
        </div>

        <div className="card-list public-grid">
          {publicServiceProviders.length > 0 ? (
            publicServiceProviders.map((provider) => (
              <article className="profile-card public-profile-card" key={provider.id}>
                <div className="profile-head">
                  <h3>{provider.full_name}</h3>
                  <p>{provider.instrument}</p>
                </div>
                <p>{provider.city}</p>
                <p>{provider.bio}</p>
                <div className="card-meta">
                  <span>{provider.rate}</span>
                  <span>{provider.available_weekends ? 'Weekend availability' : 'Weekday-only'}</span>
                </div>
                <div className="card-meta">
                  <span>Preferred event: {provider.preferred_event_type || 'Any event'}</span>
                  <span>Requests by {provider.preferred_contact_method === 'phone' ? 'phone' : 'email'}</span>
                </div>
                <div className="profile-actions">
                  <button
                    className="button secondary slim-button contact-button"
                    type="button"
                    disabled={Boolean(currentUser) && !isConsumer}
                    onClick={() => onContactProvider?.(provider)}
                  >
                    {isConsumer ? 'Email provider' : currentUser ? 'Consumers only' : 'Sign in to email'}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <article className="loading-state public-empty-state">{isLoading ? 'Loading profiles…' : 'No public profiles yet.'}</article>
          )}
        </div>
      </section>
    </div>
  )
}
