export default function ManageServiceProfilePage({
  profileForm,
  setProfileForm,
  onSubmit,
  currentUser,
  isSaving,
  hasProfile,
  message,
}) {
  return (
    <section className="content-grid route-page single-column-page">
      <article className="card form-card full-span-card profile-editor-card">
        <div className="section-head">
          <p className="eyebrow">My profile</p>
          <h2>{hasProfile ? 'Edit your service provider profile' : 'Create your service provider profile'}</h2>
          <p className="hero-text profile-helper">
            Your profile is tied to <strong>{currentUser.email}</strong>. You can update your own details here, but you will not
            see other service providers while signed in as a service provider.
          </p>
        </div>

        <form className="stack-form" onSubmit={onSubmit}>
          <div className="field-grid">
            <label>
              Full name
              <input
                value={profileForm.full_name}
                onChange={(event) => setProfileForm({ ...profileForm, full_name: event.target.value })}
                placeholder="Your name"
                required
              />
            </label>
            <label>
              Instrument
              <input
                value={profileForm.instrument}
                onChange={(event) => setProfileForm({ ...profileForm, instrument: event.target.value })}
                placeholder="Piano, cello, saxophone..."
                required
              />
            </label>
          </div>

          <div className="field-grid">
            <label>
              City
              <input
                value={profileForm.city}
                onChange={(event) => setProfileForm({ ...profileForm, city: event.target.value })}
                placeholder="Your city"
                required
              />
            </label>
            <label>
              State
              <input
                value={profileForm.state}
                onChange={(event) => setProfileForm({ ...profileForm, state: event.target.value })}
                placeholder="Your state"
                required
              />
            </label>
          </div>

          <div className="field-grid">
            <label>
              Phone number
              <input
                value={profileForm.phone}
                onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })}
                placeholder="(555) 123-4567"
                required
              />
            </label>
            <label>
              Email
              <input className="profile-email-readonly" value={currentUser.email} readOnly />
            </label>
          </div>

          <label>
            Bio
            <textarea
              value={profileForm.bio}
              onChange={(event) => setProfileForm({ ...profileForm, bio: event.target.value })}
              placeholder="Briefly describe the work you do and the events you take on."
            />
          </label>

          <div className="field-grid">
            <label>
              Rate
              <input
                value={profileForm.rate}
                onChange={(event) => setProfileForm({ ...profileForm, rate: event.target.value })}
                placeholder="Available upon request"
              />
            </label>
            <label className="checkbox-row profile-checkbox-row">
              <input
                type="checkbox"
                checked={profileForm.available_weekends}
                onChange={(event) => setProfileForm({ ...profileForm, available_weekends: event.target.checked })}
              />
              Available on weekends
            </label>
          </div>

          <button className="button primary" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving…' : hasProfile ? 'Save profile changes' : 'Create profile'}
          </button>
        </form>

        {message ? <p className="message-banner auth-message">{message}</p> : null}
      </article>
    </section>
  )
}