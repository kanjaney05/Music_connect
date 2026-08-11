import { useMemo, useState } from 'react'

export default function ManageServiceProfilePage({
  profileForm,
  setProfileForm,
  onSubmit,
  currentUser,
  isSaving,
  isSavingAvailability,
  hasProfile,
  message,
  availabilityMessage,
  availabilityCalendar,
  preferredEventTypes = [],
  onCreateAvailabilitySlot,
  onUpdateAvailabilitySlot,
  onDeleteAvailabilitySlot,
}) {
  const [slotForm, setSlotForm] = useState({
    date: '',
    start_time: '',
    end_time: '',
  })
  const [slotFormMessage, setSlotFormMessage] = useState('')
  const [editingSlot, setEditingSlot] = useState(null)

  const daysWithSlots = useMemo(
    () => (availabilityCalendar?.days || []).filter((day) => Array.isArray(day.slots) && day.slots.length > 0),
    [availabilityCalendar],
  )

  const slotCount = useMemo(
    () => daysWithSlots.reduce((total, day) => total + day.slots.length, 0),
    [daysWithSlots],
  )

  function formatDayLabel(day) {
    return new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  function formatSlotTime(isoDateTime) {
    return new Date(isoDateTime).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  function toDateTimeParts(isoDateTime) {
    const localDateTime = new Date(isoDateTime)
    const year = localDateTime.getFullYear()
    const month = String(localDateTime.getMonth() + 1).padStart(2, '0')
    const day = String(localDateTime.getDate()).padStart(2, '0')
    const hours = String(localDateTime.getHours()).padStart(2, '0')
    const minutes = String(localDateTime.getMinutes()).padStart(2, '0')
    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`,
    }
  }

  function beginEditSlot(slot) {
    const start = toDateTimeParts(slot.starts_at)
    const end = toDateTimeParts(slot.ends_at)
    setEditingSlot({
      id: slot.id,
      date: start.date,
      start_time: start.time,
      end_time: end.time,
    })
    setSlotFormMessage('')
  }

  async function saveEditSlot(event) {
    event.preventDefault()
    if (!editingSlot) {
      return
    }

    if (!editingSlot.date || !editingSlot.start_time || !editingSlot.end_time) {
      setSlotFormMessage('Choose a date plus start and end times.')
      return
    }

    const startsAt = `${editingSlot.date}T${editingSlot.start_time}:00`
    const endsAt = `${editingSlot.date}T${editingSlot.end_time}:00`
    const updated = await onUpdateAvailabilitySlot(editingSlot.id, { startsAt, endsAt })
    if (updated) {
      setEditingSlot(null)
    }
  }

  async function handleSlotSubmit(event) {
    event.preventDefault()
    setSlotFormMessage('')

    if (!slotForm.date || !slotForm.start_time || !slotForm.end_time) {
      setSlotFormMessage('Choose a date plus start and end times.')
      return
    }

    const startsAt = `${slotForm.date}T${slotForm.start_time}:00`
    const endsAt = `${slotForm.date}T${slotForm.end_time}:00`
    const created = await onCreateAvailabilitySlot({ startsAt, endsAt })
    if (created) {
      setSlotForm({ date: '', start_time: '', end_time: '' })
    }
  }

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

          <div className="field-grid">
            <label>
              Preferred event type
              <select
                value={profileForm.preferred_event_type}
                onChange={(event) => setProfileForm({ ...profileForm, preferred_event_type: event.target.value })}
              >
                {preferredEventTypes.map((eventType) => (
                  <option key={eventType} value={eventType}>
                    {eventType}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Preferred request method
              <select
                value={profileForm.preferred_contact_method}
                onChange={(event) => setProfileForm({ ...profileForm, preferred_contact_method: event.target.value })}
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
              </select>
            </label>
          </div>

          <label>
            Travel and preparation buffer (minutes)
            <input
              type="number"
              min="0"
              max="720"
              value={profileForm.travel_buffer_minutes}
              onChange={(event) =>
                setProfileForm({
                  ...profileForm,
                  travel_buffer_minutes: Number(event.target.value || 0),
                })
              }
              required
            />
          </label>

          <button className="button primary" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving…' : hasProfile ? 'Save profile changes' : 'Create profile'}
          </button>
        </form>

        {message ? <p className="message-banner auth-message">{message}</p> : null}

        <div className="availability-editor">
          <div className="section-head compact">
            <p className="eyebrow">Availability calendar</p>
            <h2>Publish your next 30 days of time slots</h2>
          </div>
          <p className="hero-text availability-helper">
            Customers will see these slots by day in a calendar. Your current minimum gap between bookings is{' '}
            <strong>{profileForm.travel_buffer_minutes} minutes</strong>.
          </p>
          <p className="role-chip-inline">Time zone: {availabilityCalendar?.timezone_label || 'Local time'}</p>

          <form className="stack-form" onSubmit={handleSlotSubmit}>
            <div className="field-grid availability-grid">
              <label>
                Date
                <input
                  type="date"
                  value={slotForm.date}
                  onChange={(event) => setSlotForm({ ...slotForm, date: event.target.value })}
                  required
                />
              </label>
              <label>
                Start time
                <input
                  type="time"
                  value={slotForm.start_time}
                  onChange={(event) => setSlotForm({ ...slotForm, start_time: event.target.value })}
                  required
                />
              </label>
              <label>
                End time
                <input
                  type="time"
                  value={slotForm.end_time}
                  onChange={(event) => setSlotForm({ ...slotForm, end_time: event.target.value })}
                  required
                />
              </label>
            </div>

            <button className="button secondary" type="submit" disabled={isSavingAvailability}>
              {isSavingAvailability ? 'Saving slot…' : 'Add availability slot'}
            </button>
          </form>

          {slotFormMessage ? <p className="message-banner auth-message">{slotFormMessage}</p> : null}
          {availabilityMessage ? <p className="message-banner auth-message">{availabilityMessage}</p> : null}

          <div className="availability-list card-list">
            {daysWithSlots.length > 0 ? (
              daysWithSlots.map((day) => (
                <article className="card availability-day-card" key={day.date}>
                  <div className="section-head compact availability-day-head">
                    <h3>{formatDayLabel(day.date)}</h3>
                    <span className="status-pill">{day.slots.length} slot(s)</span>
                  </div>
                  <div className="availability-slot-list">
                    {day.slots.map((slot) => {
                      const isEditing = editingSlot?.id === slot.id

                      return (
                        <div className="availability-slot-row" key={slot.id}>
                          {isEditing ? (
                            <form className="availability-edit-form" onSubmit={saveEditSlot}>
                              <input
                                type="date"
                                value={editingSlot.date}
                                onChange={(event) => setEditingSlot({ ...editingSlot, date: event.target.value })}
                                required
                              />
                              <input
                                type="time"
                                value={editingSlot.start_time}
                                onChange={(event) => setEditingSlot({ ...editingSlot, start_time: event.target.value })}
                                required
                              />
                              <input
                                type="time"
                                value={editingSlot.end_time}
                                onChange={(event) => setEditingSlot({ ...editingSlot, end_time: event.target.value })}
                                required
                              />
                              <button className="chip" type="submit" disabled={isSavingAvailability}>
                                Save
                              </button>
                              <button className="chip" type="button" onClick={() => setEditingSlot(null)} disabled={isSavingAvailability}>
                                Cancel
                              </button>
                            </form>
                          ) : (
                            <>
                              <p>
                                {formatSlotTime(slot.starts_at)} to {formatSlotTime(slot.ends_at)}
                              </p>
                              <div className="availability-slot-actions">
                                {slot.is_reserved ? <span className="status-pill">Reserved</span> : null}
                                <button
                                  className="chip"
                                  type="button"
                                  onClick={() => beginEditSlot(slot)}
                                  disabled={isSavingAvailability || slot.is_reserved}
                                >
                                  Edit
                                </button>
                                <button
                                  className="chip"
                                  type="button"
                                  onClick={() => onDeleteAvailabilitySlot(slot.id)}
                                  disabled={isSavingAvailability || slot.is_reserved}
                                >
                                  Remove
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </article>
              ))
            ) : (
              <article className="loading-state public-empty-state">
                {slotCount === 0 ? 'No slots published yet for the next 30 days.' : 'No slots available.'}
              </article>
            )}
          </div>
        </div>
      </article>
    </section>
  )
}