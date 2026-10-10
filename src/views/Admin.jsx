import { useMemo, useState } from 'react'
import { Avatar, Chips, RoleBadge } from '../components/ui'
import Icon from '../components/Icon'
import { go } from '../store'
import { FeeBar } from '../components/Fees'
import { FEES, coachPct, money, runningPct, salesTotals } from '../lib/fees'
import { useStore } from '../store'
import { fmtDate, timeAgo, weekKey, weekStart } from '../lib/utils'

export default function Admin() {
  const { db, me, workouts, actions, notify } = useStore()
  const [role, setRole] = useState(null)
  const [q, setQ] = useState('')

  const users = Object.values(db.users)
  const revenue = salesTotals(workouts)
  const stats = useMemo(() => {
    const thisWeek = weekKey(weekStart())
    const clients = users.filter((u) => u.role === 'client')
    const coached = new Set(db.coaching.filter((c) => c.status === 'active').map((c) => c.clientId))
    return {
      total: users.length,
      coaches: users.filter((u) => u.role === 'coach').length,
      clients: clients.length,
      seeking: clients.filter((u) => u.seeking && !coached.has(u.id)).length,
      coached: coached.size,
      pending: db.coaching.filter((c) => c.status === 'pending').length,
      free: workouts.filter((w) => !w.premium).length,
      paid: workouts.filter((w) => w.premium).length,
      sessionsWeek: db.sessions.filter((s) => weekKey(s.date) === thisWeek).length,
      newWeek: users.filter((u) => weekKey(u.createdAt) === thisWeek).length,
    }
  }, [db, users, workouts])

  const needle = q.trim().toLowerCase()
  const list = users
    .filter((u) => !role || (role === 'seeking' ? u.role === 'client' && u.seeking : u.role === role))
    .filter((u) => !needle || u.name.toLowerCase().includes(needle))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const coachOf = (u) => {
    const l = db.coaching.find((c) => c.clientId === u.id)
    if (!l) return null
    return `${db.users[l.coachId]?.name || '?'}${l.status === 'pending' ? ' (pending)' : ''}`
  }

  return (
    <div className="page">
      <header className="app-head">
        <h1>Admin</h1>
        <button className="btn btn-ghost small" onClick={() => go('welcome')}>
          Website
        </button>
      </header>
      <div className="notice">
        <strong>Open access for now.</strong> Anyone with this link can manage members. Add a login before you go live.
      </div>
      <div className="tiles">
        <Tile label="Users" value={stats.total} sub={`+${stats.newWeek} this week`} />
        <Tile label="Coaches" value={stats.coaches} />
        <Tile label="Clients" value={stats.clients} sub={`${stats.coached} with a coach`} />
        <Tile label="Seeking a coach" value={stats.seeking} accent={stats.seeking > 0} />
        <Tile label="Coach requests" value={stats.pending} />
        <Tile label="Free workouts" value={stats.free} />
        <Tile label="Paid workouts" value={stats.paid} />
        <Tile label="Sessions this week" value={stats.sessionsWeek} />
      </div>

      <h2 className="section-title">Revenue</h2>
      <div className="tiles">
        <Tile label="Paid sales" value={revenue.sales} sub={`${money(revenue.gross)} gross`} />
        <Tile label={`Platform fee (${FEES.platformPct}%)`} value={money(revenue.fee)} />
        <Tile label={`Running & payments (${runningPct}%)`} value={money(revenue.running)} />
        <Tile label={`Community health fund (${FEES.communityPct}%)`} value={money(revenue.community)} accent />
      </div>
      <section className="card">
        <h3 className="card-h">How each sale is split</h3>
        <p className="muted small">
          Coaches keep {coachPct}% ({money(revenue.coach)} so far). Change the rates in <code>src/lib/fees.js</code> and the backend’s{' '}
          <code>.env</code>.
        </p>
        <FeeBar />
      </section>

      <h2 className="section-title">Members</h2>
      <input className="search" type="search" placeholder="Search members" value={q} onChange={(e) => setQ(e.target.value)} />
      <Chips
        options={[
          ['coach', 'Coaches'],
          ['client', 'Clients'],
          ['seeking', 'Seeking a coach'],
          ['admin', 'Admins'],
        ]}
        value={role}
        onChange={setRole}
      />
      <div className="card list-card">
        {list.map((u) => {
          const sessions = db.sessions.filter((s) => s.userId === u.id).length
          return (
            <div key={u.id} className="admin-row">
              <Avatar user={u} size={40} />
              <div className="grow">
                <span className="strong">{u.name}</span> <RoleBadge role={u.role} />
                {u.role === 'client' && u.seeking && <span className="role-badge role-seeking">seeking</span>}
                <span className="muted small block">
                  Joined {fmtDate(u.createdAt)} · {sessions} session{sessions === 1 ? '' : 's'}
                  {u.role === 'client' && coachOf(u) ? ` · coach: ${coachOf(u)}` : ''}
                  {u.role === 'coach' ? ` · ${workouts.filter((w) => w.authorId === u.id).length} workouts` : ''}
                </span>
              </div>
              <select
                value={u.role}
                aria-label={`Role for ${u.name}`}
                disabled={u.id === me?.id}
                onChange={(e) => {
                  actions.setRole(u.id, e.target.value)
                  notify(`${u.name} is now ${e.target.value === 'admin' ? 'an' : 'a'} ${e.target.value}`)
                }}
              >
                <option value="client">Client</option>
                <option value="coach">Coach</option>
                <option value="admin">Admin</option>
              </select>
              <button
                className="icon-btn small"
                disabled={u.id === me?.id}
                aria-label={`Remove ${u.name}`}
                onClick={() => {
                  if (!confirm(`Remove ${u.name}? Their coaching links go too.`)) return
                  actions.deleteUser(u.id)
                  notify(`${u.name} removed`)
                }}
              >
                <Icon name="trash" size={16} />
              </button>
            </div>
          )
        })}
        {list.length === 0 && <p className="muted small">No members match.</p>}
      </div>

      <h2 className="section-title">Community workouts</h2>
      <div className="card list-card">
        {db.workouts.length === 0 && <p className="muted small">None yet.</p>}
        {db.workouts.map((w) => {
          const author = db.users[w.authorId]
          return (
            <div key={w.id} className="admin-row">
              <button className="link-plain grow" onClick={() => go(`w/${w.id}`)}>
                <span className="strong block">{w.name}</span>
                <span className="muted small">
                  {author?.name || 'Unknown'} · {w.premium ? `Paid ${w.price}` : 'Free'} · {timeAgo(w.createdAt)}
                </span>
              </button>
              <button
                className="btn btn-danger small"
                onClick={() => {
                  if (!confirm(`Remove “${w.name}”?`)) return
                  actions.deleteWorkout(w.id)
                  notify('Workout removed')
                }}
              >
                Remove
              </button>
            </div>
          )
        })}
      </div>

      <h2 className="section-title">Recent activity</h2>
      <div className="card list-card">
        {[...db.sessions]
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 8)
          .map((s) => (
            <button key={s.id} className="admin-row link-plain full-w" onClick={() => go(`a/${s.id}`)}>
              <Avatar user={db.users[s.userId]} size={32} />
              <span className="grow">
                <span className="strong">{db.users[s.userId]?.name || 'Removed'}</span> finished {s.workoutName}
                <span className="tiny block">{timeAgo(s.date)}</span>
              </span>
            </button>
          ))}
      </div>
    </div>
  )
}

function Tile({ label, value, sub, accent }) {
  return (
    <div className={`tile ${accent ? 'tile-accent' : ''}`}>
      <span className="tile-label">{label}</span>
      <span className="tile-value">{value}</span>
      {sub && <span className="tiny">{sub}</span>}
    </div>
  )
}
