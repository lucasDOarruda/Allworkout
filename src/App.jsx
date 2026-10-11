import { useEffect, useState } from 'react'
import Icon from './components/Icon'
import { go, useRoute, useStore } from './store'
import { OFFICIAL_PROGRAMS, programDays } from './data/programs'
import Home, { ActivityPage } from './views/Home'
import Explore from './views/Explore'
import Exercises, { QuickTimer } from './views/Exercises'
import WorkoutDetail from './views/WorkoutDetail'
import PartDetail from './views/PartDetail'
import Player, { FinishWorkout, LogSession } from './views/Player'
import Editor from './views/Editor'
import Plan, { ProgramPage } from './views/Plan'
import You from './views/You'
import CoachProfile from './views/CoachProfile'
import Clients from './views/Clients'
import Admin from './views/Admin'
import SignIn from './views/SignIn'
import Landing from './views/Landing'
import HealthTools from './views/HealthTools'
import { PublicFooter, PublicNav } from './components/PublicChrome'
import { canSee, rememberDestination, routeNeeds } from './lib/access'
import { Empty } from './components/ui'

const ICON = {
  home: 'M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  explore: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z',
  plan: 'M4 5h16v15H4zM4 10h16M9 3v4M15 3v4',
  you: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5',
}

const TabIcon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
)

export default function App() {
  const route = useRoute()
  const { me, db, actions } = useStore()
  const [sheet, setSheet] = useState(false)

  // On the live site only real (Google) accounts may use the app
  useEffect(() => {
    if (import.meta.env.PROD && me && !me.googleUid) actions.signOut()
  }, [me, actions])
  const [head, a, b, c, d] = route
  const playing = head === 'w' && b === 'p' && d === 'play'
  const landing = head === 'welcome' || head === 'tools'
  const need = routeNeeds(route)
  const allowed = canSee(need, me)

  let view
  if (!allowed && need === 'member') view = <SignIn gate onShow={rememberDestination} />
  else if (!allowed && need === 'admin' && !me) view = <SignIn adminMode />
  else if (!allowed) view = <Locked need={need} me={me} onSwitch={() => actions.signOut()} />
  else if (head === 'tools')
    view = (
      <div className="landing">
        <PublicNav active="tools" />
        <HealthTools />
        <PublicFooter />
      </div>
    )
  else if (landing) view = <Landing />
  else if (head === 'w' && b === 'p' && d === 'play') view = <Player id={a} idx={Number(c)} />
  else if (head === 'w' && b === 'p') view = <PartDetail id={a} idx={Number(c)} />
  else if (head === 'w' && b === 'log') view = <LogSession id={a} />
  else if (head === 'w' && b === 'finish') view = <FinishWorkout id={a} />
  else if (head === 'w' && b === 'edit') view = <Editor key={`edit-${a}`} id={a} />
  else if (head === 'w') view = <WorkoutDetail id={a} />
  else if (head === 'a') view = <ActivityPage id={a} />
  else if (head === 'create') view = <Editor key="new" />
  else if (head === 'exercises') view = <Exercises sub={a} arg={b} />
  else if (head === 'explore' || head === 'library') view = <Explore sub={a} />
  else if (head === 'plan') view = <Plan />
  else if (head === 'program') view = <ProgramPage id={a} />
  else if (head === 'you' || head === 'progress' || head === 'settings') view = <You sub={head === 'settings' ? 'settings' : a} />
  else if (head === 'coach') view = <CoachProfile id={a} />
  else if (head === 'clients') view = <Clients />
  else if (head === 'admin') view = <Admin section={a} />
  else if (head === 'signin') view = <SignIn />
  else view = <Home />

  const tabOf = {
    home: 'home',
    a: 'home',
    explore: 'explore',
    library: 'explore',
    exercises: 'explore',
    w: 'explore',
    coach: 'explore',
    plan: 'plan',
    program: 'plan',
    you: 'you',
    clients: 'you',
    admin: 'you',
    signin: 'you',
    create: 'you',
  }
  const active = tabOf[head] || 'home'
  const pending = me?.role === 'coach' ? db.coaching.filter((x) => x.coachId === me.id && x.status === 'pending').length : 0

  const Tab = ({ k, label }) => (
    <a href={`#/${k}`} className={active === k ? 'on' : ''} aria-current={active === k ? 'page' : undefined}>
      <span className="tab-icon">
        <TabIcon d={ICON[k]} />
        {k === 'you' && pending > 0 && <span className="tab-dot" aria-label={`${pending} client requests`} />}
      </span>
      {label}
    </a>
  )

  return (
    <div className={`app ${playing ? 'is-playing' : ''} ${landing ? 'is-landing' : ''}`}>
      <main>{view}</main>
      {!playing && !landing && allowed && head !== 'admin' && head !== 'signin' && !!me && (
        <nav className="tabbar" aria-label="Main">
          <Tab k="home" label="Home" />
          <Tab k="explore" label="Explore" />
          <button className="tab-fab" onClick={() => setSheet(true)} aria-label="Start a workout">
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
          </button>
          <Tab k="plan" label="Plan" />
          <Tab k="you" label="You" />
        </nav>
      )}
      {sheet && <StartSheet onClose={() => setSheet(false)} />}
      <Toast />
    </div>
  )
}

const img = (name) => `${import.meta.env.BASE_URL}img/${name}.jpg`

// Centre button: the fastest way into a session
function StartSheet({ onClose }) {
  const { db, me, workouts } = useStore()
  const isCoachUser = me?.role === 'coach' || me?.role === 'admin'
  const [timer, setTimer] = useState(null) // null | preset seconds | 'open'
  const key = me?.id || 'solo'
  const byId = Object.fromEntries(workouts.map((w) => [w.id, w]))

  const inProgress = Object.entries(db.progress[key] || {}).find(([id, pr]) => byId[id] && pr.done.length && !pr.saved)
  const en = db.enrollments[key]
  const prog = en && OFFICIAL_PROGRAMS.find((p) => p.id === en.programId)
  const nextDay = prog && programDays(prog).find((x) => !en.done.includes(x.key))
  const assigned = me && db.assignments.find((a) => a.clientId === me.id && !db.sessions.some((s) => s.workoutId === a.workoutId && s.userId === me.id && s.date > a.createdAt))

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const open = (path) => {
    onClose()
    go(path)
  }
  if (timer !== null) return <QuickTimer onClose={onClose} initial={timer === 'open' ? null : timer} />

  const upNext = [
    inProgress && { photo: 'barbell', eyebrow: 'Continue', title: byId[inProgress[0]].name, sub: `${inProgress[1].done.length} of ${byId[inProgress[0]].parts.length} parts done`, path: `w/${inProgress[0]}` },
    nextDay && byId[nextDay.workoutId] && { photo: 'class', eyebrow: `Today’s plan · week ${nextDay.week + 1}, day ${nextDay.day + 1}`, title: byId[nextDay.workoutId].name, sub: prog.name, path: `w/${nextDay.workoutId}` },
    assigned && byId[assigned.workoutId] && { photo: 'coach', eyebrow: 'From your coach', title: byId[assigned.workoutId].name, sub: assigned.note, path: `w/${assigned.workoutId}` },
  ].filter(Boolean)

  const tiles = [
    { photo: 'barbell', icon: 'dumbbell', title: 'Browse workouts', sub: 'Pick one and tap Start', path: 'explore' },
    { photo: 'class', icon: 'calendar', title: 'Follow a program', sub: 'A plan for every week', path: 'explore/programs' },
    { photo: 'home', icon: 'pencil', title: 'Log a past workout', sub: 'Open a workout and tap Log', path: 'explore' },
    isCoachUser
      ? { photo: 'dumbbells', icon: 'plus', title: 'Create a workout', sub: 'Publish free or paid', path: 'create' }
      : { photo: 'coach', icon: 'users', title: 'Find a coach', sub: 'Get a plan made for you', path: 'explore/coaches' },
  ]

  return (
    <div className="ss-backdrop" onClick={onClose}>
      <div className="ss" role="dialog" aria-modal="true" aria-label="Start a workout" onClick={(e) => e.stopPropagation()}>
        <div className="ss-head">
          <h2>Start a workout</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="plus" className="rot45" />
          </button>
        </div>

        <section className="ss-timer" style={{ backgroundImage: `url(${img('timer')})` }}>
          <div className="ss-timer-copy">
            <span className="ss-eyebrow">
              <Icon name="timer" size={16} /> Quick timer
            </span>
            <strong>Rest timer or stopwatch</strong>
            <div className="ss-presets">
              {[30, 60, 90, 120].map((sec) => (
                <button key={sec} onClick={() => setTimer(sec)}>
                  {sec < 60 ? `${sec}s` : sec === 60 ? '1 min' : `${sec / 60} min`}
                </button>
              ))}
              <button onClick={() => setTimer('stopwatch')}>Stopwatch</button>
            </div>
          </div>
          <button className="ss-ring" onClick={() => setTimer('open')} aria-label="Open timer">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="52" className="ss-ring-track" />
              <circle cx="60" cy="60" r="52" className="ss-ring-fill" />
            </svg>
            <span>
              1:30
              <small>Open timer</small>
            </span>
          </button>
        </section>

        {upNext.length > 0 && (
          <div className="ss-next">
            {upNext.map((t) => (
              <button key={t.path + t.eyebrow} className="ss-wide" onClick={() => open(t.path)} style={{ backgroundImage: `url(${img(t.photo)})` }}>
                <span className="ss-eyebrow">{t.eyebrow}</span>
                <strong>{t.title}</strong>
                {t.sub && <span className="ss-sub">{t.sub}</span>}
                <span className="ss-go">
                  <Icon name="play" size={16} />
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="ss-grid">
          {tiles.map((t) => (
            <button key={t.title} className="ss-tile" onClick={() => open(t.path)} style={{ backgroundImage: `url(${img(t.photo)})` }}>
              <span className="ss-tile-icon">
                <Icon name={t.icon} size={18} />
              </span>
              <strong>{t.title}</strong>
              <span className="ss-sub">{t.sub}</span>
            </button>
          ))}
        </div>
        <p className="ss-credit">Photos: Unsplash</p>
      </div>
    </div>
  )
}

// Shown instead of a page the current account isn't allowed to see
function Locked({ need, me, onSwitch }) {
  const what = need === 'admin' ? 'admins' : need === 'coach' ? 'coaches' : 'members'
  return (
    <div className="page narrow">
      <Empty icon="lock" title={`This page is for ${what} only`}>
        {me ? `You’re signed in as ${me.name}${me.email ? ` (${me.email})` : ''}, which doesn’t have access.` : 'Sign in with an account that has access.'}
        <div className="row gap-s locked-actions">
          {!me && (
            <button className="btn btn-primary" onClick={() => go('signin')}>
              Log in
            </button>
          )}
          {me && need === 'admin' && (
            <button className="btn btn-primary" onClick={onSwitch}>
              Switch account
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => go('home')}>
            Back to the app
          </button>
        </div>
      </Empty>
    </div>
  )
}

function Toast() {
  const { toast } = useStore()
  if (!toast) return null
  return (
    <div className={`toast ${toast.kind}`} role="status" key={toast.id}>
      {toast.text}
    </div>
  )
}
