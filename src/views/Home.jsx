import { useMemo, useState } from 'react'
import { Avatar, Empty, RoleBadge, Segmented } from '../components/ui'
import { MoveImage } from '../components/BodyMap'
import Icon from '../components/Icon'
import { FORMATS } from '../data/workouts'
import { go, isCoach, useStore } from '../store'
import { unreadCount, useInbox } from '../lib/inbox'
import { fmtDuration, fmtKg, muscleSplit, sessionVolume, sessionsFor, timeAgo, weekKey, weekStart, weekSummary, workoutMinutes } from '../lib/utils'

export const ICON_PATHS = {
  kudos: 'M7 10v10H4V10zM7 10l4-7a2 2 0 0 1 3 2l-1 4h6a2 2 0 0 1 2 2.3l-1.3 7A2 2 0 0 1 17.7 20H7',
  comment: 'M4 5h16v11H9l-5 4z',
  share: 'M12 3v12M7 8l5-5 5 5M5 14v6h14v-6',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5 21 21',
}
export const Svg = ({ d, size = 22, fill = false }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <path d={d} fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export function whenLabel(iso) {
  const d = new Date(iso)
  const today = new Date()
  const y = new Date()
  y.setDate(today.getDate() - 1)
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (d.toDateString() === today.toDateString()) return `Today at ${time}`
  if (d.toDateString() === y.toDateString()) return `Yesterday at ${time}`
  return `${d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })} at ${time}`
}

export default function Home() {
  const { db, me } = useStore()
  const [tab, setTab] = useState('everyone')

  const myCircle = useMemo(() => {
    if (!me) return new Set()
    if (tab === 'partners') return new Set([me.id, ...me.partners])
    if (tab === 'coaching') {
      const ids = new Set([me.id])
      const myCoach = db.coaching.find((c) => c.clientId === me.id && c.status === 'active')?.coachId
      for (const c of db.coaching) {
        if (c.status !== 'active') continue
        if (c.coachId === me.id || c.coachId === myCoach) {
          ids.add(c.clientId)
          ids.add(c.coachId)
        }
      }
      return ids
    }
    return null
  }, [db.coaching, me, tab])

  const items = useMemo(() => {
    const list = [
      ...db.sessions.map((s) => ({ type: 'session', id: s.id, date: s.date, people: [s.userId, ...(s.partnerIds || [])], s })),
      ...db.workouts.filter((w) => !w.private).map((w) => ({ type: 'workout', id: w.id, date: w.createdAt, people: [w.authorId], w })),
    ]
    return list
      .filter((e) => e.people.some((p) => db.users[p]))
      .filter((e) => !myCircle || e.people.some((p) => myCircle.has(p)))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 40)
  }, [db, myCircle])

  return (
    <div className="page narrow feed-page">
      <header className="app-head">
        <h1>Home</h1>
        <div className="row gap-xs">
          <button className="icon-btn" onClick={() => go('explore')} aria-label="Search">
            <Svg d={ICON_PATHS.search} />
          </button>
          {me?.googleUid && <BellButton />}
          {me?.googleUid && (
            <button className="icon-btn" onClick={() => go('friends')} aria-label="Friends">
              <Icon name="users" size={20} />
            </button>
          )}
          <button className="status" onClick={() => go(me ? 'you' : 'signin')} aria-label={me ? 'Your profile' : 'Sign in'}>
            <span className={`dot ${me ? 'live' : ''}`} />
            {me ? <Avatar user={me} size={26} /> : 'Sign in'}
          </button>
        </div>
      </header>

      <Segmented
        options={[
          ['everyone', 'Following'],
          ['partners', 'Partners'],
          ['coaching', 'Training'],
        ]}
        value={tab}
        onChange={(v) => (v !== 'everyone' && !me ? go('signin') : setTab(v))}
      />

      {me ? <YourWeek /> : <WelcomeCard />}
      {me?.role === 'client' && <CoachNudge />}
      {isCoach(me) && <CoachSummary />}
      <Leaderboard />

      {items.length === 0 ? (
        <Empty icon="chat" title="Nothing here yet">
          {tab === 'partners' ? 'Add training partners from your profile.' : 'Log a session to get things going.'}
        </Empty>
      ) : (
        items.map((e) => (e.type === 'session' ? <ActivityCard key={e.id} s={e.s} /> : <PublishedCard key={e.id} w={e.w} />))
      )}
    </div>
  )
}

function WelcomeCard() {
  return (
    <section className="week-card photo" style={{ backgroundImage: `linear-gradient(110deg, rgb(220 240 90 / 96%) 45%, rgb(205 232 60 / 55%)), url(${import.meta.env.BASE_URL}img/class.jpg)` }}>
      <p className="week-eyebrow">Welcome to Kinetic Performances</p>
      <p className="week-title">Train with friends, follow a trainer, track every rep.</p>
      <div className="row gap-s">
        <button className="btn btn-white" onClick={() => go('signin')}>
          Join now
        </button>
        <button className="btn btn-outline-white" onClick={() => go('explore')}>
          Browse workouts
        </button>
      </div>
    </section>
  )
}

function YourWeek() {
  const { db, me } = useStore()
  const wk = weekSummary(sessionsFor(db, me.id))
  const today = (new Date().getDay() + 6) % 7
  return (
    <section className="week-card" aria-label="Your week">
      <div className="row between">
        <span className="week-eyebrow">Your week</span>
        <button className="link-white" onClick={() => go('you')}>
          See progress ›
        </button>
      </div>
      <div className="week-stats">
        <div>
          <span className="week-n">{wk.count}</span>
          <span className="week-l">Sessions</span>
        </div>
        <div>
          <span className="week-n">{fmtDuration(wk.time)}</span>
          <span className="week-l">Time</span>
        </div>
        <div>
          <span className="week-n">{fmtKg(wk.volume)}</span>
          <span className="week-l">Volume</span>
        </div>
      </div>
      <div className="week-days">
        {'MTWTFSS'.split('').map((l, i) => (
          <span key={i} className={`wd ${wk.days[i] ? 'on' : ''} ${i === today ? 'today' : ''}`} aria-label={`${l}${wk.days[i] ? ' trained' : ''}`}>
            {wk.days[i] ? '✓' : l}
          </span>
        ))}
      </div>
    </section>
  )
}

function CoachNudge() {
  const { db, me, workouts } = useStore()
  const link = db.coaching.find((c) => c.clientId === me.id)
  const coach = link && db.users[link.coachId]
  if (!coach) {
    return (
      <button className="card nudge" onClick={() => go('explore/coaches')}>
        <span className="nudge-icon">
          <Icon name="users" />
        </span>
        <span className="grow">
          <span className="strong block">Find a trainer</span>
          <span className="muted small">Get workouts picked for you.</span>
        </span>
        <span className="chev-right">›</span>
      </button>
    )
  }
  const todo = db.assignments
    .filter((a) => a.clientId === me.id)
    .filter((a) => !db.sessions.some((s) => s.workoutId === a.workoutId && (s.userId === me.id || s.partnerIds?.includes(me.id)) && s.date > a.createdAt))
  const first = todo[0] && workouts.find((w) => w.id === todo[0].workoutId)
  return (
    <button className="card nudge" onClick={() => go(first ? `w/${first.id}` : `coach/${coach.id}`)}>
      <Avatar user={coach} size={40} />
      <span className="grow">
        <span className="strong block">{link.status === 'pending' ? `Waiting for ${coach.name}` : first ? `${coach.name.split(' ')[0]} assigned: ${first.name}` : `Training with ${coach.name}`}</span>
        <span className="muted small">{link.status === 'pending' ? 'Your trainer will accept you soon.' : first ? todo[0].note || `${workoutMinutes(first)} min` : 'All assigned workouts done'}</span>
      </span>
      <span className="chev-right">›</span>
    </button>
  )
}

function CoachSummary() {
  const { db, me } = useStore()
  const links = db.coaching.filter((c) => c.coachId === me.id)
  const pending = links.filter((c) => c.status === 'pending').length
  const active = links.filter((c) => c.status === 'active').length
  return (
    <button className="card nudge" onClick={() => go('clients')}>
      <span className="nudge-icon">
        <Icon name="clipboard" />
      </span>
      <span className="grow">
        <span className="strong block">
          {active} member{active === 1 ? '' : 's'}
          {pending ? ` · ${pending} new request${pending === 1 ? '' : 's'}` : ''}
        </span>
        <span className="muted small">Assign workouts and check in on your members.</span>
      </span>
      {pending > 0 && <span className="count-pill">{pending}</span>}
      <span className="chev-right">›</span>
    </button>
  )
}

function Leaderboard() {
  const { db, me } = useStore()
  const rows = useMemo(() => {
    const thisWeek = weekKey(weekStart())
    const counts = {}
    for (const s of db.sessions) {
      if (weekKey(s.date) !== thisWeek) continue
      for (const p of new Set([s.userId, ...(s.partnerIds || [])])) counts[p] = (counts[p] || 0) + 1
    }
    return Object.entries(counts)
      .filter(([id]) => db.users[id])
      .map(([id, n]) => ({ user: db.users[id], n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 5)
  }, [db])
  if (!rows.length) return null
  return (
    <section className="card leader-card">
      <div className="row between">
        <h2 className="card-h">Weekly leaderboard</h2>
        <span className="muted tiny">sessions</span>
      </div>
      <div className="leader-row">
        {rows.map(({ user, n }, i) => (
          <div key={user.id} className={`leader ${me?.id === user.id ? 'me' : ''}`}>
            <span className="leader-rank">{i + 1}</span>
            <Avatar user={user} size={40} />
            <span className="leader-name">{user.name.split(' ')[0]}</span>
            <span className="leader-n">{n}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------- Activity card (Strava-style) ----------

export function ActivityCard({ s, full = false }) {
  const { db, me, workouts, actions, notify } = useStore()
  const user = db.users[s.userId]
  if (!user) return null
  const w = workouts.find((x) => x.id === s.workoutId)
  const partners = (s.partnerIds || []).map((id) => db.users[id]).filter(Boolean)
  const kudos = db.kudos[s.id] || []
  const gave = me && kudos.includes(me.id)
  const comments = db.comments.filter((c) => c.sessionId === s.id)
  const split = muscleSplit(s, w)
  const vol = sessionVolume(s)

  const share = async () => {
    const url = `${location.origin}${location.pathname}#/a/${s.id}`
    try {
      await navigator.clipboard.writeText(url)
      notify('Link copied')
    } catch {
      notify(url)
    }
  }

  return (
    <article className="activity">
      <header className="act-head">
        <button className="link-plain" onClick={() => user.role === 'coach' && go(`coach/${user.id}`)} aria-label={user.name}>
          <Avatar user={user} size={42} />
        </button>
        <div className="grow">
          <p className="act-name">
            {user.name} {user.role !== 'client' && <RoleBadge role={user.role} />}
          </p>
          <p className="muted tiny">
            {whenLabel(s.date)} · {FORMATS[s.format] || 'Workout'}
          </p>
        </div>
      </header>
      <button className="link-plain act-body" onClick={() => go(`a/${s.id}`)}>
        <h3 className="act-title">{s.workoutName}</h3>
        {s.note && <p className="act-note">{s.note}</p>}
        <div className="act-stats">
          <div>
            <span className="act-l">Time</span>
            <span className="act-v">{fmtDuration(s.duration)}</span>
          </div>
          {vol > 0 ? (
            <div>
              <span className="act-l">Volume</span>
              <span className="act-v">{fmtKg(vol)}</span>
            </div>
          ) : s.rounds ? (
            <div>
              <span className="act-l">Rounds</span>
              <span className="act-v">{s.rounds}</span>
            </div>
          ) : (
            <div>
              <span className="act-l">Sets</span>
              <span className="act-v">{s.sets?.length || '–'}</span>
            </div>
          )}
          <div>
            <span className="act-l">Effort</span>
            <span className="act-v">{s.rpe}/10</span>
          </div>
        </div>
        {split.length > 0 && (
          <div className="split">
            {split.map((m) => (
              <div key={m.group} className="split-row">
                <span className="split-l">{m.group}</span>
                <span className="split-bar">
                  <span style={{ width: `${m.pct}%` }} />
                </span>
                <span className="split-v">{m.pct}%</span>
              </div>
            ))}
          </div>
        )}
      </button>
      {partners.length > 0 && (
        <p className="act-with muted small">
          <span className="avatar-stack">
            {partners.map((p) => (
              <Avatar key={p.id} user={p} size={22} />
            ))}
          </span>
          Trained with {partners.map((p) => p.name.split(' ')[0]).join(', ')}
        </p>
      )}
      {(kudos.length > 0 || comments.length > 0) && (
        <p className="act-counts tiny">
          {kudos.length > 0 && `${kudos.length} kudos`}
          {kudos.length > 0 && comments.length > 0 && ' · '}
          {comments.length > 0 && `${comments.length} comment${comments.length === 1 ? '' : 's'}`}
        </p>
      )}
      <footer className="act-actions">
        <button className={gave ? 'on' : ''} onClick={() => (me ? actions.toggleKudos(s.id) : go('signin'))} aria-pressed={!!gave} aria-label="Give kudos">
          <Svg d={ICON_PATHS.kudos} fill={!!gave} />
        </button>
        <button onClick={() => go(`a/${s.id}`)} aria-label="Comment">
          <Svg d={ICON_PATHS.comment} />
        </button>
        <button onClick={share} aria-label="Share">
          <Svg d={ICON_PATHS.share} />
        </button>
      </footer>
      {full && comments.length > 0 && (
        <ul className="comments">
          {comments.map((c) => {
            const u = db.users[c.userId]
            if (!u) return null
            return (
              <li key={c.id}>
                <Avatar user={u} size={30} />
                <div className="grow">
                  <p>
                    <span className="strong">{u.name}</span> <span className="tiny">{timeAgo(c.createdAt)}</span>
                  </p>
                  <p>{c.text}</p>
                </div>
                {me && (c.userId === me.id || s.userId === me.id) && (
                  <button className="icon-btn small" onClick={() => actions.deleteComment(c.id)} aria-label="Delete comment">
                    ✕
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </article>
  )
}

function PublishedCard({ w }) {
  const { db } = useStore()
  const user = db.users[w.authorId]
  if (!user) return null
  const first = w.parts.flatMap((p) => p.moves)[0]
  return (
    <article className="activity">
      <header className="act-head">
        <Avatar user={user} size={42} />
        <div className="grow">
          <p className="act-name">
            {user.name} <RoleBadge role={user.role} />
          </p>
          <p className="muted tiny">Published a workout · {timeAgo(w.createdAt)}</p>
        </div>
      </header>
      <button className="published" onClick={() => go(`w/${w.id}`)}>
        {w.cover ? <img src={w.cover} alt="" className="published-img" /> : <MoveImage move={first} size={72} />}
        <span className="grow">
          <span className="strong block">{w.name}</span>
          <span className="muted small">
            {workoutMinutes(w)} min · {w.level}
          </span>
        </span>
        <span className={`price ${w.premium ? 'paid' : ''}`}>{w.premium ? w.price : 'Free'}</span>
      </button>
    </article>
  )
}

export function ActivityPage({ id }) {
  const { db, me, actions } = useStore()
  const [text, setText] = useState('')
  const s = db.sessions.find((x) => x.id === id)
  if (!s) return <Empty icon="info" title="Activity not found" />
  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    actions.addSessionComment(s.id, text.trim())
    setText('')
  }
  return (
    <div className="page narrow">
      <header className="app-head">
        <button className="icon-btn" onClick={() => history.back()} aria-label="Back">
          ‹
        </button>
        <h1 className="grow">Activity</h1>
      </header>
      <ActivityCard s={s} full />
      {me ? (
        <form className="row gap-s comment-form" onSubmit={submit}>
          <input className="grow" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment" maxLength={500} />
          <button className="btn btn-primary" disabled={!text.trim()}>
            Post
          </button>
        </form>
      ) : (
        <button className="btn btn-secondary full" onClick={() => go('signin')}>
          Sign in to comment
        </button>
      )}
      <button className="btn btn-ghost full" onClick={() => go(`w/${s.workoutId}`)}>
        Open the workout
      </button>
    </div>
  )
}

// Notifications bell with the number of unread items
function BellButton() {
  const inbox = useInbox()
  const n = unreadCount(inbox)
  return (
    <button className="icon-btn bell-btn" onClick={() => go('inbox')} aria-label={n ? `Notifications, ${n} new` : 'Notifications'}>
      <Icon name="bell" size={20} />
      {n > 0 && <span className="bell-count">{n > 9 ? '9+' : n}</span>}
    </button>
  )
}
