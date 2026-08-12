import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

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
  preferred_event_type: 'Any event',
  preferred_contact_method: 'email',
  available_weekends: true,
  travel_buffer_minutes: 120,
}

const providerEventTypes = ['Any event', 'Community celebration', 'Birthday', 'Wedding', 'Fundraiser', 'School concert']

const emptyAvailabilityCalendar = {
  provider_id: null,
  travel_buffer_minutes: 120,
  timezone_label: 'Local time',
  from_date: '',
  to_date: '',
  days: [],
}

const eventTypes = ['Community celebration', 'Birthday', 'Wedding', 'Fundraiser', 'School concert', 'Other event']
const protectedRoles = {
  musicians: ['SERV-PROVIDER'],
  requests: ['CONSUMER', 'ADMIN'],
}

function getDefaultRoute(role) {
  if (role === 'SERV-PROVIDER') {
    return '/my-profile'
  }

  if (role === 'CONSUMER') {
    return '/'
  }

  return '/'
}

function canAccessRole(role, allowedRoles) {
  return role === 'ADMIN' || allowedRoles.includes(role)
}

function canEnrollMusician(role) {
  return role === 'SERV-PROVIDER' || role === 'ADMIN'
}

function canRequestPerformance(role) {
  return role === 'CONSUMER' || role === 'ADMIN'
}

function formatAuthError(detail, fallbackMessage) {
  if (typeof detail === 'string' && detail.trim()) {
    return detail
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        const fieldName = Array.isArray(item?.loc) ? item.loc.filter((part) => typeof part === 'string').slice(-1)[0] : ''
        const reason = item?.msg || item?.message || item?.detail

        if (!reason || typeof reason !== 'string' || !reason.trim()) {
          return ''
        }

        return fieldName ? `${fieldName}: ${reason}` : reason
      })
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

function getAuthFailureMessage(authMode, detail, fallbackMessage) {
  const actionLabel = authMode === 'register' ? 'Registration failed' : authMode === 'reset' ? 'Password reset failed' : 'Sign-in failed'
  return `${actionLabel}: ${formatAuthError(detail, fallbackMessage)}`
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
    confirmPassword: '',
    role: 'CONSUMER',
  })
  const [dashboard, setDashboard] = useState(null)
  const [musicians, setMusicians] = useState([])
  const [performanceRequests, setPerformanceRequests] = useState([])
  const [serviceProfile, setServiceProfile] = useState(null)
  const [serviceProfileForm, setServiceProfileForm] = useState(emptyServiceProfileForm)
  const [providerAvailabilityCalendar, setProviderAvailabilityCalendar] = useState(emptyAvailabilityCalendar)
  const [customerAvailabilityCalendar, setCustomerAvailabilityCalendar] = useState(emptyAvailabilityCalendar)
  const [publicServiceProviders, setPublicServiceProviders] = useState([])
  const [publicLoading, setPublicLoading] = useState(true)
  const [musicianForm, setMusicianForm] = useState(emptyMusicianForm)
  const [requestForm, setRequestForm] = useState(emptyRequestForm)
  const [message, setMessage] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [availabilityMessage, setAvailabilityMessage] = useState('')
  const [postAuthRedirect, setPostAuthRedirect] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingAvailability, setIsSavingAvailability] = useState(false)
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [pendingContactProvider, setPendingContactProvider] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

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
    setProviderAvailabilityCalendar(emptyAvailabilityCalendar)
    setCustomerAvailabilityCalendar(emptyAvailabilityCalendar)
    setPublicServiceProviders([])
    setMusicianForm(emptyMusicianForm)
    setRequestForm(emptyRequestForm)
    setMessage('')
    setAuthMessage(nextMessage)
    setProfileMessage('')
    setAvailabilityMessage('')
    setPostAuthRedirect('')
    setIsLoading(false)
    setPublicLoading(true)
    setIsSavingProfile(false)
    setIsSavingAvailability(false)
    setIsLoadingAvailability(false)
    setIsAuthModalOpen(false)
    setPendingContactProvider(null)
  }

  function resetAuthForm(nextMode = authMode) {
    setAuthForm((current) => ({
      ...current,
      password: '',
      confirmPassword: '',
      role: nextMode === 'register' ? current.role : 'CONSUMER',
    }))
  }

  function handleAuthModeChange(nextMode) {
    setAuthMode(nextMode)
    resetAuthForm(nextMode)
    setAuthMessage('')
  }

  function openAuthModal(nextMode, redirectTo = '') {
    if (redirectTo) {
      setPostAuthRedirect(redirectTo)
    }
    handleAuthModeChange(nextMode)
    setIsAuthModalOpen(true)
  }

  function closeAuthModal() {
    setIsAuthModalOpen(false)
  }

  function buildProviderContactLink(provider) {
    const subject = encodeURIComponent(`Music Connect inquiry for ${provider.full_name || 'your services'}`)
    const body = encodeURIComponent(
      `Hello ${provider.full_name || 'there'},\n\nI found your profile on Music Connect and would like to ask about your services for an upcoming event.\n\nBest regards,`,
    )
    return `mailto:${provider.email}?subject=${subject}&body=${body}`
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
          if (!ignore) {
            setCurrentUser(storedUser.user)
            setAccessToken(storedUser.accessToken)
            setAuthMode('login')
            setAuthForm({ email: storedUser.user.email, password: '', confirmPassword: '', role: storedUser.user.role })
            setAuthMessage('Session restored locally. Refreshing the server connection in the background.')
          }
          return
        }

        const user = await response.json()
        if (!ignore) {
          setCurrentUser(user)
          setAccessToken(storedUser.accessToken)
          setAuthMode('login')
          setAuthForm({ email: user.email, password: '', confirmPassword: '', role: user.role })
          setAuthMessage('')
        }
      } catch {
        if (!ignore) {
          setCurrentUser(storedUser.user)
          setAccessToken(storedUser.accessToken)
          setAuthMode('login')
          setAuthForm({ email: storedUser.user.email, password: '', confirmPassword: '', role: storedUser.user.role })
          setAuthMessage('Session restored locally. Refreshing the server connection in the background.')
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
      const isAdminRole = currentUser.role === 'ADMIN'
      const shouldLoadProfile = isServiceProviderRole || isAdminRole
      const shouldLoadRequesterData = currentUser.role === 'CONSUMER' || isAdminRole

      try {
        const requests = [fetch('/api/dashboard', { headers: getAuthHeaders() })]

        if (shouldLoadProfile) {
          requests.push(
            fetch('/api/service-profile/me', { headers: getAuthHeaders() }),
            fetch('/api/service-profile/me/availability-calendar?days=30', { headers: getAuthHeaders() }),
          )
        }

        if (shouldLoadRequesterData) {
          requests.push(
            fetch('/api/public/service-providers'),
            fetch('/api/performance-requests', { headers: getAuthHeaders() }),
          )
        }

        const responses = await Promise.all(requests)
        const [dashboardResponse] = responses

        if ([401, 403].includes(dashboardResponse.status)) {
          if (!ignore) {
            setMessage('Your session is still active, but the dashboard could not be refreshed right now.')
          }
          return
        }

        if (ignore) {
          return
        }

        if (!dashboardResponse.ok) {
          if (!ignore) {
            setMessage('Your session is still active, but some data could not be refreshed right now.')
          }
          return
        }

        const dashboardData = await dashboardResponse.json()
        setDashboard(dashboardData)

        if (shouldLoadProfile) {
          const profileResponse = responses[1]
          const availabilityResponse = responses[2]
          if (profileResponse.status === 404) {
            setServiceProfile(null)
            setServiceProfileForm(emptyServiceProfileForm)
            setProviderAvailabilityCalendar(emptyAvailabilityCalendar)
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
              preferred_event_type: profileData.preferred_event_type || emptyServiceProfileForm.preferred_event_type,
              preferred_contact_method:
                profileData.preferred_contact_method || emptyServiceProfileForm.preferred_contact_method,
              available_weekends: profileData.available_weekends,
              travel_buffer_minutes: profileData.travel_buffer_minutes ?? 120,
            })
            setProfileMessage('')

            if (availabilityResponse.ok) {
              const availabilityData = await availabilityResponse.json()
              setProviderAvailabilityCalendar(availabilityData)
            } else {
              setProviderAvailabilityCalendar(emptyAvailabilityCalendar)
            }
          } else {
            throw new Error('Unable to load your service profile')
          }

          if (!shouldLoadRequesterData) {
            setMusicians([])
            setPerformanceRequests([])
            setCustomerAvailabilityCalendar(emptyAvailabilityCalendar)
            return
          }
        }

        const [musiciansResponse, requestResponse] = shouldLoadProfile ? responses.slice(3) : responses.slice(1)

        if (requestResponse.status === 401) {
          setPerformanceRequests([])
          setMessage('Your performance requests could not be refreshed right now, but you remain signed in.')
        } else if (!requestResponse.ok) {
          setPerformanceRequests([])
        } else {
          const requestData = await requestResponse.json()
          setPerformanceRequests(requestData)
        }

        if (musiciansResponse.ok) {
          const musiciansData = await musiciansResponse.json()
          setMusicians(musiciansData)
        } else {
          setMusicians([])
        }
      } catch {
        if (!ignore) {
          setMessage('Some data could not be refreshed right now, but your session remains active until you sign out.')
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
    if (currentUser || location.pathname !== '/request-performance') {
      return
    }

    setAuthMode('login')
    setAuthMessage('Please sign in to request a performance.')
    setPostAuthRedirect('/request-performance')
    setIsAuthModalOpen(true)
    navigate('/', { replace: true })
  }, [currentUser, location.pathname, navigate])

  useEffect(() => {
    let ignore = false

    async function loadSelectedProviderAvailability() {
      if (!currentUser || !canAccessRole(currentUser.role, ['CONSUMER', 'ADMIN'])) {
        if (!ignore) {
          setCustomerAvailabilityCalendar(emptyAvailabilityCalendar)
          setAvailabilityMessage('')
          setIsLoadingAvailability(false)
        }
        return
      }

      const providerId = Number(requestForm.musician_id)
      if (!providerId) {
        if (!ignore) {
          setCustomerAvailabilityCalendar(emptyAvailabilityCalendar)
          setAvailabilityMessage('Select a service provider to view their availability calendar.')
          setIsLoadingAvailability(false)
        }
        return
      }

      setIsLoadingAvailability(true)
      setAvailabilityMessage('')
      try {
        const response = await fetch(`/api/service-providers/${providerId}/availability-calendar?days=30`, {
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          throw new Error('Unable to load availability')
        }

        const calendarData = await response.json()
        if (!ignore) {
          setCustomerAvailabilityCalendar(calendarData)
          const hasAnySlots = Array.isArray(calendarData.days)
            ? calendarData.days.some((day) => Array.isArray(day.slots) && day.slots.length > 0)
            : false

          setAvailabilityMessage(
            hasAnySlots
              ? `All times shown in ${calendarData.timezone_label}. This provider requires at least ${calendarData.travel_buffer_minutes} minutes between bookings.`
              : 'No availability slots have been published for the next 30 days.',
          )
        }
      } catch {
        if (!ignore) {
          setCustomerAvailabilityCalendar(emptyAvailabilityCalendar)
          setAvailabilityMessage('Could not load availability right now.')
        }
      } finally {
        if (!ignore) {
          setIsLoadingAvailability(false)
        }
      }
    }

    loadSelectedProviderAvailability()

    return () => {
      ignore = true
    }
  }, [currentUser, requestForm.musician_id])

  useEffect(() => {
    if (isAuthenticating || !currentUser) {
      return
    }

    if (currentUser.role === 'SERV-PROVIDER' && location.pathname !== '/my-profile') {
      navigate('/my-profile', { replace: true })
      return
    }

    if (currentUser.role === 'ADMIN' && serviceProfile && location.pathname !== '/my-profile') {
      navigate('/my-profile', { replace: true })
    }
  }, [currentUser, isAuthenticating, location.pathname, navigate, serviceProfile])

  useEffect(() => {
    if (!currentUser || !pendingContactProvider) {
      return
    }

    if (currentUser.role !== 'CONSUMER') {
      setMessage('Only consumers can email service providers from the profile cards.')
      setPendingContactProvider(null)
      return
    }

    window.location.href = buildProviderContactLink(pendingContactProvider)
    setPendingContactProvider(null)
  }, [currentUser, pendingContactProvider])

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
        const providersResponse = await fetch('/api/public/service-providers')

        if (!providersResponse.ok) {
          throw new Error('Unable to load public landing data')
        }

        const providers = await providersResponse.json()
        if (!ignore) {
          setPublicServiceProviders(providers)
        }
      } catch {
        if (!ignore) {
          setPublicServiceProviders([])
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
  const isAdmin = currentUser?.role === 'ADMIN'
  const showMusicianEnrollment = canEnrollMusician(currentUser?.role)
  const showConsumerRequest = canRequestPerformance(currentUser?.role)

  function goTo(path) {
    navigate(path)
  }

  function handleContactProvider(provider) {
    if (!provider?.email) {
      setMessage('This provider does not have an email address listed.')
      return
    }

    if (!currentUser) {
      setPendingContactProvider(provider)
      openAuthModal('login', location.pathname)
      setAuthMessage('Please sign in as a consumer to email this service provider.')
      return
    }

    if (currentUser.role !== 'CONSUMER') {
      setMessage('Only consumers can email service providers from the profile cards.')
      return
    }

    window.location.href = buildProviderContactLink(provider)
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

    if (authMode === 'register' && authForm.confirmPassword.trim() !== password) {
      setAuthMessage('Registration failed: Passwords do not match. Please enter the same password in both fields.')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setAuthMessage(authMode === 'reset' ? 'New password must be at least 8 characters long.' : 'Password must be at least 8 characters long.')
      setIsLoading(false)
      return
    }

    if (authMode === 'reset' && authForm.confirmPassword.trim() !== password) {
      setAuthMessage('New passwords do not match. Please enter the same password in both fields.')
      setIsLoading(false)
      return
    }

    try {
      const isRegisterMode = authMode === 'register'
      const isResetMode = authMode === 'reset'
      const response = await fetch(isRegisterMode ? '/api/auth/register' : isResetMode ? '/api/auth/reset-password' : '/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          ...(isRegisterMode || isResetMode ? { role: authForm.role } : {}),
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setAuthMessage(
          getAuthFailureMessage(
            authMode,
            payload?.detail,
            isResetMode
              ? 'Check the email address and selected profile type, then try again.'
              : 'Check the email, password, and selected role, then try again.',
          ),
        )
        return
      }

      if (isResetMode) {
        setAuthMode('login')
        setAuthForm({ email, password: '', confirmPassword: '', role: 'CONSUMER' })
        setAuthMessage(payload?.message || 'Password updated. You can sign in with your new password.')
        return
      }

      const { access_token: accessTokenValue, token_type: tokenType, ...user } = payload
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, accessToken: accessTokenValue, tokenType }))
      setCurrentUser(user)
      setAccessToken(accessTokenValue)
      setAuthMode('login')
      setAuthForm({ email: user.email, password: '', confirmPassword: '', role: user.role })
      setAuthMessage('')
      setIsAuthModalOpen(false)
      const redirectTo = postAuthRedirect || getDefaultRoute(user.role) || '/'
      setPostAuthRedirect('')
      navigate(redirectTo, { replace: true })
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

    if (currentUser?.role === 'ADMIN') {
      setServiceProfile(createdMusician)
      setServiceProfileForm({
        full_name: createdMusician.full_name,
        instrument: createdMusician.instrument,
        city: createdMusician.city,
        state: createdMusician.state,
        phone: createdMusician.phone,
        bio: createdMusician.bio,
        rate: createdMusician.rate,
        preferred_event_type: createdMusician.preferred_event_type,
        preferred_contact_method: createdMusician.preferred_contact_method,
        available_weekends: createdMusician.available_weekends,
        travel_buffer_minutes: createdMusician.travel_buffer_minutes ?? 120,
      })
      setProviderAvailabilityCalendar(emptyAvailabilityCalendar)
      navigate('/my-profile', { replace: true })
    }
  }

  async function handleRequestSubmit(event) {
    event.preventDefault()
    setMessage('')

    const hasPublishedAvailability = Array.isArray(customerAvailabilityCalendar.days)
      ? customerAvailabilityCalendar.days.some((day) => Array.isArray(day.slots) && day.slots.length > 0)
      : false

    if (hasPublishedAvailability && !requestForm.event_datetime) {
      setMessage('Choose one of the provider\'s published time slots from the availability calendar.')
      return
    }

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
      const payload = await response.json().catch(() => null)
      setMessage(formatAuthError(payload?.detail, 'Could not save the performance request.'))
      return
    }

    const createdRequest = await response.json()
    setPerformanceRequests((current) => [createdRequest, ...current])
    setRequestForm((current) => ({
      ...emptyRequestForm,
      musician_id: current.musician_id,
    }))

    const providerId = Number(payload.musician_id)
    if (providerId) {
      const availabilityRefresh = await fetch(`/api/service-providers/${providerId}/availability-calendar?days=30`, {
        headers: getAuthHeaders(),
      })
      if (availabilityRefresh.ok) {
        const calendarData = await availabilityRefresh.json()
        setCustomerAvailabilityCalendar(calendarData)
      }
    }

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
        preferred_event_type: payload.preferred_event_type,
        preferred_contact_method: payload.preferred_contact_method,
        available_weekends: payload.available_weekends,
        travel_buffer_minutes: payload.travel_buffer_minutes ?? 120,
      })
      setProfileMessage('Your service provider profile was saved.')

      const availabilityResponse = await fetch('/api/service-profile/me/availability-calendar?days=30', {
        headers: getAuthHeaders(),
      })
      if (availabilityResponse.ok) {
        const availabilityData = await availabilityResponse.json()
        setProviderAvailabilityCalendar(availabilityData)
      }
    } catch {
      setProfileMessage('Unable to contact the server. Check that the backend is running and try again.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function handleCreateAvailabilitySlot({ startsAt, endsAt }) {
    setAvailabilityMessage('')
    setIsSavingAvailability(true)
    try {
      const createResponse = await fetch('/api/service-profile/me/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          starts_at: startsAt,
          ends_at: endsAt,
        }),
      })

      const createPayload = await createResponse.json().catch(() => null)
      if (!createResponse.ok) {
        setAvailabilityMessage(formatAuthError(createPayload?.detail, 'Could not save availability slot.'))
        return false
      }

      const calendarResponse = await fetch('/api/service-profile/me/availability-calendar?days=30', {
        headers: getAuthHeaders(),
      })
      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json()
        setProviderAvailabilityCalendar(calendarData)
        setAvailabilityMessage('Availability slot added.')
      }
      return true
    } catch {
      setAvailabilityMessage('Unable to contact the server. Check that the backend is running and try again.')
      return false
    } finally {
      setIsSavingAvailability(false)
    }
  }

  async function handleDeleteAvailabilitySlot(slotId) {
    setAvailabilityMessage('')
    setIsSavingAvailability(true)
    try {
      const deleteResponse = await fetch(`/api/service-profile/me/availability/${slotId}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders(),
        },
      })

      const deletePayload = await deleteResponse.json().catch(() => null)
      if (!deleteResponse.ok) {
        setAvailabilityMessage(formatAuthError(deletePayload?.detail, 'Could not delete availability slot.'))
        return
      }

      const calendarResponse = await fetch('/api/service-profile/me/availability-calendar?days=30', {
        headers: getAuthHeaders(),
      })
      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json()
        setProviderAvailabilityCalendar(calendarData)
      }
      setAvailabilityMessage('Availability slot removed.')
    } catch {
      setAvailabilityMessage('Unable to contact the server. Check that the backend is running and try again.')
    } finally {
      setIsSavingAvailability(false)
    }
  }

  async function handleUpdateAvailabilitySlot(slotId, { startsAt, endsAt }) {
    setAvailabilityMessage('')
    setIsSavingAvailability(true)
    try {
      const updateResponse = await fetch(`/api/service-profile/me/availability/${slotId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          starts_at: startsAt,
          ends_at: endsAt,
        }),
      })

      const updatePayload = await updateResponse.json().catch(() => null)
      if (!updateResponse.ok) {
        setAvailabilityMessage(formatAuthError(updatePayload?.detail, 'Could not update availability slot.'))
        return false
      }

      const calendarResponse = await fetch('/api/service-profile/me/availability-calendar?days=30', {
        headers: getAuthHeaders(),
      })
      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json()
        setProviderAvailabilityCalendar(calendarData)
      }
      setAvailabilityMessage('Availability slot updated.')
      return true
    } catch {
      setAvailabilityMessage('Unable to contact the server. Check that the backend is running and try again.')
      return false
    } finally {
      setIsSavingAvailability(false)
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

                <div className="header-auth-actions">
                  <button className="button secondary slim-button nav-button" type="button" onClick={() => openAuthModal('login')}>
                    Login
                  </button>
                  <button className="button primary slim-button nav-button" type="button" onClick={() => openAuthModal('register')}>
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
              onRequest={() => openAuthModal('login', '/request-performance')}
              publicServiceProviders={publicServiceProviders}
              onContactProvider={handleContactProvider}
              isLanding
            />
          </main>

          {isAuthModalOpen ? (
            <div className="auth-modal-backdrop" role="dialog" aria-modal="true" aria-label="Authentication" onClick={closeAuthModal}>
              <div className="auth-modal-panel" onClick={(event) => event.stopPropagation()}>
                <button className="chip auth-modal-close" type="button" onClick={closeAuthModal}>
                  Close
                </button>
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
              </div>
            </div>
          ) : null}
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
                ) : isAdmin && serviceProfile ? (
                  <NavLink className={({ isActive }) => (isActive ? 'nav-link nav-link-accent active' : 'nav-link nav-link-accent')} to="/my-profile">
                    My profile
                  </NavLink>
                ) : isAdmin ? (
                  <NavLink className={({ isActive }) => (isActive ? 'nav-link nav-link-accent active' : 'nav-link nav-link-accent')} to="/musicians/enroll">
                    Enroll musician
                  </NavLink>
                ) : (
                  <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/musicians">
                    Local musicians
                  </NavLink>
                )}
                {!isServiceProvider && !isAdmin && showMusicianEnrollment ? (
                  <NavLink className={({ isActive }) => (isActive ? 'nav-link nav-link-accent active' : 'nav-link nav-link-accent')} to="/musicians/enroll">
                    Enroll musician
                  </NavLink>
                ) : null}
                {showConsumerRequest ? (
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
                    canEnroll={!isServiceProvider && showMusicianEnrollment}
                    canRequest={showConsumerRequest}
                    onContactProvider={handleContactProvider}
                    publicServiceProviders={publicServiceProviders}
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
                      canEnroll={showMusicianEnrollment}
                      currentUser={currentUser}
                      onContactProvider={handleContactProvider}
                    />
                  )
                }
              />
              <Route
                path="/my-profile"
                element={
                  <RouteGuard currentUser={currentUser} allowedRoles={["SERV-PROVIDER", "ADMIN"]} redirectTo={getDefaultRoute(currentUser.role)}>
                    <ManageServiceProfilePage
                      profileForm={serviceProfileForm}
                      setProfileForm={setServiceProfileForm}
                      onSubmit={handleServiceProfileSubmit}
                      currentUser={currentUser}
                      isSaving={isSavingProfile}
                      isSavingAvailability={isSavingAvailability}
                      hasProfile={Boolean(serviceProfile)}
                      message={profileMessage}
                      availabilityMessage={availabilityMessage}
                      availabilityCalendar={providerAvailabilityCalendar}
                      preferredEventTypes={providerEventTypes}
                      onCreateAvailabilitySlot={handleCreateAvailabilitySlot}
                      onUpdateAvailabilitySlot={handleUpdateAvailabilitySlot}
                      onDeleteAvailabilitySlot={handleDeleteAvailabilitySlot}
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
                    <RouteGuard currentUser={currentUser} allowedRoles={["SERV-PROVIDER", "ADMIN"]} redirectTo={getDefaultRoute(currentUser.role)}>
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
                      availabilityCalendar={customerAvailabilityCalendar}
                      availabilityMessage={availabilityMessage}
                      isLoadingAvailability={isLoadingAvailability}
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
