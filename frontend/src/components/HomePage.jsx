export default function HomePage({
  dashboard,
  isLoading,
  onRequest,
  currentUser,
  canRequest,
  publicServiceProviders = [],
  onContactProvider,
  performanceRequests = [],
  serviceProfiles = [],
  isLanding = false,
}) {
  const isConsumer = currentUser?.role === 'CONSUMER'
  const isServiceProvider = currentUser?.role === 'SERV-PROVIDER'
  const requestedEvents = isConsumer
    ? [...performanceRequests].sort(
        (left, right) =>
          Number(right.provider_available && right.provider_willing) - Number(left.provider_available && left.provider_willing),
      )
    : []

  const providerProfiles = isServiceProvider ? serviceProfiles : []
  const providerTableRows = providerProfiles.map((profile) => {
    const profileRequests = performanceRequests.filter(
      (performanceRequest) => String(performanceRequest.musician_id) === String(profile.id),
    )
    const upcomingEvents = profileRequests
      .filter((performanceRequest) => new Date(performanceRequest.event_datetime).getTime() >= Date.now())
      .sort((left, right) => new Date(left.event_datetime) - new Date(right.event_datetime))
    const pastEvents = profileRequests
      .filter((performanceRequest) => new Date(performanceRequest.event_datetime).getTime() < Date.now())
      .sort((left, right) => new Date(right.event_datetime) - new Date(left.event_datetime))
    const publicProfile = publicServiceProviders.find((provider) => String(provider.id) === String(profile.id))

    return {
      profile,
      upcomingEvents,
      pastEvents,
      requestCount: profileRequests.length,
      averageRating: publicProfile?.average_rating || 0,
      ratingCount: publicProfile?.rating_count || 0,
    }
  })

  function formatEvent(performanceRequest) {
    const eventLabel =
      performanceRequest.event_type === 'Other event' && performanceRequest.other_event
        ? performanceRequest.other_event
        : performanceRequest.event_type
    return `${eventLabel} · ${performanceRequest.event_datetime}`
  }

  function formatLocation(provider) {
    const locationParts = [provider.city, provider.state].filter((part) => typeof part === 'string' && part.trim())
    const location = locationParts.join(', ')
    const zipCode = typeof provider.zip_code === 'string' && provider.zip_code.trim() ? provider.zip_code.trim() : ''

    if (location && zipCode) {
      return `${location} · ${zipCode}`
    }

    return location || zipCode || 'Location not listed'
  }

  if (!isLanding) {
    return (
      <div className="home-stack">
      <section className="hero card section-anchor">
        <div className="hero-copy">
          <p className="eyebrow">Community music network</p>
          <h1>Connect local musicians with the events that need live sound.</h1>
          <p className="hero-text">
            Music Connect helps community organizers discover musicians for neighborhood gatherings, nonprofit events, school
            programs, and celebrations while giving performers a place to share their details.
          </p>
          <div className="hero-actions">
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
      {isConsumer ? (
        <section className="card list-card section-anchor">
          <div className="section-head">
            <p className="eyebrow">Your requested events</p>
            <h2>Performance requests</h2>
          </div>
          <div className="card-list">
            {requestedEvents.length > 0 ? (
              requestedEvents.map((performanceRequest) => {
                const eventLabel =
                  performanceRequest.event_type === 'Other event' && performanceRequest.other_event
                    ? performanceRequest.other_event
                    : performanceRequest.event_type
                const hasMatch = performanceRequest.provider_available && performanceRequest.provider_willing

                return (
                  <article className={`event-card ${hasMatch ? 'event-card-highlighted' : ''}`} key={performanceRequest.id}>
                    <div className="event-topline">
                      <h3>{eventLabel}</h3>
                      <span className="status-pill">{hasMatch ? 'Provider available' : 'Finding a provider'}</span>
                    </div>
                    <p className="event-date">{performanceRequest.event_datetime}</p>
                    <p>
                      {performanceRequest.provider_name
                        ? `${performanceRequest.provider_name} can take this request.`
                        : 'No matching available provider yet.'}
                    </p>
                    {performanceRequest.preferred_instrument ? (
                      <p>Preferred instrument: {performanceRequest.preferred_instrument}</p>
                    ) : null}
                    {performanceRequest.notes ? <p>{performanceRequest.notes}</p> : null}
                  </article>
                )
              })
            ) : (
              <article className="loading-state public-empty-state">You have not requested an event yet.</article>
            )}
          </div>
        </section>
      ) : null}
      {isServiceProvider ? (
        <section className="card list-card section-anchor provider-home-table-card">
          <div className="section-head">
            <p className="eyebrow">Provider dashboard</p>
            <h2>Your profiles and performance history</h2>
          </div>
          {providerTableRows.length > 0 ? (
            <div className="provider-table-wrap">
              <table className="provider-home-table">
                <thead>
                  <tr>
                    <th scope="col">Summary</th>
                    {providerTableRows.map(({ profile }) => (
                      <th scope="col" key={profile.id}>
                        {profile.full_name}
                        <span>{profile.instrument}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Upcoming events</th>
                    {providerTableRows.map(({ profile, upcomingEvents }) => (
                      <td key={profile.id}>
                        {upcomingEvents.length > 0 ? (
                          <ul>
                            {upcomingEvents.map((performanceRequest) => (
                              <li key={performanceRequest.id}>{formatEvent(performanceRequest)}</li>
                            ))}
                          </ul>
                        ) : 'None scheduled'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">Average user rating</th>
                    {providerTableRows.map(({ profile, averageRating, ratingCount }) => (
                      <td key={profile.id}>
                        {ratingCount > 0 ? `${averageRating.toFixed(1)} / 5 (${ratingCount})` : 'No ratings yet'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">Service requests</th>
                    {providerTableRows.map(({ profile, requestCount }) => (
                      <td key={profile.id}>{requestCount}</td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">Past events performed</th>
                    {providerTableRows.map(({ profile, pastEvents }) => (
                      <td key={profile.id}>
                        {pastEvents.length > 0 ? (
                          <ul>
                            {pastEvents.map((performanceRequest) => (
                              <li key={performanceRequest.id}>{formatEvent(performanceRequest)}</li>
                            ))}
                          </ul>
                        ) : 'None recorded'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="loading-state">Create a service profile to see your provider dashboard.</p>
          )}
        </section>
      ) : null}
      </div>
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
                <p>{formatLocation(provider)}</p>
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
