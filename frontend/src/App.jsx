import { useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import {
  AdminIssuesPage,
  AuthPage,
  ContactAdminPage,
  HomePage,
  ManageServiceProfilePage,
  MusiciansPage,
  RequestPerformancePage,
} from './components'
import { instrumentOptions } from './components/instruments'

const ADMIN_EMAIL = 'kanjaney05@gmail.com'
const AUTH_STORAGE_KEY = 'music-connect-auth-user'
const SELECTED_PROFILE_STORAGE_KEY = 'music-connect-selected-service-profile-id'

const emptyRequestForm = {
  event_type: 'Community celebration',
  other_event: '',
  musician_id: '',
  preferred_instrument: '',
  preferred_other_instrument: '',
  event_datetime: '',
  notes: '',
}

const emptySupportIssueForm = {
  subject: '',
  message: '',
}

const emptyServiceProfileForm = {
  full_name: '',
  instrument: 'Piano',
  other_instrument: '',
  zip_code: '',
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
function buildServiceProfileForm(profile) {
  if (!profile) {
    return emptyServiceProfileForm
  }

  return {
    full_name: profile.full_name,
    instrument: instrumentOptions.includes(profile.instrument) ? profile.instrument : 'Other',
    other_instrument: instrumentOptions.includes(profile.instrument) ? '' : profile.instrument,
    zip_code: profile.zip_code || '',
    city: profile.city,
    state: profile.state,
    phone: profile.phone,
    bio: profile.bio || emptyServiceProfileForm.bio,
    rate: profile.rate || emptyServiceProfileForm.rate,
    preferred_event_type: profile.preferred_event_type || emptyServiceProfileForm.preferred_event_type,
    preferred_contact_method: profile.preferred_contact_method || emptyServiceProfileForm.preferred_contact_method,
    available_weekends: profile.available_weekends,
    travel_buffer_minutes: profile.travel_buffer_minutes ?? 120,
  }
}

function getDefaultRoute(role) {
  return '/'
}

function canAccessRole(role, allowedRoles) {
  return role === 'ADMIN' || allowedRoles.includes(role)
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
  const [serviceProfiles, setServiceProfiles] = useState([])
  const [selectedServiceProfileId, setSelectedServiceProfileId] = useState('')
  const [serviceProfile, setServiceProfile] = useState(null)
  const [serviceProfileForm, setServiceProfileForm] = useState(emptyServiceProfileForm)
  const [providerAvailabilityCalendar, setProviderAvailabilityCalendar] = useState(emptyAvailabilityCalendar)
  const [customerAvailabilityCalendar, setCustomerAvailabilityCalendar] = useState(emptyAvailabilityCalendar)
  const [publicServiceProviders, setPublicServiceProviders] = useState([])
  const [publicLoading, setPublicLoading] = useState(true)
  const [requestForm, setRequestForm] = useState(emptyRequestForm)
  const [supportIssues, setSupportIssues] = useState([])
  const [supportIssueForm, setSupportIssueForm] = useState(emptySupportIssueForm)
  const [message, setMessage] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [availabilityMessage, setAvailabilityMessage] = useState('')
  const [supportMessage, setSupportMessage] = useState('')
  const [postAuthRedirect, setPostAuthRedirect] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingAvailability, setIsSavingAvailability] = useState(false)
  const [isSavingSupportIssue, setIsSavingSupportIssue] = useState(false)
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [pendingContactProvider, setPendingContactProvider] = useState(null)
  const serviceProfileDraftDirtyRef = useRef(false)
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
    setServiceProfiles([])
    setSelectedServiceProfileId('')
    setServiceProfile(null)
    setServiceProfileForm(emptyServiceProfileForm)
    setProviderAvailabilityCalendar(emptyAvailabilityCalendar)
    setCustomerAvailabilityCalendar(emptyAvailabilityCalendar)
    setPublicServiceProviders([])
    setRequestForm(emptyRequestForm)
    setSupportIssues([])
    setSupportIssueForm(emptySupportIssueForm)
    setMessage('')
    setAuthMessage(nextMessage)
    setProfileMessage('')
    setAvailabilityMessage('')
    setSupportMessage('')
    setPostAuthRedirect('')
    localStorage.removeItem(SELECTED_PROFILE_STORAGE_KEY)
    setIsLoading(false)
    setPublicLoading(true)
    setIsSavingProfile(false)
    setIsSavingAvailability(false)
    setIsSavingSupportIssue(false)
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

  function formatProviderLocation(provider) {
    const locationParts = [provider?.city, provider?.state].filter((part) => typeof part === 'string' && part.trim())
    const location = locationParts.join(', ')
    const zipCode = typeof provider?.zip_code === 'string' && provider.zip_code.trim() ? provider.zip_code.trim() : ''

    if (location && zipCode) {
      return `${location} · ${zipCode}`
    }

    return location || zipCode || 'Location not listed'
  }

  async function resolveZipLocation(zipCode) {
    const digits = (zipCode || '').replace(/\D/g, '')
    if (digits.length < 5) {
      return null
    }

    const normalizedZip = digits.slice(0, 5)
    const response = await fetch(`/api/zip-lookup/${normalizedZip}`)
    if (!response.ok) {
      return null
    }

    const location = await response.json()
    return {
      zip_code: normalizedZip,
      city: location.city || '',
      state: location.state || '',
    }
  }

  function setActiveServiceProfile(profile, options = {}) {
    const { resetDraft = true } = options

    if (!profile) {
      setSelectedServiceProfileId('')
      setServiceProfile(null)
      setProviderAvailabilityCalendar(emptyAvailabilityCalendar)
      localStorage.removeItem(SELECTED_PROFILE_STORAGE_KEY)
      if (resetDraft) {
        setServiceProfileForm(emptyServiceProfileForm)
        serviceProfileDraftDirtyRef.current = false
      } else {
        serviceProfileDraftDirtyRef.current = true
      }
      return
    }

    setSelectedServiceProfileId(String(profile.id))
    setServiceProfile(profile)
    setServiceProfileForm(buildServiceProfileForm(profile))
    serviceProfileDraftDirtyRef.current = false
    localStorage.setItem(SELECTED_PROFILE_STORAGE_KEY, String(profile.id))
  }

  function updateServiceProfileForm(nextValue) {
    serviceProfileDraftDirtyRef.current = true
    setServiceProfileForm(nextValue)
  }

  async function handleSelectServiceProfile(nextProfileId) {
    if (!nextProfileId) {
      setActiveServiceProfile(null, { resetDraft: false })
      setProfileMessage('Create a new profile below to add another account.')
      return
    }

    const nextProfile = serviceProfiles.find((profile) => String(profile.id) === String(nextProfileId))
    if (!nextProfile) {
      setProfileMessage('That profile is no longer available.')
      return
    }

    setActiveServiceProfile(nextProfile)
    setProfileMessage('')

    if (canManageAvailability) {
      await refreshServiceProfileCalendar(nextProfile.id, serviceProfiles)
    }
  }

  async function handleDeleteServiceProfile(profileId) {
    if (!profileId) {
      return
    }

    const selectedProfile = serviceProfiles.find((profile) => String(profile.id) === String(profileId))
    if (!selectedProfile) {
      setProfileMessage('That profile is no longer available.')
      return
    }

    const confirmed = window.confirm(
      `Delete the profile for ${selectedProfile.full_name}? This also removes its availability and related performance requests.`,
    )
    if (!confirmed) {
      return
    }

    setProfileMessage('')
    const response = await fetch(`/api/service-profiles/me/${selectedProfile.id}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
      },
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setProfileMessage(formatAuthError(payload?.detail, 'Could not delete the selected profile.'))
      return
    }

    const remainingProfiles = serviceProfiles.filter((profile) => String(profile.id) !== String(selectedProfile.id))
    setServiceProfiles(remainingProfiles)

    const nextProfile = remainingProfiles[0] || null
    setActiveServiceProfile(nextProfile)
    if (nextProfile && canManageAvailability) {
      await refreshServiceProfileCalendar(nextProfile.id, remainingProfiles)
    }
    setProfileMessage(payload?.message || 'Service profile deleted.')
  }

  async function refreshServiceProfileCalendar(profileId, profiles = serviceProfiles) {
    if (!profileId || !canManageAvailability) {
      setProviderAvailabilityCalendar(emptyAvailabilityCalendar)
      return
    }

    const selectedProfile = profiles.find((profile) => String(profile.id) === String(profileId))
    if (!selectedProfile) {
      setProviderAvailabilityCalendar(emptyAvailabilityCalendar)
      return
    }

    const calendarResponse = await fetch(`/api/service-profiles/me/${selectedProfile.id}/availability-calendar?days=30`, {
      headers: getAuthHeaders(),
    })

    if (!calendarResponse.ok) {
      setProviderAvailabilityCalendar(emptyAvailabilityCalendar)
      return
    }

    const calendarData = await calendarResponse.json()
    setProviderAvailabilityCalendar(calendarData)
  }

  async function refreshSupportIssues() {
    if (!currentUser) {
      setSupportIssues([])
      return
    }

    const endpoint = currentUser.role === 'ADMIN' ? '/api/support-issues' : '/api/support-issues/me'
    const response = await fetch(endpoint, {
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      setSupportIssues([])
      return
    }

    const issues = await response.json()
    setSupportIssues(issues)
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
      const canManageAvailability = isServiceProviderRole || isAdminRole
      const shouldLoadRequesterData = currentUser.role === 'CONSUMER' || isAdminRole || isServiceProviderRole
      const supportIssuesEndpoint = isAdminRole ? '/api/support-issues' : '/api/support-issues/me'

      try {
        const requests = [
          fetch('/api/dashboard', { headers: getAuthHeaders() }),
          fetch('/api/service-profiles/me', { headers: getAuthHeaders() }),
          fetch(supportIssuesEndpoint, { headers: getAuthHeaders() }),
          fetch('/api/public/service-providers'),
        ]

        if (shouldLoadRequesterData) {
          requests.push(fetch('/api/performance-requests', { headers: getAuthHeaders() }))
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

        const profileResponse = responses[1]
        const supportIssuesResponse = responses[2]
        const publicServiceProvidersResponse = responses[3]
        let loadedProfiles = []

        if (profileResponse.ok) {
          loadedProfiles = await profileResponse.json()
          setServiceProfiles(loadedProfiles)

          const storedProfileId = localStorage.getItem(SELECTED_PROFILE_STORAGE_KEY)
          const selectedProfileFromStorage =
            loadedProfiles.find((profile) => String(profile.id) === String(storedProfileId)) || null
          const shouldPreserveDraft = serviceProfileDraftDirtyRef.current && !selectedProfileFromStorage
          const selectedProfile = selectedProfileFromStorage || loadedProfiles[0] || null

          if (selectedProfile && (!shouldPreserveDraft || selectedProfileFromStorage)) {
            setActiveServiceProfile(selectedProfile)
            setProfileMessage('')
          } else if (!shouldPreserveDraft) {
            setActiveServiceProfile(null)
            setProfileMessage('No profile exists yet. Create a new profile to get started.')
          } else {
            setProfileMessage('')
          }
        } else if (profileResponse.status === 404) {
          setServiceProfiles([])
          if (!serviceProfileDraftDirtyRef.current) {
            setActiveServiceProfile(null)
          }
          setProviderAvailabilityCalendar(emptyAvailabilityCalendar)
          setProfileMessage('No profile exists yet. Create a new profile to get started.')
        } else {
          throw new Error('Unable to load your service profile')
        }

        if (supportIssuesResponse.ok) {
          const issuesData = await supportIssuesResponse.json()
          setSupportIssues(issuesData)
        } else {
          setSupportIssues([])
        }

        if (publicServiceProvidersResponse.ok) {
          const publicProviders = await publicServiceProvidersResponse.json()
          setPublicServiceProviders(publicProviders)
          setMusicians(publicProviders)
        } else {
          setPublicServiceProviders([])
          setMusicians([])
        }

        if (selectedServiceProfileId) {
          await refreshServiceProfileCalendar(selectedServiceProfileId, loadedProfiles)
        } else if (!canManageAvailability) {
          setProviderAvailabilityCalendar(emptyAvailabilityCalendar)
        }

        if (!shouldLoadRequesterData) {
          setPerformanceRequests([])
          setCustomerAvailabilityCalendar(emptyAvailabilityCalendar)
          return
        }

        const profileOffset = 4
        const [musiciansResponse, requestResponse] = responses.slice(profileOffset)

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
  }, [currentUser, isAuthenticating, location.pathname, navigate, serviceProfile])

  useEffect(() => {
    if (!currentUser || location.pathname !== '/contact-admin') {
      return
    }

    if (currentUser.role === 'ADMIN') {
      navigate('/admin/issues', { replace: true })
    }
  }, [currentUser, location.pathname, navigate])

  useEffect(() => {
    if (!currentUser || location.pathname !== '/admin/issues') {
      return
    }

    if (currentUser.role !== 'ADMIN') {
      navigate('/contact-admin', { replace: true })
    }
  }, [currentUser, location.pathname, navigate])

  useEffect(() => {
    let ignore = false

    async function syncLocationFromZip() {
      try {
        const location = await resolveZipLocation(serviceProfileForm.zip_code)
        if (!location || ignore) {
          return
        }

        setServiceProfileForm((current) => ({
          ...current,
          zip_code: location.zip_code,
          city: location.city || current.city,
          state: location.state || current.state,
        }))
      } catch {
        return
      }
    }

    syncLocationFromZip()

    return () => {
      ignore = true
    }
  }, [serviceProfileForm.zip_code])

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

  const selectedMusician = useMemo(() => {
    return musicians.find((musician) => String(musician.id) === String(requestForm.musician_id))
  }, [musicians, requestForm.musician_id])

  const selectedServiceProfile = useMemo(() => {
    return serviceProfiles.find((profile) => String(profile.id) === String(selectedServiceProfileId)) || null
  }, [serviceProfiles, selectedServiceProfileId])

  const isServiceProvider = currentUser?.role === 'SERV-PROVIDER'
  const isAdmin = currentUser?.role === 'ADMIN'
  const canManageAvailability = isServiceProvider || isAdmin
  const showConsumerRequest = canRequestPerformance(currentUser?.role)
  const showOwnProfile = Boolean(currentUser)

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

  async function handleSubmitProviderRating(providerId, rating, ratingMessage) {
    try {
      const response = await fetch(`/api/service-providers/${providerId}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ rating, message: ratingMessage }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        return { ok: false, message: formatAuthError(payload?.detail, 'Could not save your rating.') }
      }

      const providersResponse = await fetch('/api/public/service-providers')
      if (providersResponse.ok) {
        const providers = await providersResponse.json()
        setPublicServiceProviders(providers)
        setMusicians(providers)
      }
      return { ok: true, message: 'Your rating was posted.' }
    } catch {
      return { ok: false, message: 'Unable to contact the server. Please try again.' }
    }
  }

  async function handleSupportIssueSubmit(event) {
    event.preventDefault()
    setSupportMessage('')

    if (!currentUser || currentUser.role === 'ADMIN') {
      setSupportMessage('Only consumers and service providers can send support issues from this page.')
      return
    }

    if (!supportIssueForm.subject.trim() || !supportIssueForm.message.trim()) {
      setSupportMessage('Please add a subject and a message before sending the issue.')
      return
    }

    setIsSavingSupportIssue(true)
    try {
      const response = await fetch('/api/support-issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          subject: supportIssueForm.subject,
          message: supportIssueForm.message,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setSupportMessage(formatAuthError(payload?.detail, 'Could not send your issue.'))
        return
      }

      setSupportIssueForm(emptySupportIssueForm)
      await refreshSupportIssues()
      setSupportMessage(payload?.status ? 'Issue sent to admin.' : 'Issue sent to admin.')
    } finally {
      setIsSavingSupportIssue(false)
    }
  }

  async function handleSupportIssueReply(issueId, replyForm) {
    if (currentUser?.role !== 'ADMIN') {
      return null
    }

    const response = await fetch(`/api/support-issues/${issueId}/reply`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(replyForm),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(formatAuthError(payload?.detail, 'Could not update the issue.'))
    }

    const updatedIssue = payload
    setSupportIssues((currentIssues) =>
      currentIssues.map((issue) => (String(issue.id) === String(updatedIssue.id) ? updatedIssue : issue)),
    )
    return updatedIssue
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

  async function handleRequestSubmit(event) {
    event.preventDefault()
    setMessage('')

    const hasPublishedAvailability = requestForm.musician_id && Array.isArray(customerAvailabilityCalendar.days)
      ? customerAvailabilityCalendar.days.some((day) => Array.isArray(day.slots) && day.slots.length > 0)
      : false

    if (hasPublishedAvailability && !requestForm.event_datetime) {
      setMessage('Choose one of the provider\'s published time slots from the availability calendar.')
      return
    }

    const payload = {
      ...requestForm,
      preferred_instrument:
        requestForm.preferred_instrument === 'Other'
          ? requestForm.preferred_other_instrument.trim()
          : requestForm.preferred_instrument,
      musician_id: requestForm.musician_id ? Number(requestForm.musician_id) : null,
    }

    if (requestForm.preferred_instrument === 'Other' && !payload.preferred_instrument) {
      setMessage('Please enter the preferred instrument name.')
      return
    }
    delete payload.preferred_other_instrument

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
      const isUpdatingProfile = Boolean(selectedServiceProfileId)
      const profilePayload = {
        ...serviceProfileForm,
        instrument:
          serviceProfileForm.instrument === 'Other'
            ? serviceProfileForm.other_instrument.trim()
            : serviceProfileForm.instrument,
      }
      delete profilePayload.other_instrument

      if (!profilePayload.instrument) {
        setProfileMessage('Please enter the instrument name.')
        return
      }
      const response = await fetch(isUpdatingProfile ? `/api/service-profiles/me/${selectedServiceProfileId}` : '/api/service-profiles/me', {
        method: isUpdatingProfile ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(profilePayload),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setProfileMessage(formatAuthError(payload?.detail, 'Could not save your profile.'))
        return
      }

      const nextProfiles = isUpdatingProfile
        ? serviceProfiles.map((profile) => (String(profile.id) === String(payload.id) ? payload : profile))
        : [payload, ...serviceProfiles]

      setServiceProfiles(nextProfiles)
      setActiveServiceProfile(payload)
      if (canManageAvailability) {
        await refreshServiceProfileCalendar(payload.id, nextProfiles)
      }
      setProfileMessage(isUpdatingProfile ? 'Your service provider profile was saved.' : 'Your service provider profile was created.')
      setProfileMessage(isUpdatingProfile ? 'Your profile was saved.' : 'Your profile was created.')
      serviceProfileDraftDirtyRef.current = false
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
      if (!selectedServiceProfileId) {
        setAvailabilityMessage('Select a profile before adding availability.')
        return false
      }

      const createResponse = await fetch(`/api/service-profiles/me/${selectedServiceProfileId}/availability`, {
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

      await refreshServiceProfileCalendar(selectedServiceProfileId, serviceProfiles)
      setAvailabilityMessage('Availability slot added.')
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
      if (!selectedServiceProfileId) {
        setAvailabilityMessage('Select a profile before managing availability.')
        return
      }

      const deleteResponse = await fetch(`/api/service-profiles/me/${selectedServiceProfileId}/availability/${slotId}`, {
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

      await refreshServiceProfileCalendar(selectedServiceProfileId, serviceProfiles)
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
      if (!selectedServiceProfileId) {
        setAvailabilityMessage('Select a profile before managing availability.')
        return false
      }

      const updateResponse = await fetch(`/api/service-profiles/me/${selectedServiceProfileId}/availability/${slotId}`, {
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

      await refreshServiceProfileCalendar(selectedServiceProfileId, serviceProfiles)
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
      <div className="floating-decor" aria-hidden="true">
        <span className="floating-bubble bubble-a" />
        <span className="floating-bubble bubble-b" />
        <span className="floating-bubble bubble-c" />
        <span className="floating-bubble bubble-d" />
        <span className="floating-bubble bubble-e" />
        <span className="floating-note note-a">♪</span>
        <span className="floating-note note-b">♫</span>
        <span className="floating-note note-c">♬</span>
        <span className="floating-note note-d">♪</span>
        <span className="floating-note note-e">♫</span>
      </div>
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
                {isAdmin ? (
                  <NavLink className={({ isActive }) => (isActive ? 'nav-link nav-link-accent active' : 'nav-link nav-link-accent')} to="/admin/issues">
                    Issue inbox
                  </NavLink>
                ) : (
                  <NavLink className={({ isActive }) => (isActive ? 'nav-link nav-link-accent active' : 'nav-link nav-link-accent')} to="/contact-admin">
                    Contact admin
                  </NavLink>
                )}
                {showOwnProfile ? (
                  <NavLink className={({ isActive }) => (isActive ? 'nav-link nav-link-accent active' : 'nav-link nav-link-accent')} to="/my-profile">
                    My profile
                  </NavLink>
                ) : null}
                <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/musicians">
                  Local musicians
                </NavLink>
                <NavLink className={({ isActive }) => (isActive ? 'nav-link nav-link-accent active' : 'nav-link nav-link-accent')} to="/request-performance">
                  {isServiceProvider ? 'Performance Requests' : 'Request a performance'}
                </NavLink>
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
                    onRequest={() => goTo('/request-performance')}
                    currentUser={currentUser}
                    canRequest={showConsumerRequest}
                    onContactProvider={handleContactProvider}
                    publicServiceProviders={publicServiceProviders}
                    performanceRequests={performanceRequests}
                    serviceProfiles={serviceProfiles}
                  />
                }
              />
              <Route
                path="/musicians"
                element={
                  <MusiciansPage
                    musicians={musicians}
                    currentUser={currentUser}
                    onContactProvider={handleContactProvider}
                    onSubmitRating={handleSubmitProviderRating}
                  />
                }
              />
              <Route
                path="/my-profile"
                element={
                  <RouteGuard currentUser={currentUser} allowedRoles={["CONSUMER", "SERV-PROVIDER", "ADMIN"]} redirectTo={getDefaultRoute(currentUser?.role)}>
                    <ManageServiceProfilePage
                      profileForm={serviceProfileForm}
                      setProfileForm={updateServiceProfileForm}
                      onSubmit={handleServiceProfileSubmit}
                      currentUser={currentUser}
                      isSaving={isSavingProfile}
                      isSavingAvailability={isSavingAvailability}
                      hasProfile={Boolean(serviceProfile)}
                      message={profileMessage}
                      availabilityMessage={availabilityMessage}
                      availabilityCalendar={providerAvailabilityCalendar}
                      preferredEventTypes={providerEventTypes}
                      canManageAvailability={canManageAvailability}
                      serviceProfiles={serviceProfiles}
                      selectedServiceProfileId={selectedServiceProfileId}
                      onSelectServiceProfile={handleSelectServiceProfile}
                      onCreateNewProfile={() => {
                        setActiveServiceProfile(null, { resetDraft: false })
                        setProfileMessage('Create a new profile below to add another account.')
                      }}
                      onDeleteServiceProfile={handleDeleteServiceProfile}
                      onCreateAvailabilitySlot={handleCreateAvailabilitySlot}
                      onUpdateAvailabilitySlot={handleUpdateAvailabilitySlot}
                      onDeleteAvailabilitySlot={handleDeleteAvailabilitySlot}
                      formatProviderLocation={formatProviderLocation}
                    />
                  </RouteGuard>
                }
              />
              <Route
                path="/contact-admin"
                element={
                  <RouteGuard currentUser={currentUser} allowedRoles={["CONSUMER", "SERV-PROVIDER"]} redirectTo={getDefaultRoute(currentUser?.role)}>
                    <ContactAdminPage
                      currentUser={currentUser}
                      supportIssueForm={supportIssueForm}
                      setSupportIssueForm={setSupportIssueForm}
                      supportIssues={supportIssues}
                      onSubmit={handleSupportIssueSubmit}
                      isSaving={isSavingSupportIssue}
                      message={supportMessage}
                    />
                  </RouteGuard>
                }
              />
              <Route
                path="/admin/issues"
                element={
                  <RouteGuard currentUser={currentUser} allowedRoles={["ADMIN"]} redirectTo={getDefaultRoute(currentUser?.role)}>
                    <AdminIssuesPage
                      currentUser={currentUser}
                      supportIssues={supportIssues}
                      onReplyIssue={handleSupportIssueReply}
                    />
                  </RouteGuard>
                }
              />
              <Route
                path="/request-performance"
                element={
                  <RouteGuard currentUser={currentUser} allowedRoles={["CONSUMER", "SERV-PROVIDER", "ADMIN"]} redirectTo={getDefaultRoute(currentUser?.role)}>
                    <RequestPerformancePage
                      requestForm={requestForm}
                      setRequestForm={setRequestForm}
                      eventTypes={eventTypes}
                      musicians={musicians}
                      performanceRequests={performanceRequests}
                      currentUser={currentUser}
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
