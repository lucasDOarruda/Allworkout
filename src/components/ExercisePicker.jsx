import { useEffect, useMemo, useRef, useState } from 'react'
import { EQUIPMENT, EXERCISES, MUSCLES } from '../data/exercises'
import { MoveImage } from './BodyMap'
import { Chips } from './ui'
import Icon from './Icon'

// Full-screen exercise chooser: search, filter by muscle and equipment, see what each works.
// With `multi`, tap several exercises and add them all at once (onPickMany).
export default function ExercisePicker({ onPick, onPickMany, onCustom, onClose, multi = false }) {
  const [q, setQ] = useState('')
  const [chosen, setChosen] = useState([])
  const [muscle, setMuscle] = useState(null)
  const [equip, setEquip] = useState(null)
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

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return EXERCISES.filter((x) => !muscle || x.muscles.includes(muscle))
      .filter((x) => !equip || x.equipment === equip)
      .filter((x) => !needle || `${x.name} ${x.equipment} ${x.muscles.join(' ')}`.toLowerCase().includes(needle))
  }, [q, muscle, equip])

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
        <p className="tiny">{list.length} exercises</p>
        <ul className="xp-list">
          {list.map((x) => (
            <li key={x.id}>
              <button
                type="button"
                className={`xp-row ${chosen.includes(x) ? 'on' : ''}`}
                aria-pressed={multi ? chosen.includes(x) : undefined}
                onClick={() => (multi ? setChosen((c) => (c.includes(x) ? c.filter((y) => y !== x) : [...c, x])) : onPick(x))}
              >
                <MoveImage move={{ exerciseId: x.id }} size={56} />
                <span className="grow">
                  <span className="strong block">{x.name}</span>
                  <span className="tiny">
                    {x.equipment} · {x.muscles.join(', ')}
                  </span>
                </span>
                {multi ? <span className={`xp-check ${chosen.includes(x) ? 'on' : ''}`}>{chosen.includes(x) ? chosen.indexOf(x) + 1 : '+'}</span> : <span className="chev-right">›</span>}
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="muted small">No exercises match. Try another filter or add your own.</li>}
        </ul>
        {multi ? (
          <button type="button" className="btn btn-primary big" disabled={!chosen.length} onClick={() => onPickMany(chosen)}>
            {chosen.length ? `Add ${chosen.length} exercise${chosen.length === 1 ? '' : 's'}` : 'Tap exercises to add them'}
          </button>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={onCustom}>
            + My own exercise (type a name)
          </button>
        )}
      </div>
    </div>
  )
}
