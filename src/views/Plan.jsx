import { useState } from 'react'
import { MoveImage } from '../components/BodyMap'
import { Avatar, Empty } from '../components/ui'
import { OFFICIAL_PROGRAMS, programDays } from '../data/programs'
import { go, useStore } from '../store'
import { programPhoto } from '../lib/photos'
import { workoutMinutes } from '../lib/utils'

// Plan tab: your program + what your coach assigned
export default function Plan() {
  const { db, me } = useStore()
  const en = db.enrollments[me?.id || 'solo']
  const program = en && OFFICIAL_PROGRAMS.find((p) => p.id === en.programId)
  return (
    <div className="page narrow">
      <header className="app-head">
        <h1>Plan</h1>
      </header>
      {me?.role === 'client' && <Assigned />}
      {program ? (
        <ProgramView program={program} />
      ) : (
        <>
          <Empty icon="calendar" title="No program yet">
            Pick a multi-week program and we’ll lay out every session for you.
          </Empty>
          {OFFICIAL_PROGRAMS.map((p) => (
            <button key={p.id} className="program-card" onClick={() => go(`program/${p.id}`)}>
              <span className="program-photo" style={{ backgroundImage: `url(${programPhoto(p)})` }} aria-hidden="true" />
              <span className="program-eyebrow">
                {p.weeks.length} weeks · {programDays(p).length} sessions · {p.level}
              </span>
              <span className="program-name">{p.name}</span>
              <span className="program-desc">{p.description}</span>
              <span className="program-cta">View program ›</span>
            </button>
          ))}
        </>
      )}
    </div>
  )
}

function Assigned() {
  const { db, me, workouts } = useStore()
  const link = db.coaching.find((c) => c.clientId === me.id && c.status === 'active')
  if (!link) return null
  const coach = db.users[link.coachId]
  const list = db.assignments.filter((a) => a.clientId === me.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return (
    <section className="card">
      <div className="row gap-s">
        <Avatar user={coach} size={36} />
        <h2 className="card-h grow">From {coach.name.split(' ')[0]}</h2>
      </div>
      {list.length === 0 && <p className="muted small">Nothing assigned yet.</p>}
      {list.map((a) => {
        const w = workouts.find((x) => x.id === a.workoutId)
        if (!w) return null
        const done = db.sessions.some((s) => s.workoutId === w.id && (s.userId === me.id || s.partnerIds?.includes(me.id)) && s.date > a.createdAt)
        return (
          <button key={a.id} className="day-row" onClick={() => go(`w/${w.id}`)}>
            <span className={`day-check ${done ? 'on' : ''}`}>{done ? '✓' : ''}</span>
            <span className="grow">
              <span className="strong block">{w.name}</span>
              <span className="muted small">{a.note || `${workoutMinutes(w)} min`}</span>
            </span>
            <span className="chev-right">›</span>
          </button>
        )
      })}
    </section>
  )
}

export function ProgramPage({ id }) {
  const program = OFFICIAL_PROGRAMS.find((p) => p.id === id)
  if (!program) return <Empty icon="info" title="Program not found" />
  return (
    <div className="page narrow">
      <ProgramView program={program} standalone />
    </div>
  )
}

function ProgramView({ program, standalone = false }) {
  const { db, me, workouts, actions, notify } = useStore()
  const en = db.enrollments[me?.id || 'solo']
  const enrolled = en?.programId === program.id
  const done = enrolled ? en.done : []
  const days = programDays(program)
  const next = days.find((d) => !done.includes(d.key))
  const [week, setWeek] = useState(next ? next.week : 0)
  const byId = Object.fromEntries(workouts.map((w) => [w.id, w]))

  const start = () => {
    if (!me) return go('signin')
    if (en && !enrolled && !confirm('Switch to this program? Progress in your current program will be lost.')) return
    actions.enroll(program.id)
    notify(`Started ${program.name}`)
    go('plan')
  }

  return (
    <>
      <section className="program-hero" style={{ backgroundImage: `linear-gradient(100deg, rgb(220 240 90 / 97%) 45%, rgb(205 232 60 / 55%)), url(${programPhoto(program)})` }}>
        {standalone && (
          <button className="icon-btn hero-back" onClick={() => history.back()} aria-label="Back">
            ‹
          </button>
        )}
        <span className="program-eyebrow">
          {program.weeks.length}-week program · {program.level}
        </span>
        <h1 className="program-title">{program.name}</h1>
        <p className="program-desc">{program.description}</p>
        {enrolled && (
          <>
            <div className="program-progress big">
              <span style={{ width: `${(done.length / days.length) * 100}%` }} />
            </div>
            <p className="small">
              {done.length} of {days.length} sessions done
            </p>
          </>
        )}
      </section>

      <div className="week-tabs" role="tablist">
        {program.weeks.map((_, i) => (
          <button key={i} role="tab" aria-selected={week === i} className={week === i ? 'on' : ''} onClick={() => setWeek(i)}>
            Week {i + 1}
          </button>
        ))}
      </div>

      <section className="card">
        {program.weeks[week].map((wid, di) => {
          const key = `${week}-${di}`
          const w = byId[wid]
          const isDone = done.includes(key)
          const isNext = enrolled && next?.key === key
          if (!w) return null
          return (
            <div key={key} className={`day-row ${isNext ? 'next' : ''}`}>
              <span className={`day-check ${isDone ? 'on' : ''}`}>{isDone ? '✓' : di + 1}</span>
              <button className="link-plain grow" onClick={() => go(`w/${w.id}`)}>
                <span className="tiny block">Day {di + 1}</span>
                <span className="strong block">{w.name}</span>
                <span className="muted small">
                  {workoutMinutes(w)} min · {w.focus}
                </span>
              </button>
              {isNext ? (
                <button className="btn btn-primary small" onClick={() => go(`w/${w.id}`)}>
                  Start
                </button>
              ) : (
                <MoveImage move={w.parts[w.parts.length - 1].moves[0]} size={44} />
              )}
            </div>
          )
        })}
      </section>

      {enrolled ? (
        <>
          {next ? (
            <button className="btn btn-primary big full" onClick={() => go(`w/${next.workoutId}`)}>
              Start day {days.indexOf(next) + 1}: {byId[next.workoutId]?.name}
            </button>
          ) : (
            <p className="center strong">Program complete. Nice work.</p>
          )}
          <button
            className="btn btn-ghost full leave-btn"
            onClick={() => {
              if (!confirm('Leave this program?')) return
              actions.leaveProgram()
            }}
          >
            Leave program
          </button>
        </>
      ) : (
        <button className="btn btn-primary big full" onClick={start}>
          Start program
        </button>
      )}
    </>
  )
}
