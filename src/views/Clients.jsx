import { useState } from 'react'
import { Avatar, Empty, PageHead, SignInPrompt } from '../components/ui'
import { go, isCoach, useStore } from '../store'
import { fmtDate, timeAgo, weekKey, weekStart } from '../lib/utils'

// Coach hub: requests, client roster, assignments and sales
export default function Clients() {
  const { db, me, workouts, actions, notify } = useStore()
  if (!me) return <div className="page narrow"><SignInPrompt /></div>
  if (!isCoach(me)) return <div className="page narrow"><Empty icon="users" title="Only coaches have clients" /></div>

  const links = db.coaching.filter((c) => c.coachId === me.id)
  const pending = links.filter((c) => c.status === 'pending')
  const active = links.filter((c) => c.status === 'active')
  const seeking = Object.values(db.users).filter((u) => u.role === 'client' && u.seeking && !db.coaching.some((c) => c.clientId === u.id))
  const sales = workouts.filter((w) => w.authorId === me.id && w.premium && (w.requests || []).length)

  return (
    <div className="page narrow">
      <PageHead title="Clients">
        <button className="btn btn-primary small" onClick={() => go('create')}>
          + Workout
        </button>
      </PageHead>

      {pending.length > 0 && (
        <section className="card">
          <span className="label accent">Requests ({pending.length})</span>
          <ul className="people">
            {pending.map((l) => {
              const u = db.users[l.clientId]
              if (!u) return null
              return (
                <li key={l.id}>
                  <Avatar user={u} />
                  <span className="grow">
                    <span className="strong">{u.name}</span>
                    <span className="muted small block">{u.goals || u.bio || `Asked ${timeAgo(l.createdAt)}`}</span>
                  </span>
                  <button className="btn btn-ghost small" onClick={() => actions.respondCoaching(l.id, false)}>
                    Decline
                  </button>
                  <button
                    className="btn btn-primary small"
                    onClick={() => {
                      actions.respondCoaching(l.id, true)
                      notify(`${u.name} is now your client`)
                    }}
                  >
                    Accept
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {sales.length > 0 && (
        <section className="card">
          <span className="label accent">Payments to confirm</span>
          {sales.map((w) => (
            <button key={w.id} className="row between full-w link-plain sale-row" onClick={() => go(`w/${w.id}`)}>
              <span>{w.name}</span>
              <span className="strong">{w.requests.length} waiting ›</span>
            </button>
          ))}
        </section>
      )}

      <h2 className="section-title display">My clients ({active.length})</h2>
      {active.length === 0 ? (
        <Empty icon="users" title="No clients yet">
          Clients can find you in Library → Coaches.
        </Empty>
      ) : (
        active.map((l) => <ClientCard key={l.id} link={l} />)
      )}

      {seeking.length > 0 && (
        <section className="card">
          <span className="label">Looking for a coach</span>
          <p className="muted small">These members said they’re open to coaching. They can request you from your profile.</p>
          <ul className="people">
            {seeking.map((u) => (
              <li key={u.id}>
                <Avatar user={u} />
                <span className="grow">
                  <span className="strong">{u.name}</span>
                  <span className="muted small block">{u.goals || u.bio || 'No goals listed'}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function ClientCard({ link }) {
  const { db, workouts, actions, notify } = useStore()
  const [open, setOpen] = useState(false)
  const [workoutId, setWorkoutId] = useState('')
  const [note, setNote] = useState('')
  const u = db.users[link.clientId]
  if (!u) return null

  const sessions = db.sessions.filter((s) => s.userId === u.id || s.partnerIds?.includes(u.id)).sort((a, b) => new Date(b.date) - new Date(a.date))
  const thisWeek = sessions.filter((s) => weekKey(s.date) === weekKey(weekStart())).length
  const assigned = db.assignments.filter((a) => a.clientId === u.id && a.coachId === link.coachId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const assign = (e) => {
    e.preventDefault()
    if (!workoutId) return
    actions.assignWorkout(u.id, workoutId, note.trim())
    notify(`Assigned to ${u.name}`)
    setWorkoutId('')
    setNote('')
  }

  return (
    <section className="card client-card">
      <button className="row gap-s full-w link-plain" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Avatar user={u} size={44} />
        <span className="grow">
          <span className="strong block">{u.name}</span>
          <span className="muted small">
            {thisWeek} this week · {sessions[0] ? `last ${timeAgo(sessions[0].date)}` : 'no sessions yet'}
          </span>
        </span>
        <span className={`chev ${open ? 'up' : ''}`}>⌄</span>
      </button>
      {open && (
        <div className="stack client-body">
          {u.goals && (
            <p className="small">
              <span className="label">Goals</span> {u.goals}
            </p>
          )}
          <div>
            <span className="label">Assigned</span>
            {assigned.length === 0 && <p className="muted small">Nothing assigned yet.</p>}
            <ul className="people">
              {assigned.map((a) => {
                const w = workouts.find((x) => x.id === a.workoutId)
                const done = sessions.some((s) => s.workoutId === a.workoutId && s.date > a.createdAt)
                return (
                  <li key={a.id}>
                    <span className="grow">
                      <span className="strong">{w?.name || 'Deleted workout'}</span>
                      <span className="muted small block">
                        {fmtDate(a.createdAt)}
                        {a.note ? ` · ${a.note}` : ''}
                      </span>
                    </span>
                    {done ? <span className="tick">✓</span> : <span className="label">To do</span>}
                    <button className="icon-btn small" onClick={() => actions.removeAssignment(a.id)} aria-label="Remove assignment">
                      ✕
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
          <form className="stack" onSubmit={assign}>
            <select value={workoutId} onChange={(e) => setWorkoutId(e.target.value)} aria-label="Workout to assign">
              <option value="">Assign a workout…</option>
              {workouts.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {w.premium ? ` (${w.price})` : ''}
                </option>
              ))}
            </select>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for your client (optional)" maxLength={120} />
            <button className="btn btn-primary" disabled={!workoutId}>
              Assign
            </button>
          </form>
          <div>
            <span className="label">Recent sessions</span>
            {sessions.length === 0 ? (
              <p className="muted small">None yet.</p>
            ) : (
              <ul className="people">
                {sessions.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <span className="grow">
                      <span className="strong">{s.workoutName}</span>
                      <span className="muted small block">
                        {fmtDate(s.date)} · {Math.round(s.duration / 60)} min · effort {s.rpe}/10
                      </span>
                      {s.note && <span className="quote small block">{s.note}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
