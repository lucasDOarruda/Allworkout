import { Suspense, lazy, useState } from 'react'
import { useStore } from '../store'
import { formCheckFor } from '../formcoach/exercises.js'
import Icon from './Icon'

// The camera code (and the pose model) only loads when someone opens a form check
const FormCoach = lazy(() => import('../formcoach/FormCoach'))

const ON_KEY = 'aw:formcoach-on'
const resultKey = (workoutId) => `aw:formcheck:${workoutId}`

export function formCheckOn() {
  try {
    return localStorage.getItem(ON_KEY) === '1'
  } catch {
    return false
  }
}

// Totals for this workout run, shown on the finish screen
function addResult(workoutId, t) {
  if (!workoutId || !t || t.good + t.bad === 0) return
  try {
    const prev = JSON.parse(sessionStorage.getItem(resultKey(workoutId)) || 'null') || { good: 0, bad: 0, faults: {} }
    const faults = { ...prev.faults }
    for (const [k, n] of Object.entries(t.faults)) faults[k] = (faults[k] || 0) + n
    sessionStorage.setItem(resultKey(workoutId), JSON.stringify({ good: prev.good + t.good, bad: prev.bad + t.bad, faults }))
  } catch {
    /* private mode */
  }
}
export function takeFormResult(workoutId, keep = true) {
  try {
    const v = JSON.parse(sessionStorage.getItem(resultKey(workoutId)) || 'null')
    if (!keep) sessionStorage.removeItem(resultKey(workoutId))
    return v
  } catch {
    return null
  }
}
export function formSummary(t) {
  if (!t || t.good + t.bad === 0) return ''
  const faults = Object.entries(t.faults || {})
    .sort((a, b) => b[1] - a[1])
    .map(([l, n]) => `${l} ×${n}`)
  return `Form check: ${t.good} good rep${t.good === 1 ? '' : 's'}, ${t.bad} no-rep${t.bad === 1 ? '' : 's'}${faults.length ? ` (${faults.join(', ')})` : ''}`
}

// "Check my form" for an exercise from the library. Members only; hidden when the exercise
// can't be judged by camera (runs, rowing, sleds...).
export function FormCheckButton({ exerciseId, formId, workoutId, label = 'Check my form', className = 'btn btn-ghost full' }) {
  const { me, notify } = useStore()
  const [open, setOpen] = useState(false)
  const fc = formId ? { id: formId } : formCheckFor(exerciseId)
  if (!me || !fc) return null
  return (
    <>
      <button
        type="button"
        className={`${className} fc-open`}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
      >
        <Icon name="camera" size={18} /> {label}
      </button>
      {open && (
        <Suspense fallback={<div className="fc fc-loading">Loading form check…</div>}>
          <FormCoach
            exerciseId={fc.id}
            onClose={(tally) => {
              setOpen(false)
              addResult(workoutId, tally)
              if (tally && tally.good + tally.bad) notify(formSummary(tally).replace('Form check: ', ''))
            }}
          />
        </Suspense>
      )}
    </>
  )
}

// Opt-in switch on the workout screen, next to Start
export function FormCheckToggle({ w, onChange }) {
  const { me } = useStore()
  const [on, setOn] = useState(formCheckOn)
  const supported = w.parts.some((p) => p.moves.some((m) => formCheckFor(m.exerciseId)))
  if (!me || !supported) return null
  return (
    <label className="check-row fc-toggle">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => {
          setOn(e.target.checked)
          try {
            localStorage.setItem(ON_KEY, e.target.checked ? '1' : '0')
          } catch {
            /* private mode */
          }
          onChange?.(e.target.checked)
        }}
      />
      <span>
        <Icon name="camera" size={16} /> Camera form check <span className="tiny">(squats, deadlifts, lunges, swings, wall balls)</span>
      </span>
    </label>
  )
}
