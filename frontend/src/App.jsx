import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'

import { AuthPage, EnrollMusicianPage, HomePage, ManageServiceProfilePage, MusiciansPage, RequestPerformancePage } from './components'

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

const emptyServiceProfileForm = {
  full_name: '',
  instrument: 'Piano',
  city: '',
  state: '',
  phone: '',
  bio: 'Community musician available for local events.',
  rate: 'Available upon request',
  available_weekends: true,
}

const eventTypes = ['Community celebration', 'Birthday', 'Wedding', 'Fundraiser', 'School concert', 'Other event']
const protectedRoles = {
  musicians: ['SERV-PROVIDER'],
  requests: ['CONSUMER'],
}

function getDefaultRoute(role) {
  if (role === 'SERV-PROVIDER') {
    return '/my-profile'
  }

  if (role === 'CONSUMER') {
    return '/request-performance'
  }

  return '/'
}

function canAccessRole(role, allowedRoles) {
  return role === 'ADMIN' || allowedRoles.includes(role)
}

function formatAuthError(detail, fallbackMessage) {
  if (typeof detail === 'string' && detail.trim()) {
    return detail
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => item?.msg || item?.message || item?.detail)
      .filter((item) => typeof item === 'string' && item.trim())

    if (messages.length > 0) {
      return messages.join(' ')
    }
  }

  if (detail && typeof detail === 'object' && typeof detail.detail === 'string' && detail.detail.trim()) {
    return detail.detail
  }

  return fallbackMessage
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
  const [serviceProfile, setServiceProfile] = useState(null)
  const [serviceProfileForm, setServiceProfileForm] = useState(emptyServiceProfileForm)
  const [publicServiceProviders, setPublicServiceProviders] = useState([])
  const [publicEventRequests, setPublicEventRequests] = useState([])
  const [publicLoading, setPublicLoading] = useState(true)
  const [musicianForm, setMusicianForm] = useState(emptyMusicianForm)
  const [requestForm, setRequestForm] = useState(emptyRequestForm)
  const [message, setMessage] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
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
    setServiceProfile(null)
    setServiceProfileForm(emptyServiceProfileForm)
    setPublicServiceProviders([])
    setPublicEventRequests([])
    setMusicianForm(emptyMusicianForm)
    setRequestForm(emptyRequestForm)
    setMessage('')
    setAuthMessage(nextMessage)
    setProfileMessage('')
    setIsLoading(false)
    setPublicLoading(true)
    setIsSavingProfile(false)
  }

  function resetAuthForm(nextMode = authMode) {
    setAuthForm((current) => ({
      ...current,
      password: '',
      role: nextMode === 'register' ? current.role : 'CONSUMER',
    }))
  }

  function handleAuthModeChange(nextMode) {
    setAuthMode(nextMode)
    resetAuthForm(nextMode)
    setAuthMessage('')
  }

  useEffect(() => {
    let ignore = false

    async function restoreSession() {
      const rawUser = localStorage.getItem(AUTH_STORAGE_KEY)
      if (!rawUser) {
        if (!ignore) {
          setIsAuthenticating(false)
          return
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
          setAuthForm({ email: user.email, password: '', role: user.role })
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

      const isServiceProviderRole = currentUser.role === 'SERV-PROVIDER'

      try {
        const requests = [fetch('/api/dashboard', { headers: getAuthHeaders() })]

        if (isServiceProviderRole) {
          requests.push(fetch('/api/service-profile/me', { headers: getAuthHeaders() }))
        } else {
          requests.push(
            fetch('/api/musicians', { headers: getAuthHeaders() }),
            fetch('/api/performance-requests', { headers: getAuthHeaders() }),
          )
        }

        const responses = await Promise.all(requests)
        const [dashboardResponse] = responses

        if ([401, 403].includes(dashboardResponse.status)) {
          throw new Error('Session expired')
        }

        if (ignore) {
          return
        }

        if (!dashboardResponse.ok) {
          throw new Error('Unable to load protected data')
        }

        const dashboardData = await dashboardResponse.json()
        setDashboard(dashboardData)

        if (isServiceProviderRole) {
          const profileResponse = responses[1]
          if (profileResponse.status === 404) {
            setServiceProfile(null)
            setServiceProfileForm(emptyServiceProfileForm)
            setProfileMessage('No profile exists yet. Create your profile to get started.')
          } else if (profileResponse.ok) {
            const profileData = await profileResponse.json()
            setServiceProfile(profileData)
            setServiceProfileForm({
              full_name: profileData.full_name,
              instrument: profileData.instrument,
              city: profileData.city,
              state: profileData.state,
              phone: profileData.phone,
              bio: profileData.bio || emptyServiceProfileForm.bio,
              rate: profileData.rate || emptyServiceProfileForm.rate,
              available_weekends: profileData.available_weekends,
            })
            setProfileMessage('')
          } else {
            throw new Error('Unable to load your service profile')
          }

          setMusicians([])
          setPerformanceRequests([])
          return
        }

        const [musiciansResponse, requestResponse] = responses.slice(1)

        if ([musiciansResponse, requestResponse].some((response) => response.status === 401)) {
          throw new Error('Session expired')
        }

        if ([musiciansResponse, requestResponse].some((response) => !response.ok)) {
          throw new Error('Unable to load protected data')
        }

        const [musiciansData, requestData] = await Promise.all([
          musiciansResponse.json(),
          requestResponse.json(),
        ])

        setMusicians(musiciansData)
        setPerformanceRequests(requestData)
      } catch {
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
    let ignore = false

    async function loadPublicLandingData() {
      if (currentUser) {
        if (!ignore) {
          setPublicLoading(false)
        }
        return
      }

      setPublicLoading(true)

      try {
        const [providersResponse, eventsResponse] = await Promise.all([
          fetch('/api/public/service-providers'),
          fetch('/api/public/event-requests'),
        ])

        if (!providersResponse.ok || !eventsResponse.ok) {
          throw new Error('Unable to load public landing data')
        }

        const [providers, events] = await Promise.all([providersResponse.json(), eventsResponse.json()])
        if (!ignore) {
          setPublicServiceProviders(providers)
          setPublicEventRequests(events)
        }
      } catch {
        if (!ignore) {
          setPublicServiceProviders([])
          setPublicEventRequests([])
        }
      } finally {
        if (!ignore) {
          setPublicLoading(false)
        }
      }
    }

    loadPublicLandingData()

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

  const isServiceProvider = currentUser?.role === 'SERV-PROVIDER'

  function goTo(path) {
    navigate(path)
  }

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setAuthMessage('')
    setIsLoading(true)

    const email = authForm.email.trim().toLowerCase()
    const password = authForm.password.trim()

    if (!email) {
      setAuthMessage('Email address is required.')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setAuthMessage('Password must be at least 8 characters long.')
      setIsLoading(false)
      return
    }

    try {
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
        setAuthMessage(formatAuthError(payload?.detail, 'Could not open this account.'))
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
    } catch {
      setAuthMessage('Unable to contact the server. Check that the backend is running and try again.')
    } finally {
      setIsLoading(false)
    }
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

  async function handleServiceProfileSubmit(event) {
    event.preventDefault()
    setProfileMessage('')
    setIsSavingProfile(true)

    try {
      const response = await fetch('/api/service-profile/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(serviceProfileForm),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setProfileMessage(formatAuthError(payload?.detail, 'Could not save your profile.'))
        return
      }

      setServiceProfile(payload)
      setServiceProfileForm({
        full_name: payload.full_name,
        instrument: payload.instrument,
        city: payload.city,
        state: payload.state,
        phone: payload.phone,
        bio: payload.bio,
        rate: payload.rate,
        available_weekends: payload.available_weekends,
      })
      setProfileMessage('Your service provider profile was saved.')
    } catch {
      setProfileMessage('Unable to contact the server. Check that the backend is running and try again.')
    } finally {
      setIsSavingProfile(false)
    }
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
        <>
          <header className="site-header">
            <div className="site-header-inner card landing-header-inner">
              <NavLink className="brand-link" to="/">
                Music Connect
              </NavLink>

              <nav className="header-nav landing-header-nav" aria-label="Primary">
                <a className="nav-link" href="#service-providers">
                  Service provider profiles
                </a>
                <a className="nav-link" href="#event-requests">
                  Event requests
                </a>

                <div className="header-auth-actions">
                  <button className="button secondary slim-button nav-button" type="button" onClick={() => handleAuthModeChange('login')}>
                    Login
                  </button>
                  <button className="button primary slim-button nav-button" type="button" onClick={() => handleAuthModeChange('register')}>
                    Register
                  </button>
                </div>
              </nav>
            </div>
          </header>

          <main className="page landing-page">
            <HomePage
              dashboard={dashboard}
              isLoading={publicLoading}
              currentUser={null}
              canEnroll={false}
              canRequest={false}
              publicServiceProviders={publicServiceProviders}
              publicEventRequests={publicEventRequests}
              isLanding
            />

            <section id="auth" className="section-anchor landing-auth-section">
              <AuthPage
                authForm={authForm}
                setAuthForm={setAuthForm}
                onSubmit={handleAuthSubmit}
                isLoading={isLoading}
                adminEmail={ADMIN_EMAIL}
                authMode={authMode}
                setAuthMode={handleAuthModeChange}
                message={authMessage}
              />
            </section>
          </main>
        </>
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
                {isServiceProvider ? (
                  <NavLink className={({ isActive }) => (isActive ? 'nav-link nav-link-accent active' : 'nav-link nav-link-accent')} to="/my-profile">
                    My profile
                  </NavLink>
                ) : (
                  <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/musicians">
                    Local musicians
                  </NavLink>
                )}
                {!isServiceProvider && canAccessRole(currentUser.role, ['SERV-PROVIDER']) ? (
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
                    onEnroll={() => goTo(isServiceProvider ? '/my-profile' : '/musicians/enroll')}
                    onRequest={() => goTo('/request-performance')}
                    currentUser={currentUser}
                    canEnroll={!isServiceProvider && canAccessRole(currentUser.role, ['SERV-PROVIDER'])}
                    canRequest={canAccessRole(currentUser.role, ['CONSUMER'])}
                  />
                }
              />
              <Route
                path="/musicians"
                element={
                  isServiceProvider ? (
                    <Navigate to="/my-profile" replace />
                  ) : (
                    <MusiciansPage
                      musicians={musicians}
                      onEnroll={() => goTo('/musicians/enroll')}
                      canEnroll={canAccessRole(currentUser.role, ['SERV-PROVIDER'])}
                      currentUser={currentUser}
                    />
                  )
                }
              />
              <Route
                path="/my-profile"
                element={
                  <RouteGuard currentUser={currentUser} allowedRoles={["SERV-PROVIDER"]} redirectTo={getDefaultRoute(currentUser.role)}>
                    <ManageServiceProfilePage
                      profileForm={serviceProfileForm}
                      setProfileForm={setServiceProfileForm}
                      onSubmit={handleServiceProfileSubmit}
                      currentUser={currentUser}
                      isSaving={isSavingProfile}
                      hasProfile={Boolean(serviceProfile)}
                      message={profileMessage}
                    />
                  </RouteGuard>
                }
              />
              <Route
                path="/musicians/enroll"
                element={
                  isServiceProvider ? (
                    <Navigate to="/my-profile" replace />
                  ) : (
                    <RouteGuard currentUser={currentUser} allowedRoles={["ADMIN"]} redirectTo={getDefaultRoute(currentUser.role)}>
                      <EnrollMusicianPage musicianForm={musicianForm} setMusicianForm={setMusicianForm} onSubmit={handleMusicianSubmit} />
                    </RouteGuard>
                  )
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
