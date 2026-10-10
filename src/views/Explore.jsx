import { useState } from 'react'
import BodyMap, { MoveImage } from '../components/BodyMap'
import { Chips, MoveSheet, Segmented } from '../components/ui'
import { BACK_MUSCLES, EQUIPMENT, EXERCISES, FRONT_MUSCLES } from '../data/exercises'
import { OFFICIAL_PROGRAMS, programDays } from '../data/programs'
import { go, useStore } from '../store'
import { Coaches, Workouts } from './Library'

const TABS = [
  ['workouts', 'Workouts'],
  ['exercises', 'Exercises'],
  ['programs', 'Programs'],
  ['coaches', 'Coaches'],
]

export default function Explore({ sub }) {
  const tab = TABS.some(([k]) => k === sub) ? sub : 'workouts'
  return (
    <div className="page">
      <header className="app-head">
        <h1>Explore</h1>
      </header>
      <Segmented options={TABS} value={tab} onChange={(v) => go(v === 'workouts' ? 'explore' : `explore/${v}`)} />
      {tab === 'workouts' && <Workouts initialPrice={sub === 'premium' ? 'premium' : null} />}
      {tab === 'exercises' && <ExerciseTab />}
      {tab === 'programs' && <Programs />}
      {tab === 'coaches' && <Coaches />}
    </div>
  )
}

function ExerciseTab() {
  const [view, setView] = useState('front')
  const [q, setQ] = useState('')
  const [equip, setEquip] = useState(null)
  const [open, setOpen] = useState(null)
  const muscles = view === 'front' ? FRONT_MUSCLES : BACK_MUSCLES
  const needle = q.trim().toLowerCase()
  const list = EXERCISES.filter((e) => !equip || e.equipment === equip).filter(
    (e) => !needle || `${e.name} ${e.muscles.join(' ')}`.toLowerCase().includes(needle),
  )
  const pick = (m) => go(`exercises/m/${encodeURIComponent(m)}`)

  return (
    <>
      <section className="card map-card">
        <div className="map-card-figure">
          <BodyMap view={view} onPick={pick} compact />
        </div>
        <div className="map-card-side">
          <h2 className="card-h">Muscle groups</h2>
          <Segmented
            options={[
              ['front', 'Front'],
              ['back', 'Back'],
            ]}
            value={view}
            onChange={setView}
          />
          <div className="muscle-chips">
            {[...muscles, 'Cardio'].map((m) => (
              <button key={m} className="chip" onClick={() => pick(m)}>
                {m}
              </button>
            ))}
          </div>
          <button className="link-btn small" onClick={() => go('exercises/favorites')}>
            ★ Favourites
          </button>
        </div>
      </section>
      <input className="search" type="search" placeholder={`Search ${EXERCISES.length} exercises`} value={q} onChange={(e) => setQ(e.target.value)} />
      <Chips options={EQUIPMENT} value={equip} onChange={setEquip} all="Any equipment" />
      <div className="card list-card">
        {list.map((e) => (
          <button key={e.id} className="ex-row" onClick={() => setOpen(e)}>
            <MoveImage move={{ exerciseId: e.id }} size={52} />
            <span className="grow">
              <span className="strong block">{e.name}</span>
              <span className="muted small">
                {e.muscles.slice(0, 2).join(', ')} · {e.equipment}
              </span>
            </span>
            <span className="chev-right">›</span>
          </button>
        ))}
      </div>
      {open && <MoveSheet move={{ exerciseId: open.id, name: open.name }} onClose={() => setOpen(null)} />}
    </>
  )
}

function Programs() {
  const { db, me } = useStore()
  const en = db.enrollments[me?.id || 'solo']
  return (
    <div className="grid">
      {OFFICIAL_PROGRAMS.map((p) => {
        const days = programDays(p)
        const mine = en?.programId === p.id
        return (
          <button key={p.id} className="program-card" onClick={() => go(`program/${p.id}`)}>
            <span className="program-eyebrow">
              {p.weeks.length} weeks · {days.length} sessions · {p.level}
            </span>
            <span className="program-name">{p.name}</span>
            <span className="program-desc">{p.description}</span>
            {mine && (
              <span className="program-progress">
                <span style={{ width: `${(en.done.length / days.length) * 100}%` }} />
              </span>
            )}
            <span className="program-cta">{mine ? `Continue · ${en.done.length}/${days.length}` : 'View program ›'}</span>
          </button>
        )
      })}
    </div>
  )
}
