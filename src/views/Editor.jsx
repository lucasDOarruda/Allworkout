import { useState } from 'react'
import { ImagePicker, PageHead, SignInPrompt } from '../components/ui'
import ExercisePicker from '../components/ExercisePicker'
import { MuscleThumb } from '../components/BodyMap'
import { exerciseById } from '../data/exercises'
import { FOCUSES, FORMATS, LEVELS } from '../data/workouts'
import { go, isCoach, useStore } from '../store'
import { partMinutes, uid } from '../lib/utils'

const blankMove = () => ({ exerciseId: '', name: '', sets: 3, reps: '10', rest: 60, note: '', video: '', image: null })
const blankPart = (name = 'Part 1', format = 'sets') => ({
  id: uid('p'),
  name,
  format,
  rounds: 3,
  work: 40,
  rest: 20,
  minutes: 10,
  overview: '',
  howTo: '',
  moves: [blankMove()],
})

export default function Editor({ id }) {
  const { me, workouts, actions, notify } = useStore()
  const existing = id ? workouts.find((w) => w.id === id) : null

  const [f, setF] = useState(() =>
    existing
      ? structuredClone({ ...existing, likes: undefined })
      : {
          name: '',
          description: '',
          level: 'Beginner',
          focus: 'Full body',
          cover: null,
          parts: [blankPart('Warmup', 'timed'), blankPart('Part 1', 'emom')],
          premium: false,
          price: '',
          payLink: me?.payLink || '',
          // Members' workouts are just for them; trainers choose
          private: !isCoach(me),
        },
  )
  const [errors, setErrors] = useState([])
  const [picking, setPicking] = useState(null) // { pi, mi } while the exercise picker is open
  const coach = isCoach(me)

  if (!me) {
    return (
      <div className="page narrow">
        <PageHead title="Create" back />
        <SignInPrompt text="Sign in to create workouts." />
      </div>
    )
  }
  if (existing && existing.authorId !== me.id) {
    return (
      <div className="page narrow">
        <p>You can only edit your own workouts.</p>
      </div>
    )
  }

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const setPart = (pi, patch) => setF((p) => ({ ...p, parts: p.parts.map((x, j) => (j === pi ? { ...x, ...patch } : x)) }))
  const setMove = (pi, mi, patch) =>
    setF((p) => ({
      ...p,
      parts: p.parts.map((x, j) => (j === pi ? { ...x, moves: x.moves.map((mv, k) => (k === mi ? { ...mv, ...patch } : mv)) } : x)),
    }))
  const swap = (arr, i, d) => {
    const j = i + d
    if (j < 0 || j >= arr.length) return arr
    const next = [...arr]
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  }

  const pickExercise = (pi, mi, value) => {
    if (value === '__custom') return setMove(pi, mi, { exerciseId: null, name: '', video: '' })
    const ex = exerciseById[value]
    setMove(pi, mi, { exerciseId: ex.id, name: ex.name, video: ex.video })
  }

  // Only trainers can sell, and never a private workout
  const paid = coach && !f.private && f.premium

  const validate = () => {
    const errs = []
    if (!f.name.trim()) errs.push('Add a name.')
    const moves = f.parts.flatMap((p) => p.moves.filter((m) => m.name.trim()))
    if (moves.length === 0) errs.push('Add at least one move.')
    const badVideo = f.parts.flatMap((p) => p.moves).find((m) => m.video.trim() && !/^https?:\/\//i.test(m.video.trim()))
    if (badVideo) errs.push(`The video link for “${badVideo.name || 'a move'}” must start with https://`)
    if (paid) {
      if (!f.price.trim()) errs.push('Add a price for your premium workout.')
      if (!/^https?:\/\//.test(f.payLink.trim())) errs.push('Add a payment link starting with https://')
      if (moves.length < 3) errs.push('Premium workouts need at least 3 moves (buyers preview the first 2).')
    }
    return errs
  }

  const publish = (e) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (errs.length) return window.scrollTo({ top: 0, behavior: 'smooth' })
    const w = {
      id: existing?.id,
      name: f.name.trim(),
      description: f.description.trim(),
      level: f.level,
      focus: f.focus,
      cover: f.cover,
      parts: f.parts
        .map((p, i) => ({
          ...p,
          name: p.name.trim() || `Part ${i + 1}`,
          rounds: Math.max(1, Number(p.rounds) || 1),
          work: Math.max(5, Number(p.work) || 30),
          rest: Math.max(0, Number(p.rest) || 0),
          minutes: Math.max(1, Number(p.minutes) || 1),
          overview: p.overview.trim(),
          howTo: p.howTo.trim(),
          moves: p.moves
            .filter((m) => m.name.trim())
            .map((m) => ({
              ...m,
              name: m.name.trim(),
              sets: p.format === 'sets' ? Math.max(1, Number(m.sets) || 1) : 1,
              rest: p.format === 'sets' ? Math.max(0, Number(m.rest) || 0) : 0,
              reps: String(m.reps || '').trim() || '10',
              note: m.note.trim(),
              video: m.video.trim(),
            })),
        }))
        .filter((p) => p.moves.length > 0),
      premium: paid,
      price: paid ? f.price.trim() : '',
      payLink: paid ? f.payLink.trim() : '',
      private: !coach || !!f.private,
    }
    try {
      const newId = actions.saveWorkout(w)
      notify(existing ? 'Workout updated' : w.private ? 'Saved! Find it under Explore → Mine.' : 'Published! It’s now in the library.')
      go(`w/${newId}`)
    } catch {
      notify('Couldn’t save. Try smaller images.', 'error')
    }
  }

  return (
    <form className="page narrow editor" onSubmit={publish}>
      <PageHead title={existing ? 'Edit workout' : coach ? 'Create' : 'Create my workout'} back />
      {!coach && <p className="muted small">Build your own workout. It’s private: only you can see it, unless you share it with friends.</p>}

      {errors.length > 0 && (
        <div className="card error-card" role="alert">
          {errors.map((e) => (
            <p key={e}>⚠ {e}</p>
          ))}
        </div>
      )}

      <section className="card stack">
        <ImagePicker value={f.cover} onChange={(v) => set('cover', v)} label="Cover image" />
        <label className="field">
          <span>Name</span>
          <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Full Body Sweat Starter" maxLength={60} />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Who is it for? What will it feel like?" maxLength={400} />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Level</span>
            <select value={f.level} onChange={(e) => set('level', e.target.value)}>
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Focus</span>
            <select value={f.focus} onChange={(e) => set('focus', e.target.value)}>
              {FOCUSES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {f.parts.map((p, pi) => (
        <section key={p.id || pi} className="card stack part-editor">
          <div className="row between">
            <input className="part-name display" value={p.name} onChange={(e) => setPart(pi, { name: e.target.value })} aria-label="Part name" maxLength={30} />
            <span className="row gap-xs">
              <button type="button" className="icon-btn" disabled={pi === 0} onClick={() => set('parts', swap(f.parts, pi, -1))} aria-label="Move part up">
                ↑
              </button>
              <button type="button" className="icon-btn" disabled={pi === f.parts.length - 1} onClick={() => set('parts', swap(f.parts, pi, 1))} aria-label="Move part down">
                ↓
              </button>
              <button type="button" className="icon-btn" disabled={f.parts.length === 1} onClick={() => set('parts', f.parts.filter((_, j) => j !== pi))} aria-label="Remove part">
                ✕
              </button>
            </span>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Format</span>
              <select value={p.format} onChange={(e) => setPart(pi, { format: e.target.value })}>
                {Object.entries(FORMATS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {k === 'timed' ? 'Timed block (warmup)' : v}
                  </option>
                ))}
              </select>
            </label>
            {p.format === 'circuit' && (
              <>
                <NumField label="Work (s)" value={p.work} onChange={(v) => setPart(pi, { work: v })} min={5} />
                <NumField label="Rest (s)" value={p.rest} onChange={(v) => setPart(pi, { rest: v })} />
                <NumField label="Rounds" value={p.rounds} onChange={(v) => setPart(pi, { rounds: v })} min={1} />
              </>
            )}
            {p.format === 'emom' && <NumField label="Rounds" value={p.rounds} onChange={(v) => setPart(pi, { rounds: v })} min={1} />}
            {(p.format === 'amrap' || p.format === 'timed') && <NumField label="Minutes" value={p.minutes} onChange={(v) => setPart(pi, { minutes: v })} min={1} />}
          </div>
          <p className="muted small">
            ≈ {partMinutes({ ...p, rounds: Number(p.rounds) || 1, minutes: Number(p.minutes) || 1 })} min
            {p.format === 'emom' && ' · each minute is the next move; one round = one pass through the list'}
            {p.format === 'tabata' && ' · each move gets 8 × 20 s on / 10 s off'}
          </p>
          <label className="field">
            <span>Overview</span>
            <textarea rows={2} value={p.overview} onChange={(e) => setPart(pi, { overview: e.target.value })} placeholder="What’s this part about?" maxLength={400} />
          </label>
          <label className="field">
            <span>How to (optional)</span>
            <textarea rows={2} value={p.howTo} onChange={(e) => setPart(pi, { howTo: e.target.value })} placeholder="Leave blank for the standard explanation" maxLength={400} />
          </label>

          {p.moves.map((m, mi) => (
            <div key={mi} className="move-editor stack">
              <div className="row between">
                <span className="label">Move {mi + 1}</span>
                <span className="row gap-xs">
                  <button type="button" className="icon-btn small" disabled={mi === 0} onClick={() => setPart(pi, { moves: swap(p.moves, mi, -1) })} aria-label="Move up">
                    ↑
                  </button>
                  <button type="button" className="icon-btn small" disabled={mi === p.moves.length - 1} onClick={() => setPart(pi, { moves: swap(p.moves, mi, 1) })} aria-label="Move down">
                    ↓
                  </button>
                  <button type="button" className="icon-btn small" disabled={p.moves.length === 1} onClick={() => setPart(pi, { moves: p.moves.filter((_, k) => k !== mi) })} aria-label="Remove move">
                    ✕
                  </button>
                </span>
              </div>
              <div className="move-editor-grid">
                <ImagePicker value={m.image} onChange={(v) => setMove(pi, mi, { image: v })} label="Image" />
                <div className="stack grow">
                  <button type="button" className="xp-current" onClick={() => setPicking({ pi, mi })}>
                    {m.exerciseId ? <MuscleThumb exerciseId={m.exerciseId} size={44} /> : <span className="xp-plus">＋</span>}
                    <span className="grow">
                      <span className="strong block">{m.exerciseId ? exerciseById[m.exerciseId]?.name : m.exerciseId === null ? 'My own exercise' : 'Choose an exercise'}</span>
                      <span className="tiny">
                        {m.exerciseId ? `${exerciseById[m.exerciseId]?.equipment} · ${exerciseById[m.exerciseId]?.muscles.join(', ')}` : 'Kettlebell, barbell, dumbbell, machine or bodyweight'}
                      </span>
                    </span>
                    <span className="chev-right">›</span>
                  </button>
                  {m.exerciseId !== '' && (
                    <input value={m.name} onChange={(e) => setMove(pi, mi, { name: e.target.value })} placeholder="Name shown, e.g. Front Rack Squat (L)" maxLength={50} aria-label="Move name" />
                  )}
                </div>
              </div>
              <div className="field-row">
                {p.format === 'sets' && <NumField label="Sets" value={m.sets} onChange={(v) => setMove(pi, mi, { sets: v })} min={1} />}
                <label className="field">
                  <span>{p.format === 'sets' ? 'Reps' : 'Target'}</span>
                  <input value={m.reps} onChange={(e) => setMove(pi, mi, { reps: e.target.value })} placeholder="10, 30s, max" maxLength={20} />
                </label>
                {p.format === 'sets' && <NumField label="Rest (s)" value={m.rest} onChange={(v) => setMove(pi, mi, { rest: v })} />}
              </div>
              <div className="field-row">
                <label className="field grow2">
                  <span>How-to video link</span>
                  <input type="url" value={m.video} onChange={(e) => setMove(pi, mi, { video: e.target.value })} placeholder="https://youtube.com/watch?v=…" />
                </label>
                <label className="field grow2">
                  <span>Trainer note</span>
                  <input value={m.note} onChange={(e) => setMove(pi, mi, { note: e.target.value })} placeholder="e.g. Slow on the way down" maxLength={120} />
                </label>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-secondary" onClick={() => setPart(pi, { moves: [...p.moves, blankMove()] })}>
            + Add move
          </button>
        </section>
      ))}
      <button type="button" className="btn btn-ghost full" onClick={() => set('parts', [...f.parts, blankPart(`Part ${f.parts.length}`, 'circuit')])}>
        + Add part
      </button>

      {coach && (
        <section className="card stack">
          <span className="label">Who can see it</span>
          <label className="check">
            <input type="radio" name="visibility" checked={!f.private} onChange={() => set('private', false)} />
            <span>
              <span className="strong">Publish to the library</span>
              <span className="muted small block">Members can find it, follow it and buy it if it’s paid.</span>
            </span>
          </label>
          <label className="check">
            <input type="radio" name="visibility" checked={!!f.private} onChange={() => set('private', true)} />
            <span>
              <span className="strong">Just for me</span>
              <span className="muted small block">Private. You can still share it with friends.</span>
            </span>
          </label>
        </section>
      )}

      {coach && !f.private && (
      <section className="card stack premium-box">
        <label className="check">
          <input type="checkbox" checked={f.premium} onChange={(e) => set('premium', e.target.checked)} />
          <span>
            <span className="strong">Make this a paid workout</span>
            <span className="muted small block">Buyers see the first two moves. You unlock it for them after they pay.</span>
          </span>
        </label>
        {f.premium && (
          <div className="field-row">
            <label className="field">
              <span>Price</span>
              <input value={f.price} onChange={(e) => set('price', e.target.value)} placeholder="$9" maxLength={12} />
            </label>
            <label className="field grow2">
              <span>Payment link (Stripe, PayPal, Ko-fi…)</span>
              <input type="url" value={f.payLink} onChange={(e) => set('payLink', e.target.value)} placeholder="https://" />
            </label>
          </div>
        )}
      </section>
      )}

      <div className="sticky-cta">
        <button className="btn btn-primary big full">{existing ? 'Save changes' : f.private || !coach ? 'Save workout' : 'Publish workout'}</button>
      </div>

      {picking && (
        <ExercisePicker
          onClose={() => setPicking(null)}
          onPick={(ex) => {
            pickExercise(picking.pi, picking.mi, ex.id)
            setPicking(null)
          }}
          onCustom={() => {
            pickExercise(picking.pi, picking.mi, '__custom')
            setPicking(null)
          }}
        />
      )}
    </form>
  )
}

function NumField({ label, value, onChange, min = 0 }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" inputMode="numeric" min={min} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}
