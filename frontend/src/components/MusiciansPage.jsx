import { useMemo, useRef, useState } from 'react'

export default function MusiciansPage({ musicians, currentUser, onContactProvider, onSubmitRating }) {
  const isConsumerView = currentUser?.role === 'CONSUMER'
  const [searchTerm, setSearchTerm] = useState('')
  const [isNearbySearchOpen, setIsNearbySearchOpen] = useState(false)
  const [ratingProviderId, setRatingProviderId] = useState(null)
  const [ratingValue, setRatingValue] = useState(5)
  const [ratingMessage, setRatingMessage] = useState('')
  const [ratingStatus, setRatingStatus] = useState('')
  const [isSubmittingRating, setIsSubmittingRating] = useState(false)
  const searchInputRef = useRef(null)

  function formatLocation(musician) {
    const locationParts = [musician.city, musician.state].filter((part) => typeof part === 'string' && part.trim())
    const location = locationParts.join(', ')
    const zipCode = typeof musician.zip_code === 'string' && musician.zip_code.trim() ? musician.zip_code.trim() : ''

    if (location && zipCode) {
      return `${location} · ${zipCode}`
    }

    return location || zipCode || 'Location not listed'
  }

  const filteredMusicians = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    if (!normalizedSearch) {
      return musicians
    }

    return musicians.filter((musician) => {
      const searchableLocation = [musician.zip_code, musician.city, musician.state]
        .filter((part) => typeof part === 'string')
        .join(' ')
        .toLowerCase()
      return searchableLocation.includes(normalizedSearch)
    })
  }, [musicians, searchTerm])

  function openNearbySearch() {
    setIsNearbySearchOpen(true)
    window.requestAnimationFrame(() => searchInputRef.current?.focus())
  }

  function formatRating(provider) {
    if (!provider.rating_count) {
      return 'No ratings yet'
    }

    const roundedRating = Math.round(provider.average_rating)
    return `${'★'.repeat(roundedRating)}${'☆'.repeat(5 - roundedRating)} ${provider.average_rating.toFixed(1)} (${provider.rating_count})`
  }

  async function submitRating(event, providerId) {
    event.preventDefault()
    setRatingStatus('')
    if (!ratingMessage.trim()) {
      setRatingStatus('Please explain the rating in a message.')
      return
    }

    setIsSubmittingRating(true)
    const result = await onSubmitRating?.(providerId, ratingValue, ratingMessage.trim())
    setIsSubmittingRating(false)
    setRatingStatus(result?.message || 'Could not save your rating.')
    if (result?.ok) {
      setRatingMessage('')
      setRatingProviderId(null)
    }
  }

  return (
    <section className="content-grid section-anchor musicians-section route-page">
      <article className="card list-card musicians-list-card full-span-card">
        <div className="section-head section-head-row">
          <div>
            <p className="eyebrow">Musicians</p>
            <h2>{isConsumerView ? 'Browse local service providers' : 'Browse local performers'}</h2>
          </div>
          {isConsumerView ? (
            <button className="button primary slim-button" type="button" onClick={openNearbySearch}>
              Search nearby providers
            </button>
          ) : null}
        </div>

        {currentUser ? <p className="role-chip role-chip-inline">Visible to {currentUser.role}</p> : null}

        {isConsumerView && isNearbySearchOpen ? (
          <div className="provider-search-panel">
            <label htmlFor="provider-location-search">Search by ZIP code or city</label>
            <div className="provider-search-controls">
              <input
                id="provider-location-search"
                ref={searchInputRef}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="For example, 11201 or Brooklyn"
              />
              <button
                className="button secondary slim-button"
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  searchInputRef.current?.focus()
                }}
              >
                Clear
              </button>
            </div>
            <p className="role-chip-inline">
              {searchTerm.trim() ? `${filteredMusicians.length} provider(s) found` : 'Showing all available service providers'}
            </p>
          </div>
        ) : null}

        <div className="card-list musician-grid">
          {filteredMusicians.length > 0 ? filteredMusicians.map((musician) => (
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
              <p className="provider-rating-summary" aria-label={`Rating: ${formatRating(musician)}`}>
                {formatRating(musician)}
              </p>
              <div className="profile-actions">
                <button
                  className="button secondary slim-button contact-button"
                  type="button"
                  disabled={Boolean(currentUser) && !isConsumerView}
                  onClick={() => onContactProvider?.(musician)}
                >
                  {isConsumerView ? 'Email provider' : currentUser ? 'Consumers only' : 'Sign in to email'}
                </button>
                <button
                  className="button primary slim-button"
                  type="button"
                  onClick={() => {
                    setRatingProviderId(ratingProviderId === musician.id ? null : musician.id)
                    setRatingValue(5)
                    setRatingMessage('')
                    setRatingStatus('')
                  }}
                >
                  {ratingProviderId === musician.id ? 'Close rating' : 'Rate provider'}
                </button>
              </div>
              {ratingProviderId === musician.id ? (
                <form className="provider-rating-form" onSubmit={(event) => submitRating(event, musician.id)}>
                  <label>
                    Your star rating
                    <select value={ratingValue} onChange={(event) => setRatingValue(Number(event.target.value))}>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <option key={value} value={value}>
                          {value} star{value === 1 ? '' : 's'}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Explain your rating
                    <textarea
                      value={ratingMessage}
                      onChange={(event) => setRatingMessage(event.target.value)}
                      placeholder="Share what your experience was like"
                      rows="3"
                      required
                    />
                  </label>
                  {ratingStatus ? <p className="role-chip-inline">{ratingStatus}</p> : null}
                  <button className="button primary slim-button" type="submit" disabled={isSubmittingRating}>
                    {isSubmittingRating ? 'Posting…' : 'Post rating'}
                  </button>
                </form>
              ) : null}
            </article>
          )) : <article className="loading-state public-empty-state">No service providers match that ZIP code or city.</article>}
        </div>
      </article>
    </section>
  )
}
