import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { MoveImage } from '../components/BodyMap'
import Icon from '../components/Icon'
import { Empty, Modal, MoveMedia, MoveSheet } from '../components/ui'
import { FORMATS } from '../data/workouts'
import { canAccess, go, useStore } from '../store'
import { beep, buildTimeline, fmtClock, fmtKg, isMuted, partMinutes, primaryFormat, repsLabel, setMuted, unlockAudio } from '../lib/utils'
import SessionForm, { targetReps } from './SessionForm'
import { DEFAULT_HOWTO } from './PartDetail'
import { FormCheckButton, formCheckOn, formSummary, takeFormResult } from '../components/FormCheck'

const COUNTDOWN = 10_000

// ---------- State machine ----------

function init(p) {
  return {
    p,
    timeline: buildTimeline(p),
    phase: 'countdown', // countdown → run → done
    remaining: COUNTDOWN, // ms left in the current timed segment, null when untimed
    paused: false,
    elapsed: 0,
    segIdx: 0,
    moveIdx: 0,
    setIdx: 0,
    resting: false,
    log: [],
    rounds: 0,
  }
}

function startRun(s) {
  const base = { ...s, phase: 'run' }
  if (s.p.format === 'sets') return { ...base, remaining: null }
  if (s.p.format === 'amrap' || s.p.format === 'timed') return { ...base, remaining: s.p.minutes * 60_000 }
  return { ...base, segIdx: 0, remaining: s.timeline[0].dur * 1000 }
}

function advance(s) {
  if (s.phase === 'countdown') return startRun(s)
  if (s.p.format === 'sets') return s.resting ? { ...s, resting: false, remaining: null } : s
  if (s.p.format === 'amrap' || s.p.format === 'timed') return { ...s, phase: 'done', remaining: null }
  const next = s.segIdx + 1
  if (next >= s.timeline.length) return { ...s, phase: 'done', remaining: null }
  return { ...s, segIdx: next, remaining: s.timeline[next].dur * 1000 }
}

function nextSet(s, withRest) {
  const mv = s.p.moves[s.moveIdx]
  let { moveIdx, setIdx } = s
  if (setIdx + 1 < mv.sets) setIdx++
  else {
    moveIdx++
    setIdx = 0
  }
  if (moveIdx >= s.p.moves.length) return { ...s, moveIdx, setIdx, phase: 'done', resting: false, remaining: null }
  const rest = Number(mv.rest) || 0
  if (withRest && rest > 0) return { ...s, moveIdx, setIdx, resting: true, remaining: rest * 1000 }
  return { ...s, moveIdx, setIdx, resting: false, remaining: null }
}

function reducer(s, a) {
  switch (a.type) {
    case 'tick': {
      if (s.paused || s.phase === 'done') return s
      const elapsed = s.phase === 'run' ? s.elapsed + a.dt : s.elapsed
      if (s.remaining == null) return { ...s, elapsed }
      const remaining = s.remaining - a.dt
      return remaining <= 0 ? advance({ ...s, elapsed, remaining: 0 }) : { ...s, elapsed, remaining }
    }
    case 'pause':
      return { ...s, paused: !s.paused }
    case 'skip':
      if (s.p.format === 'sets' && s.phase === 'run' && !s.resting) return nextSet(s, false)
      return advance(s)
    case 'repeat': {
      // restart the current interval (or go back one if it just started)
      if (s.phase !== 'run' || !s.timeline.length) return s
      const seg = s.timeline[s.segIdx]
      const fresh = s.remaining > seg.dur * 1000 - 2000
      const i = fresh ? Math.max(0, s.segIdx - 1) : s.segIdx
      return { ...s, segIdx: i, remaining: s.timeline[i].dur * 1000 }
    }
    case 'setDone': {
      const mv = s.p.moves[s.moveIdx]
      const entry = { name: mv.name, exerciseId: mv.exerciseId, set: s.setIdx + 1, reps: a.reps, kg: a.kg }
      return nextSet({ ...s, log: [...s.log, entry] }, true)
    }
    case 'addRest':
      return s.remaining == null ? s : { ...s, remaining: s.remaining + a.ms }
    case 'round':
      return { ...s, rounds: Math.max(0, s.rounds + a.d) }
    case 'finish':
      return { ...s, phase: 'done', remaining: null, resting: false }
    default:
      return s
  }
}

// ---------- Route component ----------

export default function Player({ id, idx }) {
  const { workouts, me } = useStore()
  const w = workouts.find((x) => x.id === id)
  const p = w?.parts[idx]
  if (!w || !p) return <Empty icon="info" title="Workout not found" />
  if (!canAccess(w, me)) return <Empty icon="lock" title="This workout is locked" />
  return <PlayerInner key={`${id}-${idx}`} w={w} p={p} idx={idx} />
}

function PlayerInner({ w, p, idx }) {
  const { db, me, actions, progressFor } = useStore()
  const [s, dispatch] = useReducer(reducer, p, init)
  const [sheet, setSheet] = useState(null)
  const [help, setHelp] = useState(false)
  const [muted, setMutedState] = useState(isMuted())
  const last = useRef(performance.now())
  const finished = useRef(false)

  // Clock
  useEffect(() => {
    unlockAudio()
    last.current = performance.now()
    const t = setInterval(() => {
      const now = performance.now()
      dispatch({ type: 'tick', dt: now - last.current })
      last.current = now
    }, 200)
    return () => clearInterval(t)
  }, [])

  // Keep the screen awake while training
  useEffect(() => {
    let lock
    navigator.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {})
    return () => lock?.release?.()
  }, [])

  // Countdown beeps for the last 3 seconds of any timed segment
  const secs = s.remaining == null ? null : Math.ceil(s.remaining / 1000)
  useEffect(() => {
    if (secs != null && secs <= 3 && secs > 0 && !s.paused) beep(660, 120)
  }, [secs]) // eslint-disable-line react-hooks/exhaustive-deps

  // Long beep whenever a new segment starts
  const seg = s.phase === 'run' && s.timeline.length ? s.timeline[s.segIdx] : null
  const marker = `${s.phase}|${s.segIdx}|${s.resting}|${s.moveIdx}`
  const first = useRef(true)
  useEffect(() => {
    if (first.current) return void (first.current = false)
    if (s.phase === 'done') return beep(1046, 600)
    const isRest = seg?.kind === 'rest' || s.resting
    beep(isRest ? 520 : 988, 380)
    navigator.vibrate?.(isRest ? 120 : [80, 60, 80])
  }, [marker]) // eslint-disable-line react-hooks/exhaustive-deps

  // Part finished: record it, then go to the next step
  useEffect(() => {
    if (s.phase !== 'done' || finished.current) return
    finished.current = true
    actions.completePart(w.id, idx, { duration: Math.round(s.elapsed / 1000), sets: s.log, rounds: s.rounds })
    const done = new Set([...(progressFor(w.id)?.done || []), idx])
    go(done.size >= w.parts.length ? `w/${w.id}/finish` : `w/${w.id}`)
  }, [s.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const exit = () => {
    if (s.elapsed > 30_000 && !confirm('Leave this part? Progress in this part won’t be saved.')) return
    go(`w/${w.id}/p/${idx}`)
  }
  const toggleMute = () => {
    setMuted(!muted)
    setMutedState(!muted)
  }

  const title = `${p.format === 'timed' ? p.name : FORMATS[p.format]} ${partMinutes(p)} min`
  const top = (
    <div className="player-top">
      <button className="icon-btn back-btn" onClick={exit} aria-label="Leave">
        <Svg d={ICONS.back} size={26} />
      </button>
      <span className="grow player-title">{title}</span>
      <button className="icon-btn" onClick={toggleMute} aria-label={muted ? 'Sound on' : 'Sound off'}>
        <Svg d={muted ? ICONS.soundOff : ICONS.soundOn} size={26} />
      </button>
      <button className="icon-btn help" onClick={() => setHelp(true)} aria-label="How this works">
        ?
      </button>
      {s.phase === 'run' && (
        <button className="link-btn end-btn" onClick={() => dispatch({ type: 'finish' })}>
          End
        </button>
      )}
    </div>
  )
  const overlays = (
    <>
      {sheet && <MoveSheet move={sheet} onClose={() => setSheet(null)} />}
      {help && (
        <Modal title="How to" onClose={() => setHelp(false)}>
          <p className="muted">{p.howTo || DEFAULT_HOWTO[p.format]}</p>
          <p className="muted small">Turn your sound on to hear the beeps. The last 3 seconds of every interval count down.</p>
          <button
            className="btn btn-danger full"
            onClick={() => {
              setHelp(false)
              dispatch({ type: 'finish' })
            }}
          >
            Finish this part now
          </button>
        </Modal>
      )}
    </>
  )

  if (s.phase === 'done') return <div className="player">{top}</div>

  // ---------- Countdown ----------
  if (s.phase === 'countdown') {
    const firstMove = p.moves[0]
    const upcoming = s.timeline.length ? upcomingRows(p, s.timeline, -1) : p.moves.slice(1, 5).map((mv, i) => ({ mv, label: rowLabel(p, mv, i + 1) }))
    return (
      <div className="player">
        {top}
        <StatusBar
          tone="ready"
          label="Get ready!"
          time={secs}
          pct={1 - s.remaining / COUNTDOWN}
          stats={[
            ['Part', p.name],
            ['Moves', p.moves.length],
            ['Length', `${partMinutes(p)} min`],
          ]}
        />
        <h2 className="now-line">Now: {nowLabel(p, firstMove)}</h2>
        <MoveMedia move={firstMove} />
        <NextList rows={upcoming} onSkip={() => dispatch({ type: 'skip' })} onOpen={setSheet} skipLabel="Start now" />
        <BottomBar paused={s.paused} onPause={() => dispatch({ type: 'pause' })} onSkip={() => dispatch({ type: 'skip' })} />
        {overlays}
      </div>
    )
  }

  // ---------- Sets & reps ----------
  if (p.format === 'sets') {
    const mv = p.moves[s.moveIdx]
    const totalSets = p.moves.reduce((a, m) => a + Number(m.sets), 0)
    const vol = s.log.reduce((a, x) => a + x.reps * x.kg, 0)
    const setStats = [
      ['Move', `${s.moveIdx + 1}/${p.moves.length}`],
      ['Sets', `${s.log.length}/${totalSets}`],
      ['Volume', fmtKg(vol)],
    ]
    const rows = []
    for (let i = s.moveIdx; i < p.moves.length && rows.length < 4; i++) {
      const from = i === s.moveIdx ? s.setIdx + 1 : 0
      for (let k = from; k < p.moves[i].sets && rows.length < 4; k++) rows.push({ mv: p.moves[i], label: `Set ${k + 1} of ${p.moves[i].sets}: ${repsLabel(p.moves[i].reps)}` })
    }
    return (
      <div className={`player ${s.resting ? 'resting' : ''}`}>
        {top}
        {s.resting ? (
          <StatusBar tone="rest" label="Rest" stats={setStats} time={fmtClock(s.remaining)} pct={1 - s.remaining / ((Number(p.moves[Math.max(0, s.setIdx === 0 ? s.moveIdx - 1 : s.moveIdx)].rest) || 1) * 1000)} />
        ) : (
          <StatusBar tone="work" label={`Set ${s.setIdx + 1} of ${mv.sets}`} stats={setStats} time={fmtClock(s.elapsed)} pct={(s.moveIdx + s.setIdx / mv.sets) / p.moves.length} />
        )}
        <h2 className="now-line">
          {s.resting ? 'Next' : 'Now'}: {repsLabel(mv.reps)} {mv.name}
        </h2>
        <div onClick={() => setSheet(mv)} role="button" tabIndex={0} className="media-btn">
          <MoveMedia move={mv} />
        </div>
        {formCheckOn() && <FormCheckButton exerciseId={mv.exerciseId} workoutId={w.id} label="Check this set with the camera" />}
        {s.resting ? (
          <div className="row gap-s action-row">
            <button className="btn btn-ghost big" onClick={() => dispatch({ type: 'addRest', ms: 15_000 })}>
              +15s
            </button>
            <button className="btn btn-primary big grow" onClick={() => dispatch({ type: 'skip' })}>
              Skip rest
            </button>
          </div>
        ) : (
          <SetLogger key={`${s.moveIdx}-${s.setIdx}`} p={p} s={s} db={db} me={me} onDone={(reps, kg) => dispatch({ type: 'setDone', reps, kg })} />
        )}
        <NextList rows={rows} onSkip={s.resting ? null : () => dispatch({ type: 'skip' })} onOpen={setSheet} skipLabel="Skip set" />
        <BottomBar paused={s.paused} onPause={() => dispatch({ type: 'pause' })} onSkip={s.resting ? () => dispatch({ type: 'skip' }) : null} />
        {overlays}
      </div>
    )
  }

  // ---------- AMRAP & timed blocks ----------
  if (p.format === 'amrap' || p.format === 'timed') {
    const total = p.minutes * 60_000
    return (
      <div className="player">
        {top}
        <StatusBar
          tone="work"
          label={p.format === 'amrap' ? `AMRAP / Round ${s.rounds + 1}` : p.name}
          time={fmtClock(s.remaining)}
          pct={1 - s.remaining / total}
          stats={[
            ['Elapsed', fmtClock(s.elapsed)],
            ['Rounds', s.rounds],
            ['Cap', `${p.minutes} min`],
          ]}
        />
        <h2 className="now-line">{p.format === 'amrap' ? 'Each round:' : 'Work through:'}</h2>
        <div className="card round-list">
          {p.moves.map((mv, i) => (
            <button key={i} className="minute-row" onClick={() => setSheet(mv)}>
              <MoveImage move={mv} size={64} />
              <span className="grow">
                <span className="minute-label">{repsLabel(mv.reps)}</span>
                <span className="muted block">{mv.name}</span>
              </span>
            </button>
          ))}
          {p.overview && <p className="muted small">{p.overview}</p>}
        </div>
        {p.format === 'amrap' ? (
          <div className="rounds">
            <button className="btn btn-ghost big" onClick={() => dispatch({ type: 'round', d: -1 })} aria-label="Remove a round">
              −
            </button>
            <div className="center">
              <div className="rounds-n">{s.rounds}</div>
              <div className="label">rounds</div>
            </div>
            <button className="btn btn-primary big grow" onClick={() => dispatch({ type: 'round', d: 1 })}>
              +1 round
            </button>
          </div>
        ) : (
          <button className="btn btn-primary big full" onClick={() => dispatch({ type: 'finish' })}>
            Done
          </button>
        )}
        <BottomBar paused={s.paused} onPause={() => dispatch({ type: 'pause' })} />
        {overlays}
      </div>
    )
  }

  // ---------- Circuit / EMOM / Tabata ----------
  const mv = p.moves[seg.moveIdx] || p.moves[0]
  const isRest = seg.kind === 'rest'
  const pct = 1 - s.remaining / (seg.dur * 1000)
  const leftMs = s.remaining + s.timeline.slice(s.segIdx + 1).reduce((a, x) => a + x.dur * 1000, 0)
  return (
    <div className={`player ${isRest ? 'resting' : ''}`}>
      {top}
      <StatusBar
        tone={isRest ? 'rest' : 'work'}
        label={seg.label}
        time={fmtClock(s.remaining)}
        pct={pct}
        stats={[
          ['Elapsed', fmtClock(s.elapsed)],
          ['Round', `${seg.round}/${p.format === 'tabata' ? 8 : p.rounds}`],
          ['Left', fmtClock(leftMs)],
        ]}
      />
      <Segments timeline={s.timeline} segIdx={s.segIdx} pct={pct} />
      <h2 className="now-line">
        {isRest ? 'Up next' : 'Now'}: {nowLabel(p, mv)}
      </h2>
      <div onClick={() => setSheet(mv)} role="button" tabIndex={0} className="media-btn">
        <MoveMedia move={mv} />
      </div>
      {formCheckOn() && <FormCheckButton exerciseId={mv.exerciseId} workoutId={w.id} label="Check this move with the camera" />}
      <NextList rows={upcomingRows(p, s.timeline, s.segIdx)} onSkip={() => dispatch({ type: 'skip' })} onOpen={setSheet} />
      <BottomBar
        paused={s.paused}
        onPause={() => dispatch({ type: 'pause' })}
        onRepeat={() => dispatch({ type: 'repeat' })}
        onSkip={() => dispatch({ type: 'skip' })}
      />
      {overlays}
    </div>
  )
}

// ---------- Pieces ----------

const Svg = ({ d, fill = false, size = 22 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <path d={d} fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const ICONS = {
  back: 'M15 5l-7 7 7 7',
  pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
  play: 'M7 4.5v15l12-7.5z',
  repeat: 'M4 10V8a3 3 0 0 1 3-3h12l-3-3M20 14v2a3 3 0 0 1-3 3H5l3 3',
  soundOn: 'M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7',
  soundOff: 'M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6',
  skip: 'M5 5v14l10-7zM16 5h3v14h-3z',
}

function nowLabel(p, mv) {
  if (p.format === 'circuit') return `${p.work} sec ${mv.name}`
  if (p.format === 'tabata') return `20 sec ${mv.name}`
  return `${repsLabel(mv.reps)} ${mv.name}`
}

function rowLabel(p, mv, i) {
  if (p.format === 'emom') return `Min ${i + 1}: ${repsLabel(mv.reps)}`
  return repsLabel(mv.reps)
}

function upcomingRows(p, timeline, from) {
  return timeline
    .slice(from + 1)
    .filter((x) => x.kind === 'work')
    .slice(0, 5)
    .map((x) => {
      const mv = p.moves[x.moveIdx]
      const label =
        p.format === 'emom'
          ? `Min ${x.minute}: ${repsLabel(mv.reps)}`
          : p.format === 'tabata'
            ? `Round ${x.round}: 20 sec`
            : `Round ${x.round}: ${x.dur} sec`
      return { mv, label }
    })
}

function StatusBar({ tone, label, time, pct, stats = [] }) {
  return (
    <section className={`live tone-${tone}`}>
      <div className="live-stats">
        {stats.map(([l, v]) => (
          <div key={l}>
            <span className="live-v">{v}</span>
            <span className="live-l">{l}</span>
          </div>
        ))}
      </div>
      <div className="live-label">{label}</div>
      <div className="live-time">{time}</div>
      <div className="live-bar">
        <span style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%` }} />
      </div>
    </section>
  )
}

function Segments({ timeline, segIdx, pct }) {
  const work = timeline.map((x, i) => ({ ...x, i })).filter((x) => x.kind === 'work')
  if (work.length > 80) return null
  return (
    <div className="segments" aria-hidden="true">
      {work.map((x) => {
        const state = x.i < segIdx ? 'done' : x.i === segIdx ? 'now' : ''
        return <span key={x.i} className={state} style={state === 'now' ? { '--p': pct } : undefined} />
      })}
    </div>
  )
}

function NextList({ rows, onSkip, onOpen, skipLabel = 'Skip' }) {
  if (!rows.length && !onSkip) return null
  return (
    <section className="next">
      <div className="row between">
        <h3 className="next-title">Next</h3>
        {onSkip && (
          <button className="link-btn muted-link" onClick={onSkip}>
            {skipLabel}
          </button>
        )}
      </div>
      {rows.length > 0 && (
        <div className="card round-list">
          {rows.map((r, i) => (
            <button key={i} className="minute-row" onClick={() => onOpen(r.mv)}>
              <MoveImage move={r.mv} size={64} />
              <span className="grow">
                <span className="minute-label">{r.label}</span>
                <span className="muted block">{r.mv.name}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function BottomBar({ paused, onPause, onRepeat, onSkip }) {
  return (
    <div className="bottombar">
      {onRepeat ? (
        <button className="sq-btn" onClick={onRepeat} aria-label="Repeat interval">
          <Svg d={ICONS.repeat} size={24} />
        </button>
      ) : (
        <span className="sq-spacer" />
      )}
      <button className="pause-btn" onClick={onPause} aria-label={paused ? 'Resume' : 'Pause'}>
        <Svg d={paused ? ICONS.play : ICONS.pause} fill size={30} />
      </button>
      {onSkip ? (
        <button className="sq-btn" onClick={onSkip} aria-label="Skip">
          <Svg d={ICONS.skip} fill size={24} />
        </button>
      ) : (
        <span className="sq-spacer" />
      )}
    </div>
  )
}

// Find the last weight used for this move: earlier in this session, else the user's history
function lastKg(s, db, me, mv) {
  const here = [...s.log].reverse().find((x) => x.name === mv.name)
  if (here) return here.kg
  if (!me) return ''
  const past = db.sessions
    .filter((x) => x.userId === me.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .flatMap((x) => x.sets || [])
    .find((x) => x.name === mv.name)
  return past ? past.kg : ''
}

function SetLogger({ p, s, db, me, onDone }) {
  const mv = p.moves[s.moveIdx]
  const [reps, setReps] = useState(targetReps(mv.reps))
  const [kg, setKg] = useState(() => lastKg(s, db, me, mv))
  const step = (setter, d) => setter((v) => Math.max(0, Math.round(((Number(v) || 0) + d) * 10) / 10))
  return (
    <div className="setlogger">
      <div className="steppers">
        <Stepper label="Reps" value={reps} onChange={setReps} onStep={(d) => step(setReps, d)} small={1} />
        <Stepper label="kg" value={kg} onChange={setKg} onStep={(d) => step(setKg, d)} small={2.5} step="0.5" />
      </div>
      <button className="btn btn-primary big full" onClick={() => onDone(Number(reps) || 0, Number(kg) || 0)}>
        ✓ Set done
      </button>
    </div>
  )
}

function Stepper({ label, value, onChange, onStep, small, step = '1' }) {
  return (
    <div className="stepper">
      <span className="label">{label}</span>
      <div className="row gap-xs">
        <button type="button" className="sq-btn sm" onClick={() => onStep(-small)} aria-label={`Less ${label}`}>
          −
        </button>
        <input type="number" inputMode="decimal" min={0} step={step} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
        <button type="button" className="sq-btn sm" onClick={() => onStep(small)} aria-label={`More ${label}`}>
          +
        </button>
      </div>
    </div>
  )
}

// ---------- Finish & log ----------

export function FinishWorkout({ id }) {
  const { workouts, progressFor } = useStore()
  const w = workouts.find((x) => x.id === id)
  const pr = progressFor(id)
  // Form check totals belong to this run: clear them once the session is saved
  useEffect(() => {
    if (pr?.saved) takeFormResult(id, false)
  }, [pr?.saved, id])
  if (!w) return <Empty icon="info" title="Workout not found" />
  if (!pr)
    return (
      <Empty icon="flag" title="Nothing to save yet">
        <button className="link-btn" onClick={() => go(`w/${id}`)}>
          Back to the workout
        </button>
      </Empty>
    )
  return (
    <div className="page narrow">
      <div className="done-hero">
        <div className="done-icon">
          <Icon name="check" size={34} strokeWidth={2.6} />
        </div>
        <h1 className="display">Workout complete</h1>
        <p className="muted">
          {w.name} · {fmtClock(pr.duration * 1000)}
          {pr.rounds ? ` · ${pr.rounds} rounds` : ''}
        </p>
      </div>
      {formSummary(takeFormResult(w.id)) && <p className="notice">{formSummary(takeFormResult(w.id))}</p>}
      {pr.saved ? (
        <button className="btn btn-primary big full" onClick={() => go('you/activities')}>
          Saved. See progress
        </button>
      ) : (
        <SessionForm workout={w} mode="live" initial={{ duration: pr.duration, sets: pr.sets, rounds: pr.rounds, note: formSummary(takeFormResult(w.id)) }} />
      )}
    </div>
  )
}

export function LogSession({ id }) {
  const { workouts, me } = useStore()
  const w = useMemo(() => workouts.find((x) => x.id === id), [workouts, id])
  if (!w) return <Empty icon="info" title="Workout not found" />
  if (!canAccess(w, me)) return <Empty icon="lock" title="This workout is locked" />
  const sets = w.parts
    .filter((p) => p.format === 'sets')
    .flatMap((p) => p.moves.flatMap((mv) => Array.from({ length: mv.sets }, (_, i) => ({ name: mv.name, set: i + 1, reps: targetReps(mv.reps) || 0, kg: '' }))))
  const minutes = w.parts.reduce((a, p) => a + partMinutes(p), 0)
  return (
    <div className="page narrow">
      <button className="link-btn" onClick={() => history.back()}>
        ‹ Back
      </button>
      <h1 className="display">Log a session</h1>
      <p className="muted">{w.name}: done somewhere else? Log it here so it counts.</p>
      <SessionForm workout={w} mode="log" initial={{ duration: minutes * 60, sets, rounds: 0, format: primaryFormat(w) }} />
    </div>
  )
}
