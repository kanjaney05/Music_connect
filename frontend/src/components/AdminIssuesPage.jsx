import { useMemo, useState } from 'react'

const STATUS_OPTIONS = ['Open', 'In progress', 'Resolved']

function buildMailLink(issue) {
  const subject = encodeURIComponent(`Music Connect follow-up: ${issue.subject}`)
  const body = encodeURIComponent(
    `Hello ${issue.user_email},\n\nI am following up on the issue you sent about "${issue.subject}".\n\n`,
  )
  return `mailto:${issue.user_email}?subject=${subject}&body=${body}`
}

export default function AdminIssuesPage({ currentUser, supportIssues, onReplyIssue }) {
  const [drafts, setDrafts] = useState({})

  const sortedIssues = useMemo(() => supportIssues.slice().sort((left, right) => right.id - left.id), [supportIssues])

  function getDraft(issue) {
    return drafts[issue.id] || {
      status: issue.status || 'Open',
      admin_reply: issue.admin_reply || '',
    }
  }

  function updateDraft(issueId, field, value) {
    setDrafts((current) => ({
      ...current,
      [issueId]: {
        ...((current && current[issueId]) || {}),
        [field]: value,
      },
    }))
  }

  async function handleReplySubmit(issue, event) {
    event.preventDefault()
    const draft = getDraft(issue)
    const updatedIssue = await onReplyIssue(issue.id, draft)
    if (updatedIssue) {
      setDrafts((current) => ({
        ...current,
        [updatedIssue.id]: {
          status: updatedIssue.status,
          admin_reply: updatedIssue.admin_reply || '',
        },
      }))
    }
  }

  return (
    <section className="content-grid route-page support-page-grid single-column-page">
      <article className="card form-card full-span-card support-form-card">
        <div className="section-head">
          <p className="eyebrow">Admin inbox</p>
          <h2>Review and reply to user issues</h2>
          <p className="hero-text profile-helper">
            Use the reply field to keep a running response, and use the email link when you need to contact the user
            directly from your account, <strong>{currentUser.email}</strong>.
          </p>
        </div>

        <div className="card-list support-ticket-list admin-support-ticket-list">
          {sortedIssues.length > 0 ? (
            sortedIssues.map((issue) => {
              const draft = getDraft(issue)

              return (
                <article className="event-card support-ticket-card admin-issue-card" key={issue.id}>
                  <div className="event-topline">
                    <h3>{issue.subject}</h3>
                    <span className="status-pill">{issue.status}</span>
                  </div>
                  <p className="support-ticket-meta">
                    From {issue.user_email} · {issue.user_role} · {new Date(issue.created_at).toLocaleString()}
                  </p>
                  <p>{issue.message}</p>

                  <div className="support-admin-actions">
                    <a className="button secondary slim-button" href={buildMailLink(issue)}>
                      Email user
                    </a>
                  </div>

                  <form className="stack-form reply-form" onSubmit={(event) => handleReplySubmit(issue, event)}>
                    <div className="field-grid">
                      <label>
                        Status
                        <select value={draft.status} onChange={(event) => updateDraft(issue.id, 'status', event.target.value)}>
                          {STATUS_OPTIONS.map((statusOption) => (
                            <option key={statusOption} value={statusOption}>
                              {statusOption}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label>
                      Reply to user
                      <textarea
                        value={draft.admin_reply}
                        onChange={(event) => updateDraft(issue.id, 'admin_reply', event.target.value)}
                        placeholder="Write the response the user should see on their support page."
                      />
                    </label>

                    <button className="button primary slim-button" type="submit">
                      Save reply
                    </button>
                  </form>

                  {issue.admin_reply ? (
                    <div className="support-admin-reply">
                      <span>Saved reply</span>
                      <p>{issue.admin_reply}</p>
                    </div>
                  ) : null}
                </article>
              )
            })
          ) : (
            <article className="loading-state public-empty-state support-empty-state">
              No user issues have been submitted yet.
            </article>
          )}
        </div>
      </article>
    </section>
  )
}