const authRoles = [
  { value: 'CONSUMER', label: 'CONSUMER', description: 'Browse musicians and request performances.' },
  { value: 'SERV-PROVIDER', label: 'SERV-PROVIDER', description: 'Enroll and manage musician profiles.' },
  { value: 'ADMIN', label: 'ADMIN', description: 'Reserved for the admin email.' },
]

export default function AuthPage({ authForm, setAuthForm, onSubmit, isLoading, adminEmail, authMode, setAuthMode, message }) {
  return (
    <section className="auth-shell card">
      <div className="auth-copy">
        <p className="eyebrow">Access control</p>
        <h1>{authMode === 'login' ? 'Sign in to Music Connect.' : 'Create your Music Connect account.'}</h1>
        <p className="hero-text">
          Email is the username. Password is required. During registration, choose a role, and the admin email {adminEmail} is always treated as ADMIN.
        </p>
      </div>

      <div className="auth-panel card">
        <form className="stack-form" onSubmit={onSubmit}>
          <div className="auth-mode-switcher" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              className={authMode === 'login' ? 'chip active' : 'chip'}
              onClick={() => setAuthMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={authMode === 'register' ? 'chip active' : 'chip'}
              onClick={() => setAuthMode('register')}
            >
              Register
            </button>
          </div>

          <label>
            Email address
            <input
              type="email"
              value={authForm.email}
              onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
              placeholder="name@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={authForm.password}
              onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
              placeholder="At least 8 characters"
              required
            />
          </label>

          {authMode === 'register' ? (
            <>
              <label>
                Role
                <select value={authForm.role} onChange={(event) => setAuthForm({ ...authForm, role: event.target.value })}>
                  {authRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="auth-role-hint">
                {authRoles.map((role) => (
                  <p key={role.value}>
                    <strong>{role.label}</strong>
                    <span>{role.description}</span>
                  </p>
                ))}
              </div>
            </>
          ) : null}

          <button className="button primary auth-button" type="submit" disabled={isLoading}>
            {isLoading ? 'Opening account…' : authMode === 'login' ? 'Sign in' : 'Register'}
          </button>
        </form>

        <button className="chip auth-inline-switch" type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
          {authMode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
        </button>

        {message ? <p className="message-banner auth-message">{message}</p> : null}
      </div>
    </section>
  )
}