import { useEffect, useState } from 'react'
import { Chips, MoveSheet } from '../components/ui'
import { MoveImage } from '../components/BodyMap'
import { EQUIPMENT, EXERCISES } from '../data/exercises'

// Which exercises have a photo, GIF or video. Tap one to add or change it.
export function ExerciseMediaAdmin() {
  const [have, setHave] = useState(null)
  const [filter, setFilter] = useState('missing')
  const [equip, setEquip] = useState(null)
  const [open, setOpen] = useState(null)
  const load = () =>
    import('../lib/media')
      .then((m) => m.listExerciseMedia())
      .then(setHave)
      .catch(() => setHave({}))
  useEffect(() => {
    load()
  }, [])

  if (!have) return <p className="muted">Loading exercises…</p>
  const done = EXERCISES.filter((x) => have[x.id]).length
  const rows = EXERCISES.filter((x) => (filter === 'missing' ? !have[x.id] : filter === 'done' ? have[x.id] : true)).filter((x) => !equip || x.equipment === equip)

  return (
    <>
      <p className="notice">
        Members see these in the workout player. {done} of {EXERCISES.length} exercises have a photo, GIF or video. Approved trainers can add media too.
      </p>
      <Chips
        options={[
          ['missing', `Missing (${EXERCISES.length - done})`],
          ['done', `Has media (${done})`],
        ]}
        value={filter}
        onChange={setFilter}
      />
      <Chips options={EQUIPMENT} value={equip} onChange={setEquip} all="Any equipment" />
      <section className="adm-panel">
        <ul className="adm-list">
          {rows.map((x) => (
            <li key={x.id}>
              <button className="adm-row-btn" onClick={() => setOpen(x)}>
                <MoveImage move={{ exerciseId: x.id }} size={40} />
                <span className="grow">
                  <span className="strong block">{x.name}</span>
                  <span className="tiny">
                    {x.equipment} · {x.muscles.join(', ')}
                  </span>
                </span>
                <span className={`crm-status ${have[x.id] ? 'online' : 'quiet'}`}>{have[x.id] ? (have[x.id].kind === 'link' ? 'video link' : have[x.id].kind) : 'add media'}</span>
              </button>
            </li>
          ))}
          {rows.length === 0 && <li className="muted small">Nothing here.</li>}
        </ul>
      </section>
      {open && (
        <MoveSheet
          move={{ exerciseId: open.id, name: open.name, video: open.video }}
          onClose={() => {
            setOpen(null)
            load()
          }}
        />
      )}
    </>
  )
}
