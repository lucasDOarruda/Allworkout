import { Avatar, Empty, RoleBadge, Segmented } from '../components/ui'
import { go, useStore } from '../store'
import { sessionsFor } from '../lib/utils'
import { ActivityCard } from './Home'
import { ProgressBody } from './Progress'
import { SettingsBody } from './Settings'

const TABS = [
  ['progress', 'Progress'],
  ['activities', 'Activities'],
  ['settings', 'Settings'],
]

export default function You({ sub }) {
  const { db, me, actions, notify } = useStore()
  const tab = TABS.some(([k]) => k === sub) ? sub : 'progress'

  if (!me) {
    return (
      <div className="page narrow">
        <header className="app-head">
          <h1>You</h1>
        </header>
        <section className="week-card">
          <p className="week-eyebrow">Solo mode</p>
          <p className="week-title">Sign in to track progress, add partners and follow a coach.</p>
          <button className="btn btn-white" onClick={() => go('signin')}>
            Sign in or sign up
          </button>
        </section>
        <SettingsBody />
      </div>
    )
  }

  const sessions = sessionsFor(db, me.id).sort((a, b) => new Date(b.date) - new Date(a.date))
  const clients = db.coaching.filter((c) => c.coachId === me.id && c.status === 'active').length
  const published = db.workouts.filter((w) => w.authorId === me.id).length

  return (
    <div className="page narrow">
      <header className="profile">
        <Avatar user={me} size={76} />
        <div className="grow">
          <h1 className="profile-name">{me.name}</h1>
          <p className="row gap-s">
            <RoleBadge role={me.role} />
            {me.bio && <span className="muted small">{me.bio}</span>}
          </p>
        </div>
        <button
          className="btn btn-ghost small signout-btn"
          onClick={() => {
            actions.signOut()
            notify('Signed out')
            go('welcome')
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sign out
        </button>
      </header>
      <div className="profile-stats">
        <div>
          <span className="ps-n">{sessions.length}</span>
          <span className="ps-l">Activities</span>
        </div>
        <div>
          <span className="ps-n">{me.partners.length}</span>
          <span className="ps-l">Partners</span>
        </div>
        {me.role === 'client' ? (
          <div>
            <span className="ps-n">{db.enrollments[me.id] ? 1 : 0}</span>
            <span className="ps-l">Programs</span>
          </div>
        ) : (
          <div>
            <span className="ps-n">{me.role === 'coach' ? clients : published}</span>
            <span className="ps-l">{me.role === 'coach' ? 'Clients' : 'Workouts'}</span>
          </div>
        )}
      </div>

      {me.role === 'coach' && (
        <button className="card nav-card" onClick={() => go('clients')}>
          <span>Coach hub · clients & sales</span>
          <span className="chev-right">›</span>
        </button>
      )}
      {me.role === 'client' && me.googleUid && (
        <button className="card nav-card" onClick={() => go('apply')}>
          <span>
            {me.trainerStatus === 'pending'
              ? 'Trainer application · waiting for review'
              : me.trainerStatus === 'rejected'
                ? 'Trainer application · needs changes'
                : me.trainerStatus === 'apply'
                  ? 'Finish your trainer application'
                  : 'Are you a personal trainer? Apply to coach'}
          </span>
          <span className="chev-right">›</span>
        </button>
      )}
      {me.role === 'admin' && (
        <button className="card nav-card" onClick={() => go('admin')}>
          <span>Admin dashboard</span>
          <span className="chev-right">›</span>
        </button>
      )}

      <Segmented options={TABS} value={tab} onChange={(v) => go(v === 'progress' ? 'you' : `you/${v}`)} />

      {tab === 'progress' && <ProgressBody db={db} userId={me.id} />}
      {tab === 'activities' &&
        (sessions.length === 0 ? (
          <Empty icon="flag" title="No activities yet">
            Pick a workout in Explore and tap Start.
          </Empty>
        ) : (
          sessions.map((s) => <ActivityCard key={s.id} s={s} />)
        ))}
      {tab === 'settings' && <SettingsBody />}
    </div>
  )
}
