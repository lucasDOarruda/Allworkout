import { useMemo, useState } from 'react'
import { Avatar, Chips, RoleBadge } from '../components/ui'
import Icon from '../components/Icon'
import { BarList, ColumnChart } from '../components/Charts'
import { FeeBar } from '../components/Fees'
import { go, useStore } from '../store'
import { FEES, coachPct, money, runningPct, salesTotals, splitSale } from '../lib/fees'
import { computeStats, fmtDate, fmtDuration, fmtKg, timeAgo, weekKey, weekStart } from '../lib/utils'
import { Crm, Traffic, memberStatus, useCloudAdmin } from './AdminCloud'

// Members (CRM) and Traffic come from the cloud. "Device members" only lists accounts stored
// in this browser, so it's shown in local development only.
const SECTIONS = [
  ['overview', 'Overview', 'target'],
  ['crm', 'Members', 'users'],
  ['traffic', 'Traffic', 'chart'],
  ...(import.meta.env.DEV ? [['members', 'Device members', 'note']] : []),
  ['coaching', 'Coaching', 'clipboard'],
  ['content', 'Content', 'layers'],
  ['revenue', 'Revenue', 'spark'],
  ['activity', 'Activity', 'flame'],
]

// 12 weekly buckets, oldest first
function weeks12() {
  const out = []
  for (let i = 11; i >= 0; i--) {
    const d = weekStart()
    d.setDate(d.getDate() - i * 7)
    out.push({
      key: weekKey(d),
      label: `Week of ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`,
      short: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      value: 0,
    })
  }
  return out
}

export default function Admin({ section }) {
  const { db, me, theme, setTheme, actions } = useStore()
  const tab = SECTIONS.some(([k]) => k === section) ? section : 'overview'
  const cloud = useCloudAdmin()
  const pendingCount = db.coaching.filter((c) => c.status === 'pending').length

  return (
    <div className="adm">
      <aside className="adm-side">
        <a className="adm-brand" href="#/admin">
          <span className="l-mark">AW</span>
          <span>
            All Workout
            <span className="tiny block">Admin</span>
          </span>
        </a>
        <nav className="adm-nav" aria-label="Admin sections">
          {SECTIONS.map(([k, label, icon]) => (
            <a key={k} href={`#/admin/${k}`} className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined}>
              <Icon name={icon} size={18} />
              {label}
              {k === 'coaching' && pendingCount > 0 && <span className="adm-count">{pendingCount}</span>}
            </a>
          ))}
        </nav>
        <div className="adm-side-foot">
          <button className="adm-link" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button className="adm-link" onClick={() => go('home')}>
            ← Back to the app
          </button>
          <button
            className="adm-link"
            onClick={() => {
              actions.signOut()
              go('welcome')
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="adm-main">
        <header className="adm-head">
          <div>
            <p className="tiny">Admin dashboard</p>
            <h1>{SECTIONS.find(([k]) => k === tab)[1]}</h1>
          </div>
          <span className="adm-me">
            <Avatar user={me} size={30} />
            <span className="small">
              <span className="strong block">{me.name}</span>
              <span className="tiny">{me.email || 'Admin'}</span>
            </span>
          </span>
        </header>

        {tab === 'overview' && <Overview cloud={cloud} />}
        {tab === 'crm' && <Crm cloud={cloud} />}
        {tab === 'traffic' && <Traffic cloud={cloud} />}
        {tab === 'members' && <Members />}
        {['coaching', 'content', 'revenue', 'activity'].includes(tab) && (
          <p className="notice">Workouts, sessions and coaching are still stored per browser, so this shows the data in this browser.</p>
        )}
        {tab === 'coaching' && <Coaching />}
        {tab === 'content' && <Content />}
        {tab === 'revenue' && <Revenue />}
        {tab === 'activity' && <Activity />}
      </main>
    </div>
  )
}

function Kpi({ label, value, sub, tone }) {
  return (
    <div className={`adm-kpi ${tone || ''}`}>
      <span className="adm-kpi-l">{label}</span>
      <span className="adm-kpi-v">{value}</span>
      {sub && <span className="adm-kpi-s">{sub}</span>}
    </div>
  )
}

function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`adm-panel ${className}`}>
      <div className="adm-panel-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

// ---------- Overview ----------

function CloudSummary({ cloud }) {
  if (cloud.loading) return <p className="muted small">Loading members and traffic…</p>
  if (cloud.error)
    return (
      <p className="notice">
        Members and traffic need the cloud database: {cloud.error} See the Members tab for setup steps.
      </p>
    )
  const now = Date.now()
  const members = cloud.members || []
  const today = (cloud.traffic || []).find((t) => t.day === new Date().toLocaleDateString('en-CA')) || {}
  const newest = [...members].sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)).slice(0, 5)
  return (
    <>
      <div className="adm-kpis">
        <Kpi label="Members" value={members.length} sub={`+${members.filter((m) => (m.createdAt?.getTime() || 0) > now - 7 * 86400000).length} in 7 days`} />
        <Kpi label="Online now" value={members.filter((m) => memberStatus(m)[0] === 'online').length} tone="lime" />
        <Kpi label="Active (7 days)" value={members.filter((m) => (m.lastSeenAt?.getTime() || 0) > now - 7 * 86400000).length} />
        <Kpi label="Views today" value={today.views || 0} sub={`${today.visitors || 0} visitors`} />
        <Kpi label="Sign-ins today" value={today.signins || 0} />
      </div>
      <Panel title="Newest members" action={<a href="#/admin/crm">All members</a>}>
        {newest.length === 0 ? (
          <p className="muted small">Nobody has signed in yet.</p>
        ) : (
          <ul className="adm-list">
            {newest.map((m) => (
              <li key={m.uid}>
                <Avatar user={{ name: m.name, photo: m.photo, color: '#3a4d00' }} size={30} />
                <span className="grow">
                  <span className="strong">{m.name}</span> <RoleBadge role={m.role} />
                  <span className="tiny block">
                    {m.email} · joined {m.createdAt ? timeAgo(m.createdAt.toISOString()) : '–'}
                  </span>
                </span>
                <span className={`crm-status ${memberStatus(m)[0]}`}>{memberStatus(m)[1]}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <h2 className="section-title">Training activity (stored in this browser)</h2>
    </>
  )
}

function Overview({ cloud }) {
  const { db, workouts } = useStore()
  const data = useMemo(() => {
    const users = Object.values(db.users)
    const thisWeek = weekKey(weekStart())
    const lastWeekStart = weekStart()
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    const lastWeek = weekKey(lastWeekStart)
    const sessionsWeek = db.sessions.filter((s) => weekKey(s.date) === thisWeek)
    const sessionsLast = db.sessions.filter((s) => weekKey(s.date) === lastWeek).length
    const active = new Set(sessionsWeek.flatMap((s) => [s.userId, ...(s.partnerIds || [])]))
    const sevenDays = Date.now() - 7 * 86400000

    const sessionWeeks = weeks12()
    const signupWeeks = weeks12()
    const idx = Object.fromEntries(sessionWeeks.map((w, i) => [w.key, i]))
    for (const s of db.sessions) if (idx[weekKey(s.date)] !== undefined) sessionWeeks[idx[weekKey(s.date)]].value++
    for (const u of users) if (idx[weekKey(u.createdAt)] !== undefined) signupWeeks[idx[weekKey(u.createdAt)]].value++

    const byWorkout = {}
    for (const s of db.sessions) byWorkout[s.workoutId] = (byWorkout[s.workoutId] || 0) + 1
    const byId = Object.fromEntries(workouts.map((w) => [w.id, w]))
    const topWorkouts = Object.entries(byWorkout)
      .map(([id, n]) => ({ key: id, label: byId[id]?.name || 'Deleted workout', sub: byId[id]?.premium ? `Paid · ${byId[id].price}` : 'Free', value: n }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    const ROLE_LABEL = { client: 'Clients', coach: 'Coaches', admin: 'Admins' }
    const roles = ['client', 'coach', 'admin'].map((r) => ({ key: r, label: ROLE_LABEL[r], value: users.filter((u) => u.role === r).length }))
    const coached = new Set(db.coaching.filter((c) => c.status === 'active').map((c) => c.clientId))
    const seeking = users.filter((u) => u.role === 'client' && u.seeking && !coached.has(u.id))
    const pending = db.coaching.filter((c) => c.status === 'pending')
    const unlockRequests = workouts.filter((w) => w.premium && (w.requests || []).length)

    return {
      users: users.length,
      newUsers: users.filter((u) => new Date(u.createdAt) > sevenDays).length,
      active: active.size,
      sessionsWeek: sessionsWeek.length,
      sessionsLast,
      coaches: roles[1].value,
      coached: coached.size,
      community: db.workouts.length,
      sessionWeeks,
      signupWeeks,
      topWorkouts,
      roles,
      seeking,
      pending,
      unlockRequests,
    }
  }, [db, workouts])

  const delta = data.sessionsWeek - data.sessionsLast
  return (
    <>
      <CloudSummary cloud={cloud} />
      <div className="adm-kpis">
        <Kpi label="Members" value={data.users} sub={`+${data.newUsers} in the last 7 days`} />
        <Kpi label="Active this week" value={data.active} sub={`${data.users ? Math.round((data.active / data.users) * 100) : 0}% of members`} />
        <Kpi label="Sessions this week" value={data.sessionsWeek} sub={`${delta >= 0 ? '+' : '−'}${Math.abs(delta)} vs last week`} tone={delta >= 0 ? 'up' : 'down'} />
        <Kpi label="Coaches" value={data.coaches} sub={`${data.coached} clients coached`} />
        <Kpi label="Seeking a coach" value={data.seeking.length} tone={data.seeking.length ? 'lime' : ''} sub="Clients without one" />
        <Kpi label="Community workouts" value={data.community} sub="Published by coaches" />
      </div>

      <div className="adm-grid2">
        <Panel title="Sessions per week">
          <ColumnChart data={data.sessionWeeks} label="Sessions logged per week, last 12 weeks" format={(v) => `${v} session${v === 1 ? '' : 's'}`} />
        </Panel>
        <Panel title="New members per week">
          <ColumnChart data={data.signupWeeks} label="New members per week, last 12 weeks" format={(v) => `${v} member${v === 1 ? '' : 's'}`} />
        </Panel>
      </div>

      <div className="adm-grid3">
        <Panel title="Needs attention">
          <ul className="adm-todo">
            <li>
              <span className="adm-todo-n">{data.pending.length}</span>
              <span className="grow">Coach requests waiting for a reply</span>
              <a href="#/admin/coaching">View</a>
            </li>
            <li>
              <span className="adm-todo-n">{data.unlockRequests.reduce((a, w) => a + w.requests.length, 0)}</span>
              <span className="grow">Buyers waiting for a workout unlock</span>
              <a href="#/admin/revenue">View</a>
            </li>
            <li>
              <span className="adm-todo-n">{data.seeking.length}</span>
              <span className="grow">Clients looking for a coach</span>
              <a href="#/admin/coaching">View</a>
            </li>
          </ul>
        </Panel>
        <Panel title="Most-done workouts">
          <BarList rows={data.topWorkouts} format={(v) => `${v}×`} empty="No sessions logged yet." />
        </Panel>
        <Panel title="Members by role">
          <BarList rows={data.roles} />
        </Panel>
      </div>
    </>
  )
}

// ---------- Members ----------

function Members() {
  const { db, me, actions, notify } = useStore()
  const [q, setQ] = useState('')
  const [role, setRole] = useState(null)
  const [sort, setSort] = useState('joined')
  const [open, setOpen] = useState(null)

  const rows = useMemo(() => {
    const last = {}
    const count = {}
    for (const s of db.sessions)
      for (const id of [s.userId, ...(s.partnerIds || [])]) {
        count[id] = (count[id] || 0) + 1
        if (!last[id] || s.date > last[id]) last[id] = s.date
      }
    const coachOf = Object.fromEntries(db.coaching.map((c) => [c.clientId, c]))
    const needle = q.trim().toLowerCase()
    return Object.values(db.users)
      .filter((u) => !role || (role === 'seeking' ? u.role === 'client' && u.seeking : u.role === role))
      .filter((u) => !needle || `${u.name} ${u.email || ''}`.toLowerCase().includes(needle))
      .map((u) => ({ u, sessions: count[u.id] || 0, last: last[u.id] || null, coach: coachOf[u.id] }))
      .sort((a, b) =>
        sort === 'name'
          ? a.u.name.localeCompare(b.u.name)
          : sort === 'sessions'
            ? b.sessions - a.sessions
            : sort === 'active'
              ? (b.last || '').localeCompare(a.last || '')
              : new Date(b.u.createdAt) - new Date(a.u.createdAt),
      )
  }, [db, q, role, sort])

  const exportCsv = () => {
    const head = ['name', 'email', 'role', 'joined', 'sessions', 'last_active', 'coach']
    const lines = rows.map(({ u, sessions, last, coach }) =>
      [u.name, u.email || '', u.role, u.createdAt.slice(0, 10), sessions, last ? last.slice(0, 10) : '', coach ? db.users[coach.coachId]?.name || '' : '']
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    )
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `all-workout-members-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <div className="adm-toolbar">
        <input className="search" type="search" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-ghost small" onClick={exportCsv}>
          Export CSV
        </button>
      </div>
      <Chips
        options={[
          ['client', 'Clients'],
          ['coach', 'Coaches'],
          ['admin', 'Admins'],
          ['seeking', 'Seeking a coach'],
        ]}
        value={role}
        onChange={setRole}
      />
      <section className="adm-panel adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              {[
                ['name', 'Member'],
                ['role', 'Role'],
                ['joined', 'Joined'],
                ['sessions', 'Sessions'],
                ['active', 'Last active'],
              ].map(([k, l]) => (
                <th key={k} className={k === 'sessions' ? 'num' : ''}>
                  {k === 'role' ? (
                    l
                  ) : (
                    <button className={`adm-sort ${sort === k ? 'on' : ''}`} onClick={() => setSort(k)}>
                      {l}
                      {sort === k && ' ↓'}
                    </button>
                  )}
                </th>
              ))}
              <th className="adm-hide-sm">Coach</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ u, sessions, last, coach }) => (
              <tr key={u.id} onClick={() => setOpen(u.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(u.id)}>
                <td>
                  <span className="row gap-s">
                    <Avatar user={u} size={32} />
                    <span>
                      <span className="strong block">{u.name}</span>
                      <span className="tiny">{u.email || 'Account on this device'}</span>
                    </span>
                  </span>
                </td>
                <td>
                  <RoleBadge role={u.role} />
                  {u.role === 'client' && u.seeking && !coach && <span className="role-badge role-seeking">seeking</span>}
                </td>
                <td className="small">{fmtDate(u.createdAt)}</td>
                <td className="num">{sessions}</td>
                <td className="small">{last ? timeAgo(last) : '–'}</td>
                <td className="small adm-hide-sm">{coach ? `${db.users[coach.coachId]?.name || '?'}${coach.status === 'pending' ? ' (pending)' : ''}` : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="muted small">No members match.</p>}
      </section>
      {open && db.users[open] && (
        <MemberDrawer
          user={db.users[open]}
          isMe={me?.id === open}
          onClose={() => setOpen(null)}
          onRole={(r) => {
            actions.setRole(open, r)
            notify(`${db.users[open].name} is now ${r === 'admin' ? 'an' : 'a'} ${r}`)
          }}
          onDelete={() => {
            if (!confirm(`Remove ${db.users[open].name}? Their coaching links go too.`)) return
            const name = db.users[open].name
            actions.deleteUser(open)
            setOpen(null)
            notify(`${name} removed`)
          }}
        />
      )}
    </>
  )
}

function MemberDrawer({ user, isMe, onClose, onRole, onDelete }) {
  const { db, workouts } = useStore()
  const stats = computeStats(db, user.id)
  const link = db.coaching.find((c) => c.clientId === user.id)
  const clients = db.coaching.filter((c) => c.coachId === user.id && c.status === 'active').length
  const published = workouts.filter((w) => w.authorId === user.id)
  return (
    <div className="adm-drawer-back" onClick={onClose}>
      <aside className="adm-drawer" role="dialog" aria-modal="true" aria-label={user.name} onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <span className="tiny">Member profile</span>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="plus" className="rot45" />
          </button>
        </div>
        <div className="adm-drawer-id">
          <Avatar user={user} size={64} />
          <div>
            <h2>{user.name}</h2>
            <p className="small muted">{user.email || 'No email (local account)'}</p>
            <p className="tiny">
              Joined {fmtDate(user.createdAt)}
              {user.googleUid ? ' · Google sign-in' : ''}
            </p>
          </div>
        </div>
        {user.bio && <p className="muted">{user.bio}</p>}
        <label className="field">
          <span>Role</span>
          <select value={user.role} disabled={isMe} onChange={(e) => onRole(e.target.value)}>
            <option value="client">Client</option>
            <option value="coach">Coach</option>
            <option value="admin">Admin</option>
          </select>
          {isMe && <span className="tiny">You can’t change your own role.</span>}
        </label>
        <div className="adm-kpis small-kpis">
          <Kpi label="Sessions" value={stats.all.length} />
          <Kpi label="Time" value={fmtDuration(stats.minutes * 60)} />
          <Kpi label="Lifted" value={fmtKg(stats.totalKg)} />
          <Kpi label="Streak" value={`${stats.streak} wk`} />
        </div>
        {user.role === 'client' ? (
          <p className="small">
            <span className="strong">Coach:</span> {link ? `${db.users[link.coachId]?.name || '?'} (${link.status})` : user.seeking ? 'Looking for a coach' : 'None'}
            {user.goals && (
              <>
                <br />
                <span className="strong">Goals:</span> {user.goals}
              </>
            )}
          </p>
        ) : (
          <p className="small">
            <span className="strong">{clients}</span> client{clients === 1 ? '' : 's'} · <span className="strong">{published.length}</span> workout
            {published.length === 1 ? '' : 's'} published
          </p>
        )}
        <h3 className="adm-sub">Recent sessions</h3>
        {stats.all.length === 0 ? (
          <p className="muted small">None yet.</p>
        ) : (
          <ul className="adm-list">
            {stats.all.slice(0, 6).map((s) => (
              <li key={s.id}>
                <span className="grow">
                  <span className="strong">{s.workoutName}</span>
                  <span className="tiny block">
                    {fmtDate(s.date)} · {fmtDuration(s.duration)} · effort {s.rpe}/10
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <button className="btn btn-danger full" disabled={isMe} onClick={onDelete}>
          <Icon name="trash" size={16} /> Remove member
        </button>
      </aside>
    </div>
  )
}

// ---------- Coaching ----------

function Coaching() {
  const { db, actions, notify } = useStore()
  const pending = db.coaching.filter((c) => c.status === 'pending')
  const active = db.coaching.filter((c) => c.status === 'active')
  const coaches = Object.values(db.users).filter((u) => u.role === 'coach')
  const coached = new Set(active.map((c) => c.clientId))
  const seeking = Object.values(db.users).filter((u) => u.role === 'client' && u.seeking && !db.coaching.some((c) => c.clientId === u.id))
  const name = (id) => db.users[id]?.name || 'Removed'

  return (
    <>
      <div className="adm-kpis">
        <Kpi label="Active links" value={active.length} />
        <Kpi label="Pending requests" value={pending.length} tone={pending.length ? 'lime' : ''} />
        <Kpi label="Clients coached" value={coached.size} />
        <Kpi label="Assignments" value={db.assignments.length} />
      </div>
      <div className="adm-grid2">
        <Panel title="Pending requests">
          {pending.length === 0 ? (
            <p className="muted small">No requests waiting.</p>
          ) : (
            <ul className="adm-list">
              {pending.map((c) => (
                <li key={c.id}>
                  <Avatar user={db.users[c.clientId]} size={30} />
                  <span className="grow">
                    <span className="strong">{name(c.clientId)}</span> → {name(c.coachId)}
                    <span className="tiny block">{timeAgo(c.createdAt)}</span>
                  </span>
                  <button className="btn btn-ghost small" onClick={() => actions.respondCoaching(c.id, false)}>
                    Decline
                  </button>
                  <button
                    className="btn btn-primary small"
                    onClick={() => {
                      actions.respondCoaching(c.id, true)
                      notify('Coaching link approved')
                    }}
                  >
                    Approve
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Clients looking for a coach">
          {seeking.length === 0 ? (
            <p className="muted small">Nobody right now.</p>
          ) : (
            <ul className="adm-list">
              {seeking.map((u) => (
                <li key={u.id}>
                  <Avatar user={u} size={30} />
                  <span className="grow">
                    <span className="strong">{u.name}</span>
                    <span className="tiny block">{u.goals || 'No goals listed'}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <Panel title="Coaches">
        <BarList
          rows={coaches.map((c) => ({
            key: c.id,
            label: c.name,
            sub: `${db.assignments.filter((a) => a.coachId === c.id).length} assignments · ${c.specialties || 'No specialties'}`,
            value: active.filter((l) => l.coachId === c.id).length,
          }))}
          format={(v) => `${v} client${v === 1 ? '' : 's'}`}
          empty="No coaches yet."
        />
      </Panel>
    </>
  )
}

// ---------- Content ----------

function Content() {
  const { db, workouts, actions, notify } = useStore()
  const [view, setView] = useState('workouts')
  const done = {}
  for (const s of db.sessions) done[s.workoutId] = (done[s.workoutId] || 0) + 1
  const comments = [...db.comments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 40)
  const byId = Object.fromEntries(workouts.map((w) => [w.id, w]))

  return (
    <>
      <div className="adm-kpis">
        <Kpi label="Official workouts" value={workouts.filter((w) => w.official).length} />
        <Kpi label="Community workouts" value={db.workouts.length} />
        <Kpi label="Paid workouts" value={workouts.filter((w) => w.premium).length} />
        <Kpi label="Comments" value={db.comments.length} />
      </div>
      <Chips
        options={[
          ['workouts', 'Community workouts'],
          ['comments', 'Latest comments'],
        ]}
        value={view}
        onChange={(v) => setView(v || 'workouts')}
        all={null}
      />
      {view === 'workouts' ? (
        <section className="adm-panel adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Workout</th>
                <th>Type</th>
                <th className="num">Likes</th>
                <th className="num">Done</th>
                <th className="adm-hide-sm">Published</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {db.workouts.map((w) => (
                <tr key={w.id}>
                  <td>
                    <button className="link-plain" onClick={() => go(`w/${w.id}`)}>
                      <span className="strong block">{w.name}</span>
                      <span className="tiny">{db.users[w.authorId]?.name || 'Unknown author'}</span>
                    </button>
                  </td>
                  <td className="small">{w.premium ? `Paid ${w.price}` : 'Free'}</td>
                  <td className="num">{(db.likes[w.id] || []).length}</td>
                  <td className="num">{done[w.id] || 0}</td>
                  <td className="small adm-hide-sm">{fmtDate(w.createdAt)}</td>
                  <td className="num">
                    <button
                      className="icon-btn small"
                      aria-label={`Remove ${w.name}`}
                      onClick={() => {
                        if (!confirm(`Remove “${w.name}”?`)) return
                        actions.deleteWorkout(w.id)
                        notify('Workout removed')
                      }}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {db.workouts.length === 0 && <p className="muted small">No community workouts yet.</p>}
        </section>
      ) : (
        <section className="adm-panel">
          {comments.length === 0 ? (
            <p className="muted small">No comments yet.</p>
          ) : (
            <ul className="adm-list">
              {comments.map((c) => {
                const u = db.users[c.userId]
                const target = c.workoutId ? byId[c.workoutId]?.name : db.sessions.find((s) => s.id === c.sessionId)?.workoutName
                return (
                  <li key={c.id}>
                    <Avatar user={u} size={30} />
                    <span className="grow">
                      <span className="strong">{u?.name || 'Removed'}</span>{' '}
                      <span className="tiny">
                        on {target || 'deleted item'} · {timeAgo(c.createdAt)}
                      </span>
                      <span className="block">{c.text}</span>
                    </span>
                    <button
                      className="icon-btn small"
                      aria-label="Delete comment"
                      onClick={() => {
                        actions.deleteComment(c.id)
                        notify('Comment deleted')
                      }}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </>
  )
}

// ---------- Revenue ----------

function Revenue() {
  const { db, workouts, actions, notify } = useStore()
  const t = salesTotals(workouts)
  const sales = workouts.filter((w) => w.premium).flatMap((w) => (w.unlocked || []).map((buyerId) => ({ w, buyer: db.users[buyerId], split: splitSale(w.price) })))
  const waiting = workouts.filter((w) => w.premium).flatMap((w) => (w.requests || []).map((id) => ({ w, buyer: db.users[id] })))

  return (
    <>
      <div className="adm-kpis">
        <Kpi label="Paid sales" value={t.sales} sub={`${money(t.gross)} gross`} />
        <Kpi label={`Platform fee (${FEES.platformPct}%)`} value={money(t.fee)} />
        <Kpi label={`Running & payments (${runningPct}%)`} value={money(t.running)} />
        <Kpi label={`Community health fund (${FEES.communityPct}%)`} value={money(t.community)} tone="lime" />
        <Kpi label={`Paid to coaches (${coachPct}%)`} value={money(t.coach)} />
      </div>
      <div className="adm-grid2">
        <Panel title="Sales">
          {sales.length === 0 ? (
            <p className="muted small">No sales yet.</p>
          ) : (
            <ul className="adm-list">
              {sales.map(({ w, buyer, split }, i) => (
                <li key={`${w.id}-${buyer?.id || i}`}>
                  <Avatar user={buyer} size={30} />
                  <span className="grow">
                    <span className="strong">{buyer?.name || 'Removed'}</span> bought {w.name}
                    <span className="tiny block">
                      Coach {money(split.coach, split.symbol)} · fee {money(split.fee, split.symbol)} · community {money(split.community, split.symbol)}
                    </span>
                  </span>
                  <strong>{money(split.amount, split.symbol)}</strong>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Waiting for unlock">
          {waiting.length === 0 ? (
            <p className="muted small">No buyers waiting.</p>
          ) : (
            <ul className="adm-list">
              {waiting.map(({ w, buyer }, i) => (
                <li key={`${w.id}-${buyer?.id || i}`}>
                  <Avatar user={buyer} size={30} />
                  <span className="grow">
                    <span className="strong">{buyer?.name || 'Removed'}</span> says they paid for {w.name}
                    <span className="tiny block">Coach: {db.users[w.authorId]?.name || 'Unknown'}</span>
                  </span>
                  {buyer && (
                    <button
                      className="btn btn-primary small"
                      onClick={() => {
                        actions.setUnlocked(w.id, buyer.id, true)
                        notify(`Unlocked for ${buyer.name}`)
                      }}
                    >
                      Unlock
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <Panel title="How each sale is split">
        <FeeBar />
        <p className="tiny">
          Rates live in <code>src/lib/fees.js</code> and the backend’s <code>.env</code>. The fee is recorded, not collected, until payments move to
          Stripe Connect.
        </p>
      </Panel>
    </>
  )
}

// ---------- Activity ----------

function Activity() {
  const { db } = useStore()
  const sessions = [...db.sessions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 30)
  const signups = Object.values(db.users)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 12)
  return (
    <div className="adm-grid2">
      <Panel title="Latest sessions">
        <ul className="adm-list">
          {sessions.map((s) => (
            <li key={s.id}>
              <Avatar user={db.users[s.userId]} size={30} />
              <button className="link-plain grow" onClick={() => go(`a/${s.id}`)}>
                <span className="strong">{db.users[s.userId]?.name || 'Removed'}</span> finished {s.workoutName}
                <span className="tiny block">
                  {timeAgo(s.date)} · {fmtDuration(s.duration)} · effort {s.rpe}/10
                  {s.partnerIds?.length ? ` · with ${s.partnerIds.length} partner${s.partnerIds.length === 1 ? '' : 's'}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Newest members">
        <ul className="adm-list">
          {signups.map((u) => (
            <li key={u.id}>
              <Avatar user={u} size={30} />
              <span className="grow">
                <span className="strong">{u.name}</span> <RoleBadge role={u.role} />
                <span className="tiny block">
                  Joined {timeAgo(u.createdAt)}
                  {u.googleUid ? ' · Google' : ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
