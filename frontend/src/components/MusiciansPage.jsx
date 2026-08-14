export default function MusiciansPage({ musicians, currentUser, onContactProvider }) {
  const isConsumerView = currentUser?.role === 'CONSUMER'

  function formatLocation(musician) {
    const locationParts = [musician.city, musician.state].filter((part) => typeof part === 'string' && part.trim())
    const location = locationParts.join(', ')
    const zipCode = typeof musician.zip_code === 'string' && musician.zip_code.trim() ? musician.zip_code.trim() : ''

    if (location && zipCode) {
      return `${location} · ${zipCode}`
    }

    return location || zipCode || 'Location not listed'
  }

  return (
    <section className="content-grid section-anchor musicians-section route-page">
      <article className="card list-card musicians-list-card full-span-card">
        <div className="section-head section-head-row">
          <div>
            <p className="eyebrow">Musicians</p>
            <h2>{isConsumerView ? 'Browse local service providers' : 'Browse local performers'}</h2>
          </div>
        </div>

        {currentUser ? <p className="role-chip role-chip-inline">Visible to {currentUser.role}</p> : null}

        <div className="card-list musician-grid">
          {musicians.map((musician) => (
            <article className="profile-card" key={musician.id}>
              <div className="profile-head">
                <h3>{musician.full_name}</h3>
                <p>{musician.instrument}</p>
              </div>
              <p>{formatLocation(musician)}</p>
              <div className="card-meta musician-contact">
                <span>{musician.phone}</span>
                <span>{musician.email}</span>
              </div>
              <p>{musician.bio}</p>
              <div className="card-meta">
                <span>{musician.rate}</span>
                <span>{musician.available_weekends ? 'Weekend availability' : 'Weekday-only'}</span>
              </div>
              <div className="profile-actions">
                <button
                  className="button secondary slim-button contact-button"
                  type="button"
                  disabled={Boolean(currentUser) && !isConsumerView}
                  onClick={() => onContactProvider?.(musician)}
                >
                  {isConsumerView ? 'Email provider' : currentUser ? 'Consumers only' : 'Sign in to email'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </article>
    </section>
  )
}
