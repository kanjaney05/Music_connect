export default function RequestPerformancePage({
  requestForm,
  setRequestForm,
  eventTypes,
  musicians,
  performanceRequests,
  selectedMusician,
  onSubmit,
}) {
  return (
    <section className="content-grid events-grid route-page">
      <article className="card form-card request-card full-span-card">
        <div className="section-head">
          <p className="eyebrow">Performance request</p>
          <h2>Request a musician for an event</h2>
        </div>

        <form className="stack-form" onSubmit={onSubmit}>
          <div className="field-grid">
            <label>
              Event type
              <select
                value={requestForm.event_type}
                onChange={(event) => setRequestForm({ ...requestForm, event_type: event.target.value })}
                required
              >
                {eventTypes.map((eventType) => (
                  <option key={eventType} value={eventType}>
                    {eventType}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Available musician
              <select
                value={requestForm.musician_id}
                onChange={(event) => setRequestForm({ ...requestForm, musician_id: event.target.value })}
                required
                disabled={musicians.length === 0}
              >
                <option value="" disabled>
                  {musicians.length === 0 ? 'No musicians enrolled yet' : 'Select a musician'}
                </option>
                {musicians.map((musician) => (
                  <option key={musician.id} value={musician.id}>
                    {musician.full_name} - {musician.instrument} ({musician.city}, {musician.state})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {requestForm.event_type === 'Other event' ? (
            <label>
              Other event
              <input
                value={requestForm.other_event}
                onChange={(event) => setRequestForm({ ...requestForm, other_event: event.target.value })}
                placeholder="Describe the event type"
                required
              />
            </label>
          ) : null}

          <div className="field-grid">
            <label>
              Date and time
              <input
                type="datetime-local"
                value={requestForm.event_datetime}
                onChange={(event) => setRequestForm({ ...requestForm, event_datetime: event.target.value })}
                required
              />
            </label>
            <label>
              Notes
              <input
                value={requestForm.notes}
                onChange={(event) => setRequestForm({ ...requestForm, notes: event.target.value })}
                placeholder="Anything the musician should know"
              />
            </label>
          </div>

          <button className="button primary" type="submit" disabled={musicians.length === 0}>
            Submit request
          </button>
        </form>

        {selectedMusician ? (
          <div className="spotlight request-spotlight">
            <span>Selected musician</span>
            <h2>{selectedMusician.full_name}</h2>
            <p>
              {selectedMusician.instrument} in {selectedMusician.city}, {selectedMusician.state}
            </p>
          </div>
        ) : null}
      </article>

      <article className="card list-card request-summary-card full-span-card">
        <div className="section-head compact">
          <p className="eyebrow">Recent requests</p>
          <h2>Submitted performance requests</h2>
        </div>

        <div className="card-list">
          {performanceRequests.map((performanceRequest) => {
            const musicianLabel = musicians.find((musician) => musician.id === performanceRequest.musician_id)
            const eventLabel =
              performanceRequest.event_type === 'Other event' && performanceRequest.other_event
                ? performanceRequest.other_event
                : performanceRequest.event_type

            return (
              <article className="event-card" key={performanceRequest.id}>
                <div className="event-topline">
                  <h3>{eventLabel}</h3>
                  <span className="status-pill">Requested</span>
                </div>
                <p>{musicianLabel ? musicianLabel.full_name : `Musician #${performanceRequest.musician_id}`}</p>
                <p className="event-date">{performanceRequest.event_datetime}</p>
                {performanceRequest.notes ? <p>{performanceRequest.notes}</p> : null}
              </article>
            )
          })}
        </div>
      </article>
    </section>
  )
}
