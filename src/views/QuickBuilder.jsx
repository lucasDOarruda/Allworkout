import { useState } from 'react'
import { PageHead } from '../components/ui'
import ExercisePicker from '../components/ExercisePicker'
import { MoveImage } from '../components/BodyMap'
import Icon from '../components/Icon'
import { exerciseById } from '../data/exercises'
import { go, isCoach, useStore } from '../store'
import { partMinutes, uid } from '../lib/utils'

// Quick workout builder: pick a style, tap the exercises, adjust with + and −, save.
// The full editor (cover, description, notes, paid workouts) stays one tap away.

const STYLES = [
  ['sets', 'Sets & reps', 'Classic gym sets with rest between them'],
  ['circuit', 'Circuit', 'Each exercise for a set time, round after round'],
  ['emom', 'EMOM', 'A new exercise every minute, on the minute'],
  ['amrap', 'AMRAP', 'As many rounds as you can in the time'],
]

const move = (ex, defaults) => ({
  key: uid('m'),
  exerciseId: ex.id,
  name: ex.name,
  video: ex.video,
  image: null,
  note: '',
  sets: defaults.sets,
  reps: defaults.reps,
})

function Stepper({ label, value, onChange, min = 1, max = 99, step = 1, suffix = '' }) {
  return (
    <div className="qb-step">
      <span className="tiny">{label}</span>
      <div className="qb-step-row">
        <button type="button" aria-label={`Less ${label.toLowerCase()}`} onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min}>
          −
        </button>
        <span className="qb-step-v">
          {value}
          {suffix}
        </span>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max}>
          +
        </button>
      </div>
    </div>
  )
}

function Presets({ label, options, value, onChange, fmt = (v) => v }) {
  return (
    <div className="qb-presets">
      <span className="tiny">{label}</span>
      <div className="row gap-xs wrap">
        {options.map((o) => (
          <button type="button" key={o} className={`chip ${value === o ? 'on' : ''}`} onClick={() => onChange(o)}>
            {fmt(o)}
          </button>
        ))}
      </div>
    </div>
  )
}

const secs = (s) => (s % 60 || s < 60 ? `${s}s` : `${s / 60} min`)

export default function QuickBuilder() {
  const { me, actions, notify } = useStore()
  const coach = isCoach(me)
  const [style, setStyle] = useState('sets')
  const [moves, setMoves] = useState([])
  const [picking, setPicking] = useState(false)
  const [name, setName] = useState('')
  const [warmup, setWarmup] = useState(true)
  const [publish, setPublish] = useState(false)
  // Style settings
  const [rest, setRest] = useState(90) // sets: rest between sets
  const [rounds, setRounds] = useState(3) // circuit and EMOM
  const [work, setWork] = useState(40) // circuit
  const [restC, setRestC] = useState(20) // circuit
  const [minutes, setMinutes] = useState(15) // AMRAP

  const defaults = style === 'sets' ? { sets: 3, reps: 10 } : { sets: 1, reps: 10 }
  const setMove = (key, patch) => setMoves((ms) => ms.map((m) => (m.key === key ? { ...m, ...patch } : m)))
  const shift = (i, d) =>
    setMoves((ms) => {
      const next = [...ms]
      ;[next[i], next[i + d]] = [next[i + d], next[i]]
      return next
    })

  // Build the workout in the same shape the player and editor use
  const build = () => {
    const main = {
      id: uid('p'),
      name: STYLES.find(([k]) => k === style)[1],
      format: style,
      rounds,
      work,
      rest: restC,
      minutes,
      overview: '',
      howTo: '',
      moves: moves.map((m) => ({
        exerciseId: m.exerciseId,
        name: m.name,
        video: m.video,
        image: null,
        note: '',
        sets: style === 'sets' ? m.sets : 1,
        reps: style === 'circuit' ? `${work}s` : String(m.reps),
        rest: style === 'sets' ? rest : 0,
      })),
    }
    const warm = {
      id: uid('p'),
      name: 'Warmup',
      format: 'timed',
      rounds: 1,
      work: 40,
      rest: 20,
      minutes: 5,
      overview: '2 easy rounds, then a few light reps of your first exercise.',
      howTo: '',
      moves: ['jumping-jack', 'air-squat', 'glute-bridge'].map((id) => ({ exerciseId: id, name: exerciseById[id].name, video: exerciseById[id].video, image: null, note: '', sets: 1, reps: '10', rest: 0 })),
    }
    return { parts: warmup ? [warm, main] : [main], main }
  }

  const { parts, main } = build()
  const minutesTotal = moves.length ? parts.reduce((a, p) => a + partMinutes(p), 0) : 0
  const hasStrength = moves.some((m) => ['Barbell', 'Dumbbell', 'Kettlebell', 'Machine'].includes(exerciseById[m.exerciseId]?.equipment))

  const save = (start) => {
    if (!moves.length) return
    const id = actions.saveWorkout({
      name: name.trim() || `My ${main.name.toLowerCase()} · ${new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`,
      description: '',
      level: 'Intermediate',
      focus: style === 'sets' && hasStrength ? 'Strength' : 'Conditioning',
      cover: null,
      parts,
      premium: false,
      price: '',
      payLink: '',
      private: !coach || !publish,
    })
    notify(start ? 'Saved. Let’s go!' : 'Workout saved')
    go(start ? `w/${id}/p/0` : `w/${id}`)
  }

  return (
    <div className="page narrow qb has-sticky">
      <PageHead title="Build a workout" back />

      <section className="card stack">
        <span className="label">1 · Style</span>
        <div className="qb-styles" role="radiogroup" aria-label="Workout style">
          {STYLES.map(([k, l, d]) => (
            <button type="button" key={k} role="radio" aria-checked={style === k} className={`qb-style ${style === k ? 'on' : ''}`} onClick={() => setStyle(k)}>
              <strong>{l}</strong>
              <span>{d}</span>
            </button>
          ))}
        </div>
        {style === 'sets' && <Presets label="Rest between sets" options={[30, 60, 90, 120, 180]} value={rest} onChange={setRest} fmt={secs} />}
        {style === 'circuit' && (
          <div className="qb-settings">
            <Stepper label="Rounds" value={rounds} onChange={setRounds} max={10} />
            <Presets label="Work" options={[20, 30, 40, 45, 60]} value={work} onChange={setWork} fmt={secs} />
            <Presets label="Rest" options={[10, 15, 20, 30]} value={restC} onChange={setRestC} fmt={secs} />
          </div>
        )}
        {style === 'emom' && <Stepper label="Rounds" value={rounds} onChange={setRounds} max={10} />}
        {style === 'amrap' && <Stepper label="Minutes" value={minutes} onChange={setMinutes} min={5} max={60} step={5} suffix=" min" />}
      </section>

      <section className="card stack">
        <div className="row between">
          <span className="label">2 · Exercises</span>
          {moves.length > 0 && <span className="tiny">{moves.length} added</span>}
        </div>
        {moves.length === 0 && <p className="muted small">Tap below to choose exercises. Pick as many as you like at once.</p>}
        <ul className="qb-moves">
          {moves.map((m, i) => (
            <li key={m.key} className="qb-move">
              <MoveImage move={m} size={52} />
              <div className="grow">
                <div className="row between">
                  <strong>{m.name}</strong>
                  <span className="qb-move-tools">
                    <button type="button" className="icon-btn small" disabled={i === 0} onClick={() => shift(i, -1)} aria-label={`Move ${m.name} up`}>
                      ↑
                    </button>
                    <button type="button" className="icon-btn small" disabled={i === moves.length - 1} onClick={() => shift(i, 1)} aria-label={`Move ${m.name} down`}>
                      ↓
                    </button>
                    <button type="button" className="icon-btn small" onClick={() => setMoves((ms) => ms.filter((x) => x.key !== m.key))} aria-label={`Remove ${m.name}`}>
                      ✕
                    </button>
                  </span>
                </div>
                {style === 'circuit' ? (
                  <p className="tiny">
                    {work}s on, {restC}s rest
                  </p>
                ) : (
                  <div className="row gap-s wrap">
                    {style === 'sets' && <Stepper label="Sets" value={m.sets} onChange={(v) => setMove(m.key, { sets: v })} max={10} />}
                    <Stepper label={style === 'emom' ? 'Reps each minute' : 'Reps'} value={m.reps} onChange={(v) => setMove(m.key, { reps: v })} max={100} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-secondary big" onClick={() => setPicking(true)}>
          <Icon name="plus" size={18} /> Add exercises
        </button>
      </section>

      <section className="card stack">
        <span className="label">3 · Finish</span>
        <label className="field">
          <span>Name (optional)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`My ${main.name.toLowerCase()}`} maxLength={60} />
        </label>
        <label className="check-row">
          <input type="checkbox" checked={warmup} onChange={(e) => setWarmup(e.target.checked)} />
          <span>Add a 5-minute warmup</span>
        </label>
        {coach && (
          <label className="check-row">
            <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
            <span>Publish to the library (otherwise it’s just for you)</span>
          </label>
        )}
        <button type="button" className="link-btn small" onClick={() => go('create/advanced')}>
          More options: cover image, description, notes{coach ? ', paid workouts' : ''} →
        </button>
      </section>

      <div className="sticky-cta">
        <div className="qb-summary">{moves.length ? `≈ ${minutesTotal} min · ${moves.length} exercise${moves.length === 1 ? '' : 's'}` : 'Add at least one exercise'}</div>
        <div className="cta-pair">
          <button type="button" className="btn btn-ghost big" disabled={!moves.length} onClick={() => save(false)}>
            Save
          </button>
          <button type="button" className="btn btn-primary big grow" disabled={!moves.length} onClick={() => save(true)}>
            Save & start
          </button>
        </div>
      </div>

      {picking && (
        <ExercisePicker
          multi
          onClose={() => setPicking(false)}
          onPickMany={(list) => {
            setMoves((ms) => [...ms, ...list.map((ex) => move(ex, defaults))])
            setPicking(false)
          }}
        />
      )}
    </div>
  )
}
