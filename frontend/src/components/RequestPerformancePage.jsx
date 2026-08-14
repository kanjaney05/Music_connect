import { useEffect, useMemo, useState } from 'react'

export default function RequestPerformancePage({
  requestForm,
  setRequestForm,
  eventTypes,
  musicians,
  performanceRequests,
  selectedMusician,
  availabilityCalendar,
  availabilityMessage,
  isLoadingAvailability,
  onSubmit,
}) {
  const [selectedDate, setSelectedDate] = useState('')

  const calendarDays = availabilityCalendar?.days || []

  useEffect(() => {
    const firstAvailableDay = calendarDays.find((day) => Array.isArray(day.slots) && day.slots.length > 0)
    setSelectedDate(firstAvailableDay?.date || calendarDays[0]?.date || '')
  }, [availabilityCalendar, requestForm.musician_id])

  const selectedDayData = useMemo(
    () => calendarDays.find((day) => day.date === selectedDate),
    [calendarDays, selectedDate],
  )

  function formatDayLabel(day) {
    return new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  function formatTimeLabel(isoDateTime) {
    return new Date(isoDateTime).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  function toDateTimeInputValue(isoDateTime) {
    return isoDateTime.slice(0, 16)
  }

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
                onChange={(event) =>
                  setRequestForm({
                    ...requestForm,
                    musician_id: event.target.value,
                    event_datetime: '',
                  })
                }
                required
                disabled={musicians.length === 0}
              >
                <option value="" disabled>
                  {musicians.length === 0 ? 'No musicians enrolled yet' : 'Select a musician'}
                </option>
                {musicians.map((musician) => (
                  <option key={musician.id} value={musician.id}>
                    {musician.full_name} - {musician.instrument} ({musician.city}, {musician.state}
                    {musician.zip_code ? ` · ${musician.zip_code}` : ''})
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
              Selected date and time
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

          <div className="availability-picker">
            <div className="section-head compact">
              <p className="eyebrow">Availability</p>
              <h2>Choose a day, then choose a time slot</h2>
            </div>
            <p className="role-chip-inline">Time zone: {availabilityCalendar?.timezone_label || 'Local time'}</p>

            {availabilityMessage ? <p className="role-chip-inline">{availabilityMessage}</p> : null}

            <div className="availability-day-grid">
              {calendarDays.map((day) => {
                const slotCount = Array.isArray(day.slots) ? day.slots.length : 0
                const isSelected = selectedDate === day.date

                return (
                  <button
                    type="button"
                    key={day.date}
                    className={`chip availability-day-chip ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedDate(day.date)}
                  >
                    <span>{formatDayLabel(day.date)}</span>
                    <small>{slotCount} slot(s)</small>
                  </button>
                )
              })}
            </div>

            <div className="availability-slot-group">
              {isLoadingAvailability ? (
                <article className="loading-state public-empty-state">Loading slots…</article>
              ) : selectedDayData && selectedDayData.slots.length > 0 ? (
                <div className="availability-slot-buttons">
                  {selectedDayData.slots.map((slot) => {
                    const slotValue = toDateTimeInputValue(slot.starts_at)
                    const isActive = requestForm.event_datetime === slotValue
                    return (
                      <button
                        className={`button ${isActive ? 'primary' : 'secondary'} slim-button`}
                        type="button"
                        key={slot.id}
                        onClick={() => setRequestForm({ ...requestForm, event_datetime: slotValue })}
                      >
                        {formatTimeLabel(slot.starts_at)} to {formatTimeLabel(slot.ends_at)}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <article className="loading-state public-empty-state">No slots published for this day.</article>
              )}
            </div>
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
              {selectedMusician.zip_code ? ` · ${selectedMusician.zip_code}` : ''}
            </p>
            <p>Preferred event: {selectedMusician.preferred_event_type || 'Any event'}</p>
            <p>Prefers requests by {selectedMusician.preferred_contact_method === 'phone' ? 'phone' : 'email'}</p>
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
