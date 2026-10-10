import { useEffect, useRef, useState } from 'react'
import BodyMap, { MuscleThumb, MoveImage, viewOf } from '../components/BodyMap'
import { Chips, Empty, Modal, MoveSheet, PageHead } from '../components/ui'
import Icon from '../components/Icon'
import { EQUIPMENT, EXERCISES, exercisesFor } from '../data/exercises'
import { go, useStore } from '../store'
import { beep, fmtClock, unlockAudio } from '../lib/utils'

export default function Exercises({ sub, arg }) {
  if (sub === 'm') return <ExerciseList title={arg} list={exercisesFor(arg)} muscle={arg} />
  if (sub === 'favorites') return <Favorites />
  if (sub === 'search') return <Search />
  return <MapScreen />
}

function MapScreen() {
  const [view, setView] = useState(() => {
    try {
      return sessionStorage.getItem('aw:view') || 'front'
    } catch {
      return 'front'
    }
  })
  const [active, setActive] = useState(null)
  const [timer, setTimer] = useState(false)

  const flip = () => {
    const v = view === 'front' ? 'back' : 'front'
    setView(v)
    try {
      sessionStorage.setItem('aw:view', v)
    } catch {
      /* ignore */
    }
  }
  const pick = (muscle) => {
    setActive(muscle)
    setTimeout(() => go(`exercises/m/${encodeURIComponent(muscle)}`), 140)
  }

  return (
    <div className="page map-page">
      <PageHead title="Exercises">
        <button className="icon-btn star-btn" onClick={() => go('exercises/favorites')} aria-label="Favourite exercises">
          ☆
        </button>
        <button className="premium-link" onClick={() => go('explore/premium')}>
          <span aria-hidden="true">♛</span>
          Premium
        </button>
      </PageHead>
      <button className="icon-btn search-btn" onClick={() => go('exercises/search')} aria-label="Search exercises">
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M16 16l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <div className="map-wrap">
        <BodyMap view={view} active={active} onPick={pick} />
      </div>
      <button className="float-btn left" onClick={flip} aria-label={`Show ${view === 'front' ? 'back' : 'front'} view`}>
        <span aria-hidden="true">⟲</span>
        <span className="float-label">{view === 'front' ? 'Back' : 'Front'}</span>
      </button>
      <button className="float-btn right" onClick={() => setTimer(true)} aria-label="Open timer">
        <Icon name="timer" size={26} />
      </button>
      {timer && <QuickTimer onClose={() => setTimer(false)} />}
    </div>
  )
}

function ExerciseList({ title, list, muscle, empty }) {
  const [equip, setEquip] = useState(null)
  const [open, setOpen] = useState(null)
  const shown = list.filter((e) => !equip || e.equipment === equip)
  return (
    <div className="page narrow">
      <PageHead title={title} back={() => go('exercises')}>
        {muscle && <MuscleThumb muscle={muscle} size={44} />}
      </PageHead>
      <Chips options={EQUIPMENT} value={equip} onChange={setEquip} all="Any equipment" />
      {shown.length === 0 ? (
        empty || <Empty icon="search" title="No exercises match" />
      ) : (
        <div className="card list-card">
          {shown.map((e) => (
            <button key={e.id} className="ex-row" onClick={() => setOpen(e)}>
              <MoveImage move={{ exerciseId: e.id }} size={64} />
              <span className="grow">
                <span className="display ex-name">{e.name}</span>
                <span className="muted small block">
                  {e.muscles.slice(0, 3).join(' · ')} — {e.equipment}
                </span>
              </span>
              <span className="chev-right">›</span>
            </button>
          ))}
        </div>
      )}
      {open && <MoveSheet move={{ exerciseId: open.id, name: open.name }} onClose={() => setOpen(null)} />}
    </div>
  )
}

function Favorites() {
  const { me } = useStore()
  const list = EXERCISES.filter((e) => me?.favorites.includes(e.id))
  return (
    <ExerciseList
      title="Favourites"
      list={list}
      empty={<Empty icon="☆" title="No favourites yet">{me ? 'Open an exercise and tap the star.' : 'Sign in to save favourites.'}</Empty>}
    />
  )
}

function Search() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)
  const needle = q.trim().toLowerCase()
  const list = needle ? EXERCISES.filter((e) => `${e.name} ${e.muscles.join(' ')} ${e.equipment}`.toLowerCase().includes(needle)) : EXERCISES
  return (
    <div className="page narrow">
      <PageHead title="Search" back={() => go('exercises')} />
      <input className="search" type="search" autoFocus placeholder={`Search ${EXERCISES.length} exercises`} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="card list-card">
        {list.map((e) => (
          <button key={e.id} className="ex-row" onClick={() => setOpen(e)}>
            <MoveImage move={{ exerciseId: e.id }} size={56} />
            <span className="grow">
              <span className="display ex-name">{e.name}</span>
              <span className="muted small block">
                {e.muscle} · {e.equipment} · {viewOf(e.muscle) === 'back' ? 'back' : 'front'}
              </span>
            </span>
          </button>
        ))}
      </div>
      {open && <MoveSheet move={{ exerciseId: open.id, name: open.name }} onClose={() => setOpen(null)} />}
    </div>
  )
}

// Rest timer / stopwatch for training outside a structured workout
export function QuickTimer({ onClose, initial = null }) {
  const [mode, setMode] = useState(null) // null | 'stopwatch' | seconds
  const [total, setTotal] = useState(0)
  const [ms, setMs] = useState(0)
  const [running, setRunning] = useState(false)
  const last = useRef(0)
  const lastSec = useRef(null)

  useEffect(() => {
    if (!running) return
    last.current = performance.now()
    const t = setInterval(() => {
      const now = performance.now()
      const dt = now - last.current
      last.current = now
      setMs((v) => {
        if (mode === 'stopwatch') return v + dt
        const next = Math.max(0, v - dt)
        const sec = Math.ceil(next / 1000)
        if (sec !== lastSec.current) {
          lastSec.current = sec
          if (sec > 0 && sec <= 3) beep(660, 120)
          if (sec === 0) {
            beep(988, 500)
            setRunning(false)
          }
        }
        return next
      })
    }, 100)
    return () => clearInterval(t)
  }, [running, mode])

  const start = (m) => {
    unlockAudio()
    setMode(m)
    setTotal(m === 'stopwatch' ? 0 : m * 1000)
    setMs(m === 'stopwatch' ? 0 : m * 1000)
    lastSec.current = null
    setRunning(true)
  }
  const addTime = () => {
    setMs((v) => v + 15000)
    setTotal((v) => v + 15000)
  }

  // Start straight away when opened from a preset
  useEffect(() => {
    if (initial !== null) start(initial)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const R = 120
  const C = 2 * Math.PI * R
  const progress = mode === null ? 0 : mode === 'stopwatch' ? (ms % 60000) / 60000 : total ? ms / total : 0
  const done = mode !== null && mode !== 'stopwatch' && ms === 0
  const label = mode === null ? 'Pick a time' : mode === 'stopwatch' ? 'Stopwatch' : done ? 'Time’s up' : running ? 'Rest' : 'Paused'

  return (
    <div className="qt" role="dialog" aria-modal="true" aria-label="Timer">
      <div className="qt-inner">
        <div className="qt-head">
          <span className="qt-title">Timer</span>
          <button className="qt-close" onClick={onClose} aria-label="Close timer">
            <Icon name="plus" className="rot45" />
          </button>
        </div>

        <div className={`qt-ring ${running ? 'live' : ''} ${done ? 'done' : ''}`}>
          <svg viewBox="0 0 280 280" aria-hidden="true">
            <defs>
              <linearGradient id="qtGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#b89dff" />
                <stop offset="100%" stopColor="#6d3ce0" />
              </linearGradient>
            </defs>
            <circle cx="140" cy="140" r={R} className="qt-track" />
            <circle cx="140" cy="140" r={R} className="qt-fill" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
          </svg>
          <div className="qt-read">
            <span className="qt-label">{label}</span>
            <span className="qt-digits">{mode === 'stopwatch' ? fmtClock(Math.floor(ms / 1000) * 1000) : fmtClock(ms)}</span>
            {mode !== null && mode !== 'stopwatch' && <span className="qt-total">of {fmtClock(total)}</span>}
          </div>
        </div>

        <div className="qt-presets">
          {[30, 60, 90, 120, 180].map((sec) => (
            <button key={sec} className={mode === sec ? 'on' : ''} onClick={() => start(sec)}>
              {sec < 60 ? `${sec}s` : `${sec / 60} min`}
            </button>
          ))}
          <button className={mode === 'stopwatch' ? 'on' : ''} onClick={() => start('stopwatch')}>
            Stopwatch
          </button>
        </div>

        <div className="qt-controls">
          <button className="qt-side" onClick={() => mode !== null && start(mode)} disabled={mode === null} aria-label="Restart">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            className="qt-main"
            onClick={() => (mode === null ? start(60) : done ? start(mode) : setRunning(!running))}
            aria-label={running ? 'Pause' : 'Start'}
          >
            {running ? (
              <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
                <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
              </svg>
            ) : (
              <Icon name="play" size={30} />
            )}
          </button>
          <button className="qt-side" onClick={addTime} disabled={mode === null || mode === 'stopwatch'} aria-label="Add 15 seconds">
            +15s
          </button>
        </div>
      </div>
    </div>
  )
}
