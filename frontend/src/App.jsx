import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'

import { AuthPage, EnrollMusicianPage, HomePage, MusiciansPage, RequestPerformancePage } from './components'

const ADMIN_EMAIL = 'kanjaney05@gmail.com'
const AUTH_STORAGE_KEY = 'music-connect-auth-user'

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
const protectedRoles = {
  musicians: ['SERV-PROVIDER'],
  requests: ['CONSUMER'],
}

function getDefaultRoute(role) {
  if (role === 'SERV-PROVIDER') {
    return '/musicians'
  }

  if (role === 'CONSUMER') {
    return '/request-performance'
  }

  return '/'
}

function canAccessRole(role, allowedRoles) {
  return role === 'ADMIN' || allowedRoles.includes(role)
}

function RouteGuard({ currentUser, allowedRoles, redirectTo, children }) {
  if (!currentUser) {
    return <Navigate to="/" replace />
  }

  if (!canAccessRole(currentUser.role, allowedRoles)) {
    return <Navigate to={redirectTo || getDefaultRoute(currentUser.role)} replace />
  }

  return children
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

function AppShell() {
  const [currentUser, setCurrentUser] = useState(null)
  const [accessToken, setAccessToken] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    role: 'CONSUMER',
  })
  const [dashboard, setDashboard] = useState(null)
  const [musicians, setMusicians] = useState([])
  const [performanceRequests, setPerformanceRequests] = useState([])
  const [musicianForm, setMusicianForm] = useState(emptyMusicianForm)
  const [requestForm, setRequestForm] = useState(emptyRequestForm)
  const [message, setMessage] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticating, setIsAuthenticating] = useState(true)
  const navigate = useNavigate()

  function getAuthHeaders() {
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
  }

  function clearSession(nextMessage = '') {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setCurrentUser(null)
    setAccessToken('')
    setDashboard(null)
    setMusicians([])
    setPerformanceRequests([])
    setMusicianForm(emptyMusicianForm)
    setRequestForm(emptyRequestForm)
    setMessage('')
    setAuthMessage(nextMessage)
    setIsLoading(false)
  }

  function resetAuthForm(nextMode = authMode) {
    setAuthForm((current) => ({
      ...current,
      password: '',
      role: nextMode === 'register' ? current.role : 'CONSUMER',
    }))
  }

  useEffect(() => {
    let ignore = false

    async function restoreSession() {
      const rawUser = localStorage.getItem(AUTH_STORAGE_KEY)
      if (!rawUser) {
        if (!ignore) {
          setIsAuthenticating(false)
        }
        return
      }

      let storedUser = null
      try {
        storedUser = JSON.parse(rawUser)
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY)
        if (!ignore) {
          setIsAuthenticating(false)
        }
        return
      }

      if (!storedUser?.user?.email || !storedUser?.accessToken) {
        localStorage.removeItem(AUTH_STORAGE_KEY)
        if (!ignore) {
          setIsAuthenticating(false)
        }
        return
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${storedUser.accessToken}`,
          },
        })

        if (!response.ok) {
          throw new Error('Session expired')
        }

        const user = await response.json()
        if (!ignore) {
          setCurrentUser(user)
          setAccessToken(storedUser.accessToken)
          setAuthMode('login')
          setAuthForm({ email: user.email, role: user.role })
          setAuthMessage('')
        }
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY)
        if (!ignore) {
          setCurrentUser(null)
          setAccessToken('')
          setAuthMessage('Your session expired. Sign in again with your email address.')
        }
      } finally {
        if (!ignore) {
          setIsAuthenticating(false)
        }
      }
    }

    restoreSession()

    async function loadData() {
      if (!currentUser) {
        return
      }

      try {
        const [dashboardResponse, musiciansResponse, requestResponse] = await Promise.all([
          fetch('/api/dashboard', { headers: getAuthHeaders() }),
          fetch('/api/musicians', { headers: getAuthHeaders() }),
          fetch('/api/performance-requests', { headers: getAuthHeaders() }),
        ])

        if ([dashboardResponse, musiciansResponse, requestResponse].some((response) => response.status === 401)) {
          throw new Error('Session expired')
        }

        if (ignore) {
          return
        }

        if ([dashboardResponse, musiciansResponse, requestResponse].some((response) => !response.ok)) {
          throw new Error('Unable to load protected data')
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
        if (!ignore) {
          clearSession('Session expired. Sign in again with your email address.')
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    if (currentUser) {
      setIsLoading(true)
      loadData()
    } else {
      setIsLoading(false)
    }

    return () => {
      ignore = true
    }
  }, [currentUser])

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

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setAuthMessage('')

    const email = authForm.email.trim().toLowerCase()
    const password = authForm.password.trim()

    if (!email) {
      setAuthMessage('Email address is required.')
      return
    }

    if (password.length < 8) {
      setAuthMessage('Password must be at least 8 characters long.')
      return
    }

    const isRegisterMode = authMode === 'register'
    const response = await fetch(isRegisterMode ? '/api/auth/register' : '/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        ...(isRegisterMode ? { role: authForm.role } : {}),
      }),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setAuthMessage(payload?.detail || 'Could not open this account.')
      return
    }

    const { access_token: accessTokenValue, token_type: tokenType, ...user } = payload
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, accessToken: accessTokenValue, tokenType }))
    setCurrentUser(user)
    setAccessToken(accessTokenValue)
    setAuthMode('login')
    setAuthForm({ email: user.email, password: '', role: user.role })
    setAuthMessage('')
    navigate(getDefaultRoute(user.role), { replace: true })
  }

  function handleLogout() {
    clearSession('You have been signed out.')
    navigate('/', { replace: true })
  }

  async function handleMusicianSubmit(event) {
    event.preventDefault()
    setMessage('')

    const response = await fetch('/api/musicians', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
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
        ...getAuthHeaders(),
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

      {isAuthenticating ? (
        <main className="page auth-page">
          <section className="card loading-state auth-loading">Checking access…</section>
        </main>
      ) : null}

      {!isAuthenticating && !currentUser ? (
        <main className="page auth-page">
          <AuthPage
            authForm={authForm}
            setAuthForm={setAuthForm}
            onSubmit={handleAuthSubmit}
            isLoading={false}
            adminEmail={ADMIN_EMAIL}
            authMode={authMode}
            setAuthMode={setAuthMode}
            message={authMessage}
          />
        </main>
      ) : null}

      {!isAuthenticating && currentUser ? (
        <>
          <header className="site-header">
            <div className="site-header-inner card">
              <NavLink className="brand-link" to="/">
                Music Connect
              </NavLink>

              <nav className="header-nav" aria-label="Primary">
                <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/">
                  Home
                </NavLink>
                <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/musicians">
                  Local musicians
                </NavLink>
                {canAccessRole(currentUser.role, ['SERV-PROVIDER']) ? (
                  <NavLink className={({ isActive }) => (isActive ? 'nav-link nav-link-accent active' : 'nav-link nav-link-accent')} to="/musicians/enroll">
                    Enroll musician
                  </NavLink>
                ) : null}
                {canAccessRole(currentUser.role, ['CONSUMER']) ? (
                  <NavLink className={({ isActive }) => (isActive ? 'nav-link nav-link-accent active' : 'nav-link nav-link-accent')} to="/request-performance">
                    Request a performance
                  </NavLink>
                ) : null}
                <button className="button secondary slim-button nav-button" type="button" onClick={handleLogout}>
                  Sign out
                </button>
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
                    currentUser={currentUser}
                    canEnroll={canAccessRole(currentUser.role, ['SERV-PROVIDER'])}
                    canRequest={canAccessRole(currentUser.role, ['CONSUMER'])}
                  />
                }
              />
              <Route
                path="/musicians"
                element={
                  <MusiciansPage
                    musicians={musicians}
                    onEnroll={() => goTo('/musicians/enroll')}
                    canEnroll={canAccessRole(currentUser.role, ['SERV-PROVIDER'])}
                    currentUser={currentUser}
                  />
                }
              />
              <Route
                path="/musicians/enroll"
                element={
                  <RouteGuard currentUser={currentUser} allowedRoles={protectedRoles.musicians} redirectTo={getDefaultRoute(currentUser.role)}>
                    <EnrollMusicianPage musicianForm={musicianForm} setMusicianForm={setMusicianForm} onSubmit={handleMusicianSubmit} />
                  </RouteGuard>
                }
              />
              <Route
                path="/request-performance"
                element={
                  <RouteGuard currentUser={currentUser} allowedRoles={protectedRoles.requests} redirectTo={getDefaultRoute(currentUser.role)}>
                    <RequestPerformancePage
                      requestForm={requestForm}
                      setRequestForm={setRequestForm}
                      eventTypes={eventTypes}
                      musicians={musicians}
                      performanceRequests={performanceRequests}
                      selectedMusician={selectedMusician}
                      onSubmit={handleRequestSubmit}
                    />
                  </RouteGuard>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </>
      ) : null}
    </div>
  )
}

export default App
