import { useMemo, useState } from 'react'
import { Avatar, Chips, Empty, PageHead, Segmented, WorkoutCard } from '../components/ui'
import { EQUIPMENT } from '../data/exercises'
import { FORMATS } from '../data/workouts'
import { go, useStore } from '../store'
import { workoutEquipment } from '../lib/utils'

const SOURCES = ['Gym', 'Kettlebell', 'Bodyweight', 'Community']

export default function Library({ sub }) {
  const tab = sub === 'coaches' ? 'coaches' : 'workouts'
  return (
    <div className="page">
      <PageHead title="Library" />
      <Segmented
        options={[
          ['workouts', 'Workouts'],
          ['coaches', 'Coaches'],
        ]}
        value={tab}
        onChange={(v) => go(v === 'coaches' ? 'library/coaches' : 'library')}
      />
      {tab === 'coaches' ? <Coaches /> : <Workouts initialPrice={sub === 'premium' ? 'premium' : null} />}
    </div>
  )
}

export function Workouts({ initialPrice }) {
  const { workouts } = useStore()
  const [q, setQ] = useState('')
  const [price, setPrice] = useState(initialPrice)
  const [source, setSource] = useState(null)
  const [format, setFormat] = useState(null)
  const [equip, setEquip] = useState(null)

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return workouts
      .filter((w) => !price || (price === 'premium' ? w.premium : !w.premium))
      .filter((w) => !source || w.category === source)
      .filter((w) => !format || w.parts.some((p) => p.format === format))
      .filter((w) => !equip || workoutEquipment(w).includes(equip))
      .filter((w) => !needle || `${w.name} ${w.description} ${w.focus}`.toLowerCase().includes(needle))
      .sort((a, b) => (a.official === b.official ? new Date(b.createdAt) - new Date(a.createdAt) : a.official ? -1 : 1))
  }, [workouts, q, price, source, format, equip])

  return (
    <>
      <input className="search" type="search" placeholder="Search workouts" value={q} onChange={(e) => setQ(e.target.value)} />
      <Chips
        options={[
          ['free', 'Free'],
          ['premium', '★ Premium'],
        ]}
        value={price}
        onChange={setPrice}
        all="Free & paid"
      />
      <Chips options={SOURCES} value={source} onChange={setSource} />
      <Chips options={Object.entries(FORMATS).filter(([k]) => k !== 'timed')} value={format} onChange={setFormat} all="Any format" />
      <Chips options={EQUIPMENT} value={equip} onChange={setEquip} all="Any equipment" />
      {list.length === 0 ? (
        <Empty icon="search" title="No workouts match">
          Try clearing a filter.
        </Empty>
      ) : (
        <div className="grid">
          {list.map((w) => (
            <WorkoutCard key={w.id} w={w} />
          ))}
        </div>
      )}
    </>
  )
}

export function Coaches() {
  const { db, workouts } = useStore()
  const coaches = Object.values(db.users).filter((u) => u.role === 'coach')
  if (!coaches.length) return <Empty icon="users" title="No coaches yet" />
  return (
    <div className="grid">
      {coaches.map((c) => {
        const theirs = workouts.filter((w) => w.authorId === c.id)
        const clients = db.coaching.filter((l) => l.coachId === c.id && l.status === 'active').length
        return (
          <button key={c.id} className="card coach-card" onClick={() => go(`coach/${c.id}`)}>
            <Avatar user={c} size={72} />
            <span className="display coach-name">{c.name}</span>
            {c.specialties && <span className="muted small">{c.specialties}</span>}
            <span className="row gap-s small coach-meta">
              <span>{theirs.filter((w) => !w.premium).length} free</span>·<span>{theirs.filter((w) => w.premium).length} premium</span>·
              <span>
                {clients} client{clients === 1 ? '' : 's'}
              </span>
            </span>
            {c.coachPrice && <span className="price-tag paid static">Coaching {c.coachPrice}</span>}
          </button>
        )
      })}
    </div>
  )
}

