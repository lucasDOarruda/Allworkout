import { useState } from 'react'
import { Avatar } from '../components/ui'
import { go, useStore } from '../store'
import { primaryFormat } from '../lib/utils'

export const PENDING_KEY = 'all-workout:pending-session'

const toLocalInput = (d) => {
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

export function targetReps(reps) {
  const n = parseInt(reps, 10)
  return Number.isFinite(n) ? n : ''
}

// Shared "finish" form: used after a live session and for logging one done elsewhere.
export default function SessionForm({ workout, initial, mode }) {
  const { db, me, actions, notify } = useStore()
  const [rpe, setRpe] = useState(7)
  const [partnerIds, setPartnerIds] = useState([])
  const [note, setNote] = useState(initial?.note || '')
  const [when, setWhen] = useState(toLocalInput(new Date()))
  const [minutes, setMinutes] = useState(Math.max(1, Math.round((initial.duration || 0) / 60)))
  const [sets, setSets] = useState(initial.sets || [])
  const [rounds, setRounds] = useState(initial.rounds || 0)

  const fmt = primaryFormat(workout)
  const hasSets = sets.length > 0
  const partners = (me?.partners || []).map((id) => db.users[id]).filter(Boolean)
  const togglePartner = (id) => setPartnerIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const editSet = (i, patch) => setSets((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  const save = (e) => {
    e.preventDefault()
    const session = {
      workoutId: workout.id,
      workoutName: workout.name,
      format: fmt,
      date: mode === 'log' ? new Date(when).toISOString() : new Date().toISOString(),
      duration: Math.max(60, Number(minutes) * 60),
      rpe,
      note: note.trim(),
      partnerIds,
      sets: sets
        .filter((s) => Number(s.reps) > 0)
        .map((s) => ({ name: s.name, set: s.set, reps: Number(s.reps), kg: Number(s.kg) || 0 })),
      rounds: Number(rounds) || undefined,
    }
    if (!me) {
      try {
        localStorage.setItem(PENDING_KEY, JSON.stringify(session))
      } catch {
        /* ignore */
      }
      notify('Sign in and your session will be saved.')
      return go('signin')
    }
    actions.saveSession(session)
    notify(partnerIds.length ? 'Session saved for you and your partners' : 'Session saved')
    go('you/activities')
  }

  return (
    <form className="stack session-form" onSubmit={save}>
      {mode === 'log' && (
        <div className="field-row">
          <label className="field grow2">
            <span>When</span>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} max={toLocalInput(new Date())} />
          </label>
          <label className="field">
            <span>Minutes</span>
            <input type="number" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </label>
        </div>
      )}
      {mode === 'live' && (
        <label className="field">
          <span>Duration (minutes)</span>
          <input type="number" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>
      )}

      {(fmt === 'amrap' || Number(rounds) > 0) && (
        <label className="field">
          <span>Rounds completed</span>
          <input type="number" min={0} value={rounds} onChange={(e) => setRounds(e.target.value)} />
        </label>
      )}

      {hasSets && (
        <details className="card sets-table" open={mode === 'log'}>
          <summary className="strong">{sets.length} sets logged</summary>
          <table>
            <thead>
              <tr>
                <th>Move</th>
                <th>Set</th>
                <th>Reps</th>
                <th>kg</th>
              </tr>
            </thead>
            <tbody>
              {sets.map((s, i) => (
                <tr key={i}>
                  <td>{s.set === 1 || sets[i - 1]?.name !== s.name ? s.name : ''}</td>
                  <td className="muted">{s.set}</td>
                  <td>
                    <input aria-label={`${s.name} set ${s.set} reps`} type="number" min={0} value={s.reps} onChange={(e) => editSet(i, { reps: e.target.value })} />
                  </td>
                  <td>
                    <input aria-label={`${s.name} set ${s.set} kg`} type="number" min={0} step="0.5" value={s.kg} onChange={(e) => editSet(i, { kg: e.target.value })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      <div className="field">
        <span>How hard was it? ({rpe}/10)</span>
        <div className="rpe" role="radiogroup" aria-label="Effort from 1 to 10">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              type="button"
              key={n}
              role="radio"
              aria-checked={rpe === n}
              className={`rpe-btn ${rpe === n ? 'on' : ''}`}
              style={{ '--rpe': n }}
              onClick={() => setRpe(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <span className="muted tiny">1 = very easy · 10 = all-out</span>
      </div>

      {me && (
        <div className="field">
          <span>Trained with</span>
          {partners.length === 0 ? (
            <span className="muted small">Add training partners in the Me tab to tag them here.</span>
          ) : (
            <div className="chips">
              {partners.map((p) => (
                <button type="button" key={p.id} className={`chip ${partnerIds.includes(p.id) ? 'on' : ''}`} onClick={() => togglePartner(p.id)} aria-pressed={partnerIds.includes(p.id)}>
                  <Avatar user={p} size={18} /> {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <label className="field">
        <span>Note</span>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="How did it go?" maxLength={280} />
      </label>

      <button className="btn btn-primary big full">{me ? 'Save session' : 'Sign in to save'}</button>
    </form>
  )
}
