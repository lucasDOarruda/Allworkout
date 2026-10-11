import { useEffect, useMemo, useRef, useState } from 'react'
import { EQUIPMENT, EXERCISES, MUSCLES } from '../data/exercises'
import { useStore } from '../store'
import { MoveImage } from './BodyMap'
import { Chips, ImagePicker } from './ui'
import Icon from './Icon'

// A member's own exercise in the same shape as library ones (custom: true, photo instead of an id)
const asExercise = (c) => ({ id: c.id, name: c.name, equipment: c.equipment, muscles: [c.muscle], muscle: c.muscle, photo: c.photo, custom: true })

// Full-screen exercise chooser: search, filter by muscle and equipment, see what each works.
// With `multi`, tap several exercises and add them all at once (onPickMany).
// Members can also create their own exercise with a photo; it's saved for next time.
export default function ExercisePicker({ onPick, onPickMany, onCustom, onClose, multi = false }) {
  const { db, me, actions } = useStore()
  const [q, setQ] = useState('')
  const [chosen, setChosen] = useState([])
  const [muscle, setMuscle] = useState(null)
  const [equip, setEquip] = useState(null)
  const [creating, setCreating] = useState(false)
  const search = useRef(null)

  useEffect(() => {
    search.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const mine = useMemo(() => (db.customExercises || []).filter((c) => c.owner === me?.id).map(asExercise), [db.customExercises, me?.id])

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return [...mine, ...EXERCISES]
      .filter((x) => !muscle || x.muscles.includes(muscle))
      .filter((x) => !equip || x.equipment === equip)
      .filter((x) => !needle || `${x.name} ${x.equipment} ${x.muscles.join(' ')}`.toLowerCase().includes(needle))
  }, [q, muscle, equip, mine])

  const isChosen = (x) => chosen.some((c) => c.id === x.id)
  const toggle = (x) => setChosen((c) => (isChosen(x) ? c.filter((y) => y.id !== x.id) : [...c, x]))

  if (creating)
    return (
      <div className="contact-back" onClick={onClose}>
        <div className="contact-pop xp" role="dialog" aria-modal="true" aria-label="Create an exercise" onClick={(e) => e.stopPropagation()}>
          <CreateExercise
            initialName={q}
            onCancel={() => setCreating(false)}
            onCreate={(fields) => {
              const id = actions.addCustomExercise(fields)
              const ex = asExercise({ id, ...fields })
              setCreating(false)
              setQ('')
              if (multi) setChosen((c) => [...c, ex])
              else onPick(ex)
            }}
          />
        </div>
      </div>
    )

  return (
    <div className="contact-back" onClick={onClose}>
      <div className="contact-pop xp" role="dialog" aria-modal="true" aria-label="Choose an exercise" onClick={(e) => e.stopPropagation()}>
        <div className="contact-pop-head">
          <h2>Choose an exercise</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="plus" className="rot45" />
          </button>
        </div>
        <input ref={search} className="search" type="search" placeholder="Search exercises" value={q} onChange={(e) => setQ(e.target.value)} />
        <Chips options={EQUIPMENT} value={equip} onChange={setEquip} all="Any equipment" />
        <Chips options={MUSCLES} value={muscle} onChange={setMuscle} all="Any muscle" />
        <button type="button" className="btn btn-ghost xp-create" onClick={() => setCreating(true)}>
          <Icon name="plus" size={18} /> Create my own exercise{q.trim() ? ` “${q.trim()}”` : ''}
        </button>
        <p className="tiny">{list.length} exercises</p>
        <ul className="xp-list">
          {list.map((x) => (
            <li key={x.id}>
              <button
                type="button"
                className={`xp-row ${isChosen(x) ? 'on' : ''}`}
                aria-pressed={multi ? isChosen(x) : undefined}
                onClick={() => (multi ? toggle(x) : onPick(x))}
              >
                <MoveImage move={x.custom ? { image: x.photo, exerciseId: null } : { exerciseId: x.id }} size={56} />
                <span className="grow">
                  <span className="strong block">
                    {x.name} {x.custom && <span className="tag xp-yours">Yours</span>}
                  </span>
                  <span className="tiny">
                    {x.equipment} · {x.muscles.join(', ')}
                  </span>
                </span>
                {multi ? (
                  <span className={`xp-check ${isChosen(x) ? 'on' : ''}`}>{isChosen(x) ? chosen.findIndex((c) => c.id === x.id) + 1 : '+'}</span>
                ) : (
                  <span className="chev-right">›</span>
                )}
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="muted small">No exercises match. Create your own above.</li>}
        </ul>
        {multi ? (
          <button type="button" className="btn btn-primary big" disabled={!chosen.length} onClick={() => onPickMany(chosen)}>
            {chosen.length ? `Add ${chosen.length} exercise${chosen.length === 1 ? '' : 's'}` : 'Tap exercises to add them'}
          </button>
        ) : (
          onCustom && (
            <button type="button" className="btn btn-ghost" onClick={onCustom}>
              Just type a name instead
            </button>
          )
        )}
      </div>
    </div>
  )
}

// New exercise: name, photo, equipment and the main muscle it works
function CreateExercise({ initialName = '', onCreate, onCancel }) {
  const [name, setName] = useState(initialName.trim())
  const [photo, setPhoto] = useState(null)
  const [equipment, setEquipment] = useState('Bodyweight')
  const [muscle, setMuscle] = useState(null)
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) onCreate({ name: name.trim(), photo, equipment, muscle: muscle || 'Cardio' })
      }}
    >
      <div className="contact-pop-head">
        <h2>Create an exercise</h2>
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Back to the list">
          <Icon name="plus" className="rot45" />
        </button>
      </div>
      <label className="field">
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sandbag shoulder toss" maxLength={50} autoFocus />
      </label>
      <div className="field">
        <span>Photo (optional)</span>
        <ImagePicker value={photo} onChange={setPhoto} label="Photo" />
      </div>
      <div className="field">
        <span>Equipment</span>
        <Chips options={EQUIPMENT} value={equipment} onChange={(v) => setEquipment(v || 'Bodyweight')} all={null} />
      </div>
      <div className="field">
        <span>Main muscle</span>
        <Chips options={MUSCLES} value={muscle} onChange={setMuscle} all={null} />
      </div>
      <p className="tiny">It’s saved to your exercises, so you can pick it again next time. Only you can see it.</p>
      <div className="row gap-s">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Back
        </button>
        <button className="btn btn-primary grow" disabled={!name.trim()}>
          Create and add
        </button>
      </div>
    </form>
  )
}
