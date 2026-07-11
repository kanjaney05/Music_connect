export default function MusiciansPage({ musicians, onEnroll }) {
  return (
    <section className="content-grid section-anchor musicians-section route-page">
      <article className="card list-card musicians-list-card full-span-card">
        <div className="section-head section-head-row">
          <div>
            <p className="eyebrow">Musicians</p>
            <h2>Browse local performers</h2>
          </div>
          <button className="button secondary slim-button" type="button" onClick={onEnroll}>
            Enroll a new musician
          </button>
        </div>

        <div className="card-list musician-grid">
          {musicians.map((musician) => (
            <article className="profile-card" key={musician.id}>
              <div className="profile-head">
                <h3>{musician.full_name}</h3>
                <p>{musician.instrument}</p>
              </div>
              <p>
                {musician.city}, {musician.state}
              </p>
              <div className="card-meta musician-contact">
                <span>{musician.phone}</span>
                <span>{musician.email}</span>
              </div>
              <p>{musician.bio}</p>
              <div className="card-meta">
                <span>{musician.rate}</span>
                <span>{musician.available_weekends ? 'Weekend availability' : 'Weekday-only'}</span>
              </div>
            </article>
          ))}
        </div>
      </article>
    </section>
  )
}
