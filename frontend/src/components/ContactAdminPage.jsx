import { useMemo } from 'react'

export default function ContactAdminPage({
  currentUser,
  supportIssueForm,
  setSupportIssueForm,
  supportIssues,
  onSubmit,
  isSaving,
  message,
}) {
  const sortedIssues = useMemo(() => supportIssues.slice().sort((left, right) => right.id - left.id), [supportIssues])

  return (
    <section className="content-grid route-page support-page-grid single-column-page">
      <article className="card form-card full-span-card support-form-card">
        <div className="section-head">
          <p className="eyebrow">Contact admin</p>
          <h2>Tell admin what is happening</h2>
          <p className="hero-text profile-helper">
            Send a clear subject and short description of the problem. Admin will see it in their inbox and can reply
            directly to your account email, <strong>{currentUser.email}</strong>.
          </p>
        </div>

        {message ? <p className="message-banner">{message}</p> : null}

        <form className="stack-form" onSubmit={onSubmit}>
          <label>
            Subject
            <input
              value={supportIssueForm.subject}
              onChange={(event) => setSupportIssueForm({ ...supportIssueForm, subject: event.target.value })}
              placeholder="Billing question, login issue, profile update..."
              required
            />
          </label>

          <label>
            Issue details
            <textarea
              value={supportIssueForm.message}
              onChange={(event) => setSupportIssueForm({ ...supportIssueForm, message: event.target.value })}
              placeholder="Explain the issue, what you expected, and any steps that led to it."
              required
            />
          </label>

          <button className="button primary" type="submit" disabled={isSaving}>
            {isSaving ? 'Sending…' : 'Send issue to admin'}
          </button>
        </form>
      </article>

      <article className="card list-card full-span-card support-list-card">
        <div className="section-head compact">
          <p className="eyebrow">Your history</p>
          <h2>Previously sent issues</h2>
        </div>

        <div className="card-list support-ticket-list">
          {sortedIssues.length > 0 ? (
            sortedIssues.map((issue) => (
              <article className="event-card support-ticket-card" key={issue.id}>
                <div className="event-topline">
                  <h3>{issue.subject}</h3>
                  <span className="status-pill">{issue.status}</span>
                </div>
                <p className="support-ticket-meta">Sent on {new Date(issue.created_at).toLocaleString()}</p>
                <p>{issue.message}</p>
                {issue.admin_reply ? (
                  <div className="support-admin-reply">
                    <span>Admin reply</span>
                    <p>{issue.admin_reply}</p>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <article className="loading-state public-empty-state support-empty-state">
              No issues yet. Send one above when you need help.
            </article>
          )}
        </div>
      </article>
    </section>
  )
}