import { useEffect, useState } from 'react'
import { go, useStore } from '../store'
import { clearSession, loadSession, onSessionChange } from '../lib/activeSession'
import { fmtClock } from '../lib/utils'
import Icon from './Icon'

// "Workout in progress" bar shown around the app while a part is unfinished
export default function ActiveWorkoutBanner({ route }) {
  const { me, workouts } = useStore()
  const [session, setSession] = useState(loadSession)
  useEffect(() => onSessionChange(() => setSession(loadSession())), [])

  const owner = me?.id || 'solo'
  if (!session || session.owner !== owner || session.state.phase === 'done') return null
  const [head, a, b, , d] = route
  if (head === 'w' && a === session.workoutId && b === 'p' && d === 'play') return null // already in it
  const w = workouts.find((x) => x.id === session.workoutId)
  if (!w) return null

  return (
    <div className="aw-banner" role="status">
      <Icon name="timer" size={20} />
      <button className="aw-banner-main" onClick={() => go(`w/${session.workoutId}/p/${session.idx}/play`)}>
        <strong>Workout in progress</strong>
        <span>
          {session.workoutName} · {session.partName} · {fmtClock(session.state.elapsed)}
          {session.state.paused ? ' · paused' : ''}
        </span>
      </button>
      <button className="btn btn-primary small" onClick={() => go(`w/${session.workoutId}/p/${session.idx}/play`)}>
        Resume
      </button>
      <button
        className="icon-btn small"
        aria-label="Discard the workout in progress"
        onClick={() => {
          if (confirm('Discard this workout in progress? Sets you logged in this part will be lost.')) clearSession()
        }}
      >
        <Icon name="plus" className="rot45" size={18} />
      </button>
    </div>
  )
}
