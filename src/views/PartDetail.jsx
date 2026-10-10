import { useState } from 'react'
import { MoveImage } from '../components/BodyMap'
import Icon from '../components/Icon'
import { Collapsible, Empty, FormatPill, MoveSheet, PageHead } from '../components/ui'
import { FORMATS } from '../data/workouts'
import { canAccess, go, useStore } from '../store'
import { partMinutes, partRounds, repsLabel } from '../lib/utils'

export const DEFAULT_HOWTO = {
  sets: 'Do the sets for each move in order. Log your reps and weight after each set; the rest timer starts on its own.',
  circuit: 'Work for the time shown, rest, then move to the next exercise. Repeat for all rounds.',
  emom: 'Every minute on the minute, do the reps for that minute’s move, then rest until the next minute starts.',
  amrap: 'Move through the list in order as many times as you can before time runs out. Tap +1 round each time.',
  tabata: '20 seconds all-out, 10 seconds rest, 8 rounds per move.',
  timed: 'Work through the list at your own pace until the timer runs out.',
}

export function moveRowLabel(p, mv, i) {
  switch (p.format) {
    case 'emom':
      return `Min ${i + 1}: ${repsLabel(mv.reps)}`
    case 'circuit':
      return `${p.work} sec`
    case 'tabata':
      return '8 × 20 sec'
    case 'sets':
      return `${mv.sets} × ${repsLabel(mv.reps)}`
    default:
      return repsLabel(mv.reps)
  }
}

export default function PartDetail({ id, idx }) {
  const { workouts, me, progressFor } = useStore()
  const [sheet, setSheet] = useState(null)
  const w = workouts.find((x) => x.id === id)
  const p = w?.parts[idx]
  if (!w || !p) return <Empty icon="info" title="Part not found" />
  if (!canAccess(w, me)) return <Empty icon="lock" title="This workout is locked" />
  const done = progressFor(w.id)?.done.includes(idx)

  return (
    <div className="page narrow has-sticky">
      <PageHead title={p.name} back={() => go(`w/${w.id}`)}>
        {done && <span className="accent strong">Completed</span>}
      </PageHead>

      <section className="card stat-trio">
        <div>
          <span className="label">
            <Icon name="timer" size={14} /> Duration
          </span>
          <span className="display stat-n">{partMinutes(p)} min</span>
        </div>
        <div>
          <span className="label">
            <Icon name="dumbbell" size={14} /> Exercises
          </span>
          <span className="display stat-n">{p.moves.length}</span>
        </div>
        <div>
          <span className="label">
            <Icon name="rounds" size={14} /> Rounds
          </span>
          <span className="display stat-n">{partRounds(p)}</span>
        </div>
      </section>

      <section className="card row between">
        <span className="display card-title">Type</span>
        <FormatPill format={p.format} />
      </section>

      <Collapsible title="How to">
        <p className="muted">{p.howTo || DEFAULT_HOWTO[p.format]}</p>
      </Collapsible>
      {p.overview && (
        <Collapsible title="Overview" defaultOpen>
          <p className="muted">{p.overview}</p>
        </Collapsible>
      )}

      <section className="card">
        <h2 className="card-title">
          {partMinutes(p)} min {FORMATS[p.format]}
          {p.format === 'emom' || p.format === 'circuit' ? <span className="muted small"> · repeat {p.rounds}×</span> : null}
        </h2>
        <ul className="minute-list">
          {p.moves.map((mv, i) => (
            <li key={i}>
              <button className="minute-row" onClick={() => setSheet(mv)}>
                <MoveImage move={mv} size={84} />
                <span className="grow">
                  <span className="display minute-label">{moveRowLabel(p, mv, i)}</span>
                  <span className="muted block">{mv.name}</span>
                  {mv.note && <span className="tiny block">{mv.note}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="sticky-cta">
        <button className="btn btn-primary big full" onClick={() => go(`w/${w.id}/p/${idx}/play`)}>
          {done ? 'Do it again' : 'Start'}
        </button>
      </div>
      {sheet && <MoveSheet move={sheet} onClose={() => setSheet(null)} />}
    </div>
  )
}
