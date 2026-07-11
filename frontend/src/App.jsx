import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'

import { EnrollMusicianPage, HomePage, MusiciansPage, RequestPerformancePage } from './components'

const emptyMusicianForm = {
  full_name: '',
  instrument: 'Piano',
  city: '',
  state: '',
  phone: '',
  email: '',
  available_weekends: true,
}

const emptyRequestForm = {
  event_type: 'Community celebration',
  other_event: '',
  musician_id: '',
  event_datetime: '',
  notes: '',
}

const eventTypes = ['Community celebration', 'Birthday', 'Wedding', 'Fundraiser', 'School concert', 'Other event']

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

function AppShell() {
  const [dashboard, setDashboard] = useState(null)
  const [musicians, setMusicians] = useState([])
  const [performanceRequests, setPerformanceRequests] = useState([])
  const [musicianForm, setMusicianForm] = useState(emptyMusicianForm)
  const [requestForm, setRequestForm] = useState(emptyRequestForm)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let ignore = false

    async function loadData() {
      try {
        const [dashboardResponse, musiciansResponse, requestResponse] = await Promise.all([
          fetch('/api/dashboard'),
          fetch('/api/musicians'),
          fetch('/api/performance-requests'),
        ])

        if (ignore) {
          return
        }

        const [dashboardData, musiciansData, requestData] = await Promise.all([
          dashboardResponse.json(),
          musiciansResponse.json(),
          requestResponse.json(),
        ])

        setDashboard(dashboardData)
        setMusicians(musiciansData)
        setPerformanceRequests(requestData)
      } catch (error) {
        setMessage('Unable to reach the backend. Start the API server on port 8000.')
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (!requestForm.musician_id && musicians.length > 0) {
      setRequestForm((current) => ({ ...current, musician_id: String(musicians[0].id) }))
    }
  }, [musicians, requestForm.musician_id])

  const selectedMusician = useMemo(() => {
    return musicians.find((musician) => String(musician.id) === String(requestForm.musician_id))
  }, [musicians, requestForm.musician_id])

  function goTo(path) {
    navigate(path)
  }

  async function handleMusicianSubmit(event) {
    event.preventDefault()
    setMessage('')

    const response = await fetch('/api/musicians', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(musicianForm),
    })

    if (!response.ok) {
      setMessage('Could not save the musician profile.')
      return
    }

    const createdMusician = await response.json()
    setMusicians((current) => [createdMusician, ...current])
    setMusicianForm(emptyMusicianForm)
    setRequestForm((current) => ({
      ...current,
      musician_id: String(createdMusician.id),
    }))
    setMessage('The new musician profile is now available in the local musicians list.')
  }

  async function handleRequestSubmit(event) {
    event.preventDefault()
    setMessage('')

    const payload = {
      ...requestForm,
      musician_id: Number(requestForm.musician_id),
    }

    if (payload.event_type === 'Other event' && !payload.other_event.trim()) {
      setMessage('Please describe the other event type before submitting.')
      return
    }

    const response = await fetch('/api/performance-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      setMessage('Could not save the performance request.')
      return
    }

    const createdRequest = await response.json()
    setPerformanceRequests((current) => [createdRequest, ...current])
    setRequestForm((current) => ({
      ...emptyRequestForm,
      musician_id: current.musician_id,
    }))
    setMessage('Your performance request was submitted to the local musician list.')
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="site-header">
        <div className="site-header-inner card">
          <NavLink className="brand-link" to="/">
            Music Connect
          </NavLink>

          <nav className="header-nav" aria-label="Primary">
            <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/musicians">
              Local musicians
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? 'nav-link nav-link-accent active' : 'nav-link nav-link-accent')} to="/request-performance">
              Request a performance
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="page">
        {message ? <p className="message-banner">{message}</p> : null}

        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                dashboard={dashboard}
                isLoading={isLoading}
                onEnroll={() => goTo('/musicians/enroll')}
                onRequest={() => goTo('/request-performance')}
              />
            }
          />
          <Route path="/musicians" element={<MusiciansPage musicians={musicians} onEnroll={() => goTo('/musicians/enroll')} />} />
          <Route
            path="/musicians/enroll"
            element={<EnrollMusicianPage musicianForm={musicianForm} setMusicianForm={setMusicianForm} onSubmit={handleMusicianSubmit} />}
          />
          <Route
            path="/request-performance"
            element={
              <RequestPerformancePage
                requestForm={requestForm}
                setRequestForm={setRequestForm}
                eventTypes={eventTypes}
                musicians={musicians}
                performanceRequests={performanceRequests}
                selectedMusician={selectedMusician}
                onSubmit={handleRequestSubmit}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
