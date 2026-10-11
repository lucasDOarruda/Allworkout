import { useEffect, useMemo, useState } from 'react'
import { Avatar, Chips, RoleBadge } from '../components/ui'
import Icon from '../components/Icon'
import { BarList, ColumnChart } from '../components/Charts'
import { useStore } from '../store'
import { fmtDate, timeAgo } from '../lib/utils'
import { GOALS, TOOL_LABELS, goalLabel } from '../lib/goals'

// Cloud data for the admin: members (CRM) and traffic, loaded from Firestore.
export function useCloudAdmin() {
  const [state, setState] = useState({ loading: true })
  const load = () => {
    setState((s) => ({ ...s, loading: true }))
    import('../lib/cloud').then((c) => c.loadAdminData().then((r) => setState({ loading: false, ...r })))
  }
  useEffect(load, [])
  return { ...state, reload: load }
}

const DAY = 86400000

// Lifecycle status from activity
export function memberStatus(m) {
  const now = Date.now()
  const seen = m.lastSeenAt?.getTime() || 0
  if (seen > now - 2 * 60 * 1000) return ['online', 'Online now']
  if ((m.createdAt?.getTime() || 0) > now - 7 * DAY) return ['new', 'New']
  if (seen > now - 7 * DAY) return ['active', 'Active']
  if (seen > now - 30 * DAY) return ['quiet', 'Quiet']
  return ['inactive', 'Inactive']
}

function asUser(m) {
  return { name: m.name, photo: m.photo, color: '#3a4d00' }
}

export function CloudSetup({ error, onRetry }) {
  return (
    <section className="adm-panel cloud-setup">
      <h2>Cloud data isn’t available yet</h2>
      <p className="muted">{error}</p>
      <ol>
        <li>
          Firebase console → <strong>Firestore Database</strong> → Create database (production mode, a region near your members).
        </li>
        <li>
          In the backend folder run <code>npm run rules:deploy</code> to publish the security rules.
        </li>
        <li>Sign in here again with the admin Google account.</li>
      </ol>
      <button className="btn btn-secondary small" onClick={onRetry}>
        Try again
      </button>
    </section>
  )
}

// ---------- CRM ----------

export function Crm({ cloud }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState(null)
  const [open, setOpen] = useState(null)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (cloud.members || [])
      .map((m) => ({ ...m, status: memberStatus(m) }))
      .filter((m) => !status || m.status[0] === status || (status === 'coach' && m.role === 'coach') || m.goal === status)
      .filter((m) => !needle || `${m.name} ${m.email} ${m.location} ${goalLabel(m.goal)} ${(m.crm.tags || []).join(' ')}`.toLowerCase().includes(needle))
      .sort((a, b) => (b.lastSeenAt?.getTime() || 0) - (a.lastSeenAt?.getTime() || 0))
  }, [cloud.members, q, status])

  if (cloud.loading) return <p className="muted">Loading members…</p>
  if (cloud.error) return <CloudSetup error={cloud.error} onRetry={cloud.reload} />

  const exportCsv = () => {
    const head = ['name', 'email', 'role', 'status', 'goal', 'location', 'joined', 'last_seen', 'sign_ins', 'device', 'tags', 'follow_up', 'calc_goal', 'weight_kg', 'height_cm', 'bmi', 'kcal_target']
    const lines = rows.map((m) =>
      [m.name, m.email, m.role, m.status[1], goalLabel(m.goal), m.location, m.createdAt?.toISOString().slice(0, 10) || '', m.lastSeenAt?.toISOString() || '', m.signInCount, m.lastDevice, (m.crm.tags || []).join(' '), m.crm.followUp || '', m.health?.goal || '', m.health?.weight || '', m.health?.height || '', m.health?.bmi || '', m.health?.target || '']
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(','),
    )
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `all-workout-members-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const counts = Object.fromEntries(['online', 'new', 'active', 'quiet', 'inactive'].map((k) => [k, (cloud.members || []).filter((m) => memberStatus(m)[0] === k).length]))

  return (
    <>
      <div className="adm-kpis">
        <div className="adm-kpi">
          <span className="adm-kpi-l">Members</span>
          <span className="adm-kpi-v">{cloud.members.length}</span>
          <span className="adm-kpi-s">signed in with Google</span>
        </div>
        <div className="adm-kpi lime">
          <span className="adm-kpi-l">Online now</span>
          <span className="adm-kpi-v">{counts.online}</span>
        </div>
        <div className="adm-kpi">
          <span className="adm-kpi-l">New (7 days)</span>
          <span className="adm-kpi-v">{counts.new}</span>
        </div>
        <div className="adm-kpi">
          <span className="adm-kpi-l">Quiet or inactive</span>
          <span className="adm-kpi-v">{counts.quiet + counts.inactive}</span>
          <span className="adm-kpi-s">not seen for 7+ days</span>
        </div>
      </div>
      <div className="adm-toolbar">
        <input className="search" type="search" placeholder="Search name, email, place, goal or tag" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-ghost small" onClick={cloud.reload}>
          Refresh
        </button>
        <button className="btn btn-ghost small" onClick={exportCsv}>
          Export CSV
        </button>
      </div>
      <Chips
        options={[
          ['online', `Online (${counts.online})`],
          ['new', `New (${counts.new})`],
          ['active', `Active (${counts.active})`],
          ['quiet', `Quiet (${counts.quiet})`],
          ['inactive', `Inactive (${counts.inactive})`],
          ['coach', 'Trainers'],
          ...GOALS.filter(([g]) => (cloud.members || []).some((m) => m.goal === g)).map(([g, l]) => [g, l]),
        ]}
        value={status}
        onChange={setStatus}
      />
      <section className="adm-panel adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Status</th>
              <th>Goal</th>
              <th className="adm-hide-sm">Location</th>
              <th>Last seen</th>
              <th className="num">Sign-ins</th>
              <th className="adm-hide-sm">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.uid} onClick={() => setOpen(m.uid)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(m.uid)}>
                <td>
                  <span className="row gap-s">
                    <Avatar user={asUser(m)} size={32} />
                    <span>
                      <span className="strong block">
                        {m.name} <RoleBadge role={m.role} />
                      </span>
                      <span className="tiny">{m.email || 'No email'}</span>
                    </span>
                  </span>
                </td>
                <td>
                  <span className={`crm-status ${m.status[0]}`}>{m.status[1]}</span>
                  {m.crm.followUp && <span className="tiny block">Follow up {fmtDate(m.crm.followUp)}</span>}
                </td>
                <td className="small">{goalLabel(m.goal) || '–'}</td>
                <td className="small adm-hide-sm">{m.location || '–'}</td>
                <td className="small">{m.lastSeenAt ? timeAgo(m.lastSeenAt.toISOString()) : '–'}</td>
                <td className="num">{m.signInCount}</td>
                <td className="small adm-hide-sm">{m.createdAt ? fmtDate(m.createdAt.toISOString()) : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="muted small">{cloud.members.length ? 'No members match.' : 'Nobody has signed in yet.'}</p>}
      </section>
      {open && <CrmDrawer member={rows.find((m) => m.uid === open) || cloud.members.find((m) => m.uid === open)} onClose={() => setOpen(null)} onSaved={cloud.reload} />}
    </>
  )
}

function CrmDrawer({ member: m, onClose, onSaved }) {
  const { notify } = useStore()
  const [signins, setSignins] = useState(null)
  const [note, setNote] = useState('')
  const [tags, setTags] = useState((m.crm.tags || []).join(', '))
  const [followUp, setFollowUp] = useState(m.crm.followUp || '')
  const notes = m.crm.notes || []
  const status = memberStatus(m)

  useEffect(() => {
    import('../lib/cloud').then((c) => c.loadSignins(m.uid).then(setSignins))
  }, [m.uid])

  const save = async (patch, msg) => {
    try {
      const c = await import('../lib/cloud')
      await c.saveCrm(m.uid, patch)
      notify(msg)
      onSaved()
    } catch {
      notify('Couldn’t save. Check the Firestore rules are deployed.', 'error')
    }
  }
  const changeRole = async (role) => {
    try {
      const c = await import('../lib/cloud')
      await c.setCloudRole(m.uid, role)
      notify(`${m.name} is now ${role === 'admin' ? 'an' : 'a'} ${role}`)
      onSaved()
    } catch {
      notify('Couldn’t change the role.', 'error')
    }
  }

  return (
    <div className="adm-drawer-back" onClick={onClose}>
      <aside className="adm-drawer" role="dialog" aria-modal="true" aria-label={m.name} onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <span className={`crm-status ${status[0]}`}>{status[1]}</span>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="plus" className="rot45" />
          </button>
        </div>
        <div className="adm-drawer-id">
          <Avatar user={asUser(m)} size={64} />
          <div>
            <h2>{m.name}</h2>
            {m.email ? (
              <a className="small" href={`mailto:${m.email}`}>
                {m.email}
              </a>
            ) : (
              <p className="small muted">No email on file</p>
            )}
            <p className="tiny">Google sign-in · ID {m.uid.slice(0, 8)}…</p>
          </div>
        </div>
        <div className="row gap-s wrap">
          {m.email && (
            <>
              <a className="btn btn-primary small" href={`mailto:${m.email}`}>
                Email
              </a>
              <button
                className="btn btn-ghost small"
                onClick={() => navigator.clipboard?.writeText(m.email).then(() => notify('Email copied'), () => notify(m.email))}
              >
                Copy email
              </button>
            </>
          )}
        </div>
        <dl className="crm-facts">
          <div>
            <dt>Joined</dt>
            <dd>{m.createdAt ? fmtDate(m.createdAt.toISOString()) : '–'}</dd>
          </div>
          <div>
            <dt>Last seen</dt>
            <dd>{m.lastSeenAt ? timeAgo(m.lastSeenAt.toISOString()) : '–'}</dd>
          </div>
          <div>
            <dt>Sign-ins</dt>
            <dd>{m.signInCount}</dd>
          </div>
          <div>
            <dt>Goal</dt>
            <dd>{goalLabel(m.goal) || '–'}</dd>
          </div>
          <div>
            <dt>Signs in from</dt>
            <dd>{m.location || '–'}</dd>
          </div>
          <div>
            <dt>Last device</dt>
            <dd>{m.lastDevice || '–'}</dd>
          </div>
          <div>
            <dt>Active days</dt>
            <dd>{m.activeDays.length}</dd>
          </div>
          <div>
            <dt>Last screen</dt>
            <dd>{m.screen || '–'}</dd>
          </div>
        </dl>
        <h3 className="adm-sub">Health calculator</h3>
        {m.health ? (
          <>
            <dl className="crm-facts">
              {[
                ['Calculator goal', { lose: 'Lose fat', maintain: 'Maintain', gain: 'Gain muscle' }[m.health.goal] || '–'],
                ['Sex, age', [m.health.sex, m.health.age].filter(Boolean).join(', ') || '–'],
                ['Height', m.health.height ? `${m.health.height} cm` : '–'],
                ['Weight', m.health.weight ? `${m.health.weight} kg` : '–'],
                ['BMI', m.health.bmi || '–'],
                ['Waist-to-height', m.health.whtr || '–'],
                ['Body fat (est.)', m.health.bodyFat ? `${m.health.bodyFat}%` : '–'],
                ['Maintenance', m.health.tdee ? `${m.health.tdee} kcal` : '–'],
                ['Daily target', m.health.target ? `${m.health.target} kcal` : '–'],
                ['Protein', m.health.protein ? `${m.health.protein} g` : '–'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="tiny">Saved with the member’s consent{m.health.updatedAt ? ` · updated ${timeAgo(m.health.updatedAt.toISOString())}` : ''}.</p>
          </>
        ) : (
          <p className="muted small">Not shared. Members choose whether to save their calculator results to their account.</p>
        )}

        <label className="field">
          <span>Role</span>
          <select value={m.role} onChange={(e) => changeRole(e.target.value)}>
            <option value="client">Member</option>
            <option value="coach">Trainer</option>
            <option value="admin">Admin</option>
          </select>
        </label>

        <h3 className="adm-sub">Follow-up and tags</h3>
        <div className="field-row">
          <label className="field">
            <span>Follow up on</span>
            <input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
          </label>
          <label className="field grow2">
            <span>Tags (comma separated)</span>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="vip, trainer-lead" maxLength={200} />
          </label>
        </div>
        <button
          className="btn btn-secondary small"
          onClick={() =>
            save(
              {
                followUp,
                tags: tags
                  .split(',')
                  .map((t) => t.trim().toLowerCase())
                  .filter(Boolean)
                  .slice(0, 12),
              },
              'Saved',
            )
          }
        >
          Save follow-up and tags
        </button>

        <h3 className="adm-sub">Notes</h3>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault()
            if (!note.trim()) return
            save({ notes: [{ text: note.trim().slice(0, 1000), at: new Date().toISOString() }, ...notes].slice(0, 50) }, 'Note added')
            setNote('')
          }}
        >
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Called about training, follow up next week…" maxLength={1000} />
          <button className="btn btn-primary small" disabled={!note.trim()}>
            Add note
          </button>
        </form>
        {notes.length === 0 ? (
          <p className="muted small">No notes yet.</p>
        ) : (
          <ul className="adm-list">
            {notes.map((n, i) => (
              <li key={i}>
                <span className="grow">
                  {n.text}
                  <span className="tiny block">{timeAgo(n.at)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <h3 className="adm-sub">Sign-in history</h3>
        {signins === null ? (
          <p className="muted small">Loading…</p>
        ) : signins.length === 0 ? (
          <p className="muted small">No sign-ins recorded.</p>
        ) : (
          <ul className="adm-list">
            {signins.map((s, i) => (
              <li key={i}>
                <span className="grow">
                  {s.at ? `${fmtDate(s.at.toISOString())} · ${s.at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : 'Just now'}
                  <span className="tiny block">{[s.device, s.location].filter(Boolean).join(' · ')}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  )
}

// ---------- Traffic ----------

export function Traffic({ cloud }) {
  if (cloud.loading) return <p className="muted">Loading traffic…</p>
  if (cloud.error) return <CloudSetup error={cloud.error} onRetry={cloud.reload} />

  const byDay = Object.fromEntries((cloud.traffic || []).map((t) => [t.day, t]))
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * DAY)
    const key = d.toLocaleDateString('en-CA')
    return { key, label: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }), short: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), t: byDay[key] || {} }
  })
  const series = (field) => days.map((d) => ({ key: d.key, label: d.label, short: d.short, value: d.t[field] || 0 }))
  const today = days[days.length - 1].t
  const sum = (field, n) => days.slice(-n).reduce((a, d) => a + (d.t[field] || 0), 0)
  const now = Date.now()
  const online = (cloud.members || []).filter((m) => (m.lastSeenAt?.getTime() || 0) > now - 2 * 60 * 1000)
  const active7 = (cloud.members || []).filter((m) => (m.lastSeenAt?.getTime() || 0) > now - 7 * DAY).length
  const active30 = (cloud.members || []).filter((m) => (m.lastSeenAt?.getTime() || 0) > now - 30 * DAY).length

  return (
    <>
      <div className="adm-kpis">
        <div className="adm-kpi lime">
          <span className="adm-kpi-l">Online now</span>
          <span className="adm-kpi-v">{online.length}</span>
          <span className="adm-kpi-s">signed-in members</span>
        </div>
        <div className="adm-kpi">
          <span className="adm-kpi-l">Page views today</span>
          <span className="adm-kpi-v">{today.views || 0}</span>
          <span className="adm-kpi-s">{sum('views', 7)} in 7 days</span>
        </div>
        <div className="adm-kpi">
          <span className="adm-kpi-l">Visitors today</span>
          <span className="adm-kpi-v">{today.visitors || 0}</span>
          <span className="adm-kpi-s">{sum('visitors', 30)} in 30 days</span>
        </div>
        <div className="adm-kpi">
          <span className="adm-kpi-l">Sign-ins today</span>
          <span className="adm-kpi-v">{today.signins || 0}</span>
          <span className="adm-kpi-s">{sum('signins', 30)} in 30 days</span>
        </div>
        <div className="adm-kpi">
          <span className="adm-kpi-l">Active members</span>
          <span className="adm-kpi-v">{active7}</span>
          <span className="adm-kpi-s">7 days · {active30} in 30 days</span>
        </div>
      </div>
      <div className="adm-grid2">
        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>Page views per day</h2>
          </div>
          <ColumnChart data={series('views')} label="Page views per day, last 30 days" format={(v) => `${v} view${v === 1 ? '' : 's'}`} />
        </section>
        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>Visitors per day</h2>
          </div>
          <ColumnChart data={series('visitors')} label="Visitors per day, last 30 days" format={(v) => `${v} visitor${v === 1 ? '' : 's'}`} />
        </section>
      </div>
      <div className="adm-grid2">
        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>Sign-ins per day</h2>
          </div>
          <ColumnChart data={series('signins')} label="Sign-ins per day, last 30 days" format={(v) => `${v} sign-in${v === 1 ? '' : 's'}`} />
        </section>
        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>Online now</h2>
            <button className="btn btn-ghost small" onClick={cloud.reload}>
              Refresh
            </button>
          </div>
          {online.length === 0 ? (
            <p className="muted small">No signed-in members active in the last 2 minutes.</p>
          ) : (
            <ul className="adm-list">
              {online.map((m) => (
                <li key={m.uid}>
                  <Avatar user={asUser(m)} size={30} />
                  <span className="grow">
                    <span className="strong">{m.name}</span>
                    <span className="tiny block">
                      On {m.screen || 'the app'} · {m.lastDevice}
                    </span>
                  </span>
                  <span className="crm-status online">Online</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <Insights cloud={cloud} />
      <p className="tiny">
        Counts come from this site’s own tracking. For full traffic (sources, countries, devices, live visitors including people who
        aren’t signed in), open{' '}
        <a href="https://console.firebase.google.com/project/allworkout-61d91/analytics" target="_blank" rel="noreferrer">
          Google Analytics in Firebase
        </a>
        .
      </p>
    </>
  )
}

// Where people are, what they want and which calculators they use
const top = (obj, n = 8, labelOf = (k) => k) =>
  Object.entries(obj)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => ({ key: k, label: labelOf(k), value: v }))
const countBy = (list, f) => list.reduce((acc, x) => (f(x) ? { ...acc, [f(x)]: (acc[f(x)] || 0) + 1 } : acc), {})
const placeName = (k) => k.split('_').reverse().join(', ')

function Insights({ cloud }) {
  const members = cloud.members || []
  const tools = cloud.tools || {}
  const toolRows = top(Object.fromEntries(Object.entries(tools).filter(([k]) => !k.startsWith('goal_'))), 8, (k) => TOOL_LABELS[k] || k)
  const calcGoals = top(Object.fromEntries(Object.entries(tools).filter(([k]) => k.startsWith('goal_'))), 3, (k) => TOOL_LABELS[k] || k)
  const people = (v) => `${v} ${v === 1 ? 'member' : 'members'}`
  return (
    <>
      <div className="adm-grid2">
        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>Member goals</h2>
          </div>
          <BarList rows={top(countBy(members, (m) => m.goal), 8, goalLabel)} format={people} empty="No goals picked yet." />
        </section>
        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>Where members sign in from</h2>
          </div>
          <BarList rows={top(countBy(members, (m) => m.location))} format={people} empty="No locations yet. They’re recorded at each sign-in on the live site." />
        </section>
      </div>
      <div className="adm-grid2">
        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>Visitor locations</h2>
            <span className="tiny">30 days</span>
          </div>
          <BarList rows={top(cloud.places || {}, 10, placeName)} format={(v) => `${v} visitor${v === 1 ? '' : 's'}`} empty="No visits with a location yet." />
        </section>
        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>Health calculator use</h2>
            <span className="tiny">30 days</span>
          </div>
          <BarList rows={toolRows} format={(v) => `${v} visitor${v === 1 ? '' : 's'}`} empty="Nobody has used the calculators yet." />
          {calcGoals.length > 0 && (
            <>
              <h3 className="adm-sub">Goals picked in the calculator</h3>
              <BarList rows={calcGoals} format={(v) => `${v} visitor${v === 1 ? '' : 's'}`} />
            </>
          )}
        </section>
      </div>
    </>
  )
}
