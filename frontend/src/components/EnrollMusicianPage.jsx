export default function EnrollMusicianPage({ musicianForm, setMusicianForm, onSubmit }) {
  return (
    <section className="content-grid route-page single-column-page">
      <article className="card form-card full-span-card profile-editor-card">
        <div className="section-head">
          <p className="eyebrow">Enrollment</p>
          <h2>Create a musician profile</h2>
          <p className="hero-text profile-helper">
            Admins and service providers use the same enrollment flow to create a musician profile that will appear in the local
            musicians list.
          </p>
        </div>

        <form className="stack-form" onSubmit={onSubmit}>
          <div className="field-grid">
            <label>
              Full name
              <input
                value={musicianForm.full_name}
                onChange={(event) => setMusicianForm({ ...musicianForm, full_name: event.target.value })}
                placeholder="Your name"
                required
              />
            </label>
            <label>
              Instrument
              <input
                value={musicianForm.instrument}
                onChange={(event) => setMusicianForm({ ...musicianForm, instrument: event.target.value })}
                placeholder="Piano, cello, saxophone..."
                required
              />
            </label>
          </div>

          <div className="field-grid">
            <label>
              City
              <input
                value={musicianForm.city}
                onChange={(event) => setMusicianForm({ ...musicianForm, city: event.target.value })}
                placeholder="Your city"
                required
              />
            </label>
            <label>
              State
              <input
                value={musicianForm.state}
                onChange={(event) => setMusicianForm({ ...musicianForm, state: event.target.value })}
                placeholder="Your state"
                required
              />
            </label>
          </div>

          <div className="field-grid">
            <label>
              Phone number
              <input
                value={musicianForm.phone}
                onChange={(event) => setMusicianForm({ ...musicianForm, phone: event.target.value })}
                placeholder="(555) 123-4567"
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={musicianForm.email}
                onChange={(event) => setMusicianForm({ ...musicianForm, email: event.target.value })}
                placeholder="name@example.com"
                required
              />
            </label>
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={musicianForm.available_weekends}
              onChange={(event) => setMusicianForm({ ...musicianForm, available_weekends: event.target.checked })}
            />
            Available on weekends
          </label>

          <button className="button primary" type="submit">
            Enroll musician
          </button>
        </form>
      </article>
    </section>
  )
}
