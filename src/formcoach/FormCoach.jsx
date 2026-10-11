import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon'
import { CONNECTIONS, SKELETON_POINTS } from './poseMath.js'
import { computeMetrics } from './metrics.js'
import { CAMERA_SETUP, FORM_EXERCISES, formExerciseById } from './exercises.js'
import { createRepEngine } from './repEngine.js'

// Camera form check. Everything runs in the browser: the pose model finds 33 body points per
// frame, our rules judge each rep, and no video ever leaves the device.
//
// <FormCoach exerciseId="deadlift" voice debug={false} onRep={(rep) => …} onClose={(summary) => …} />

const BASE = new URL(import.meta.env.BASE_URL, location.href).href
const WASM = `${BASE}mediapipe/wasm`
const MODEL = `${BASE}models/pose_landmarker_lite.task`
const ACK_KEY = 'aw:formcoach-ack'
const COLORS = { idle: '#cfd2c4', good: '#4ade80', bad: '#f43f5e' }
const RESULT_MS = 700
const CUE_GAP_MS = 2500
const SETUP_MS = 1000

export default function FormCoach({ exerciseId, voice: voiceDefault = true, debug: debugDefault = false, onRep, onClose }) {
  const [exId, setExId] = useState(formExerciseById[exerciseId] ? exerciseId : 'squat')
  const ex = formExerciseById[exId]
  const [stage, setStage] = useState('intro') // intro | loading | setup | countdown | live | error
  const [error, setError] = useState('')
  const [acked, setAcked] = useState(() => {
    try {
      return localStorage.getItem(ACK_KEY) === '1'
    } catch {
      return false
    }
  })
  const [voice, setVoice] = useState(voiceDefault)
  const [debug, setDebug] = useState(debugDefault)
  const [hud, setHud] = useState({ reason: '', cue: '', count: 3, fps: 0, slow: false, info: null })
  const [tally, setTally] = useState({ good: 0, bad: 0, faults: {} })

  const video = useRef(null)
  const canvas = useRef(null)
  const stream = useRef(null)
  const landmarker = useRef(null)
  const raf = useRef(0)
  const live = useRef({}) // per-frame state that shouldn't re-render

  const speak = useCallback(
    (text) => {
      if (!voice || !('speechSynthesis' in window) || !text) return
      const L = live.current
      const now = performance.now()
      if (L.lastCue === text && now - L.lastCueAt < CUE_GAP_MS) return
      L.lastCue = text
      L.lastCueAt = now
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.rate = 1.05
      speechSynthesis.speak(u)
    },
    [voice],
  )

  // ---------- Start / stop ----------

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current)
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    try {
      landmarker.current?.close()
    } catch {
      /* already closed */
    }
    landmarker.current = null
    if ('speechSynthesis' in window) speechSynthesis.cancel()
  }, [])

  const start = async () => {
    setError('')
    setStage('loading')
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error(), { name: 'Insecure' })
      const camera = navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } })
      const model = loadModel()
      stream.current = await camera
      video.current.srcObject = stream.current
      await video.current.play()
      landmarker.current = await model
      live.current = { phase: 'setup', visibleSince: 0, engine: createRepEngine(ex), frames: 0, fpsSince: performance.now(), startedAt: performance.now() }
      setStage('setup')
      loop()
    } catch (err) {
      stop()
      setStage('error')
      setError(
        err?.name === 'NotAllowedError'
          ? 'Camera access was blocked. Allow the camera for this site in your browser settings, then try again.'
          : err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError'
            ? 'No camera was found on this device.'
            : err?.name === 'Insecure'
              ? 'The camera only works on a secure (https) page.'
              : 'The form check couldn’t start on this device. Try another browser, or update this one.',
      )
    }
  }

  async function loadModel() {
    const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision')
    const files = await FilesetResolver.forVisionTasks(WASM)
    const make = (delegate) =>
      PoseLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numPoses: 1 })
    try {
      return await make('GPU')
    } catch {
      return await make('CPU') // no WebGL: slower but works
    }
  }

  // ---------- Per-frame loop ----------

  function loop() {
    raf.current = requestAnimationFrame(loop)
    const v = video.current
    const L = live.current
    if (!v || !landmarker.current || v.readyState < 2 || v.currentTime === L.lastTime) return
    L.lastTime = v.currentTime
    const now = performance.now()
    let res
    try {
      res = landmarker.current.detectForVideo(v, now)
    } catch {
      return
    }
    const lms = res.landmarks?.[0]
    const metrics = computeMetrics(lms, res.worldLandmarks?.[0], { width: v.videoWidth, height: v.videoHeight, view: ex.view, needs: ex.needs })

    // Frame rate (fast moves like swings get missed below ~15 fps)
    L.frames++
    if (now - L.fpsSince >= 1000) {
      L.fps = Math.round((L.frames * 1000) / (now - L.fpsSince))
      L.frames = 0
      L.fpsSince = now
      L.slow = now - L.startedAt > 4000 && L.fps < 15
    }

    let color = COLORS.idle
    let cue = ''
    if (L.phase === 'setup') {
      // Wait until every joint the exercise needs has been visible for about a second
      if (metrics.ok) {
        L.visibleSince ||= now
        if (now - L.visibleSince >= SETUP_MS) {
          L.phase = 'countdown'
          L.countFrom = now
          setStage('countdown')
        }
      } else L.visibleSince = 0
    } else if (L.phase === 'countdown') {
      const left = 3 - Math.floor((now - L.countFrom) / 1000)
      if (left !== L.count) {
        L.count = left
        setHud((h) => ({ ...h, count: Math.max(1, left) }))
      }
      if (left <= 0) {
        L.phase = 'live'
        L.engine.reset()
        setStage('live')
      }
    } else if (L.phase === 'live') {
      const out = L.engine.update(metrics, now)
      L.info = out
      if (out.rep) {
        L.result = { good: out.rep.good, until: now + RESULT_MS }
        const rep = out.rep
        setTally((t) => {
          const faults = { ...t.faults }
          rep.faults.forEach((f) => (faults[f.label] = (faults[f.label] || 0) + 1))
          return { good: t.good + (rep.good ? 1 : 0), bad: t.bad + (rep.good ? 0 : 1), faults }
        })
        onRep?.({ good: rep.good, faults: rep.faults.map((f) => f.id), exercise: ex.id })
        if (!rep.good) speak(rep.faults[0].cue)
        cue = rep.good ? 'Good rep' : rep.faults[0].cue
      } else if (out.live?.length) {
        speak(out.live[0].cue)
        cue = out.live[0].cue
      }
      if (L.result && now < L.result.until) color = L.result.good ? COLORS.good : COLORS.bad
      else if (out.live?.length) color = COLORS.bad
      else if (out.keyHit) color = COLORS.good
    }

    draw(lms, v.videoWidth, v.videoHeight, color)

    // Update the text on screen a few times a second, not every frame
    if (now - (L.hudAt || 0) > 200 || cue) {
      L.hudAt = now
      setHud((h) => ({
        ...h,
        reason: metrics.ok ? '' : metrics.reason,
        cue: cue || (L.result && now < L.result.until + 800 ? h.cue : ''),
        fps: L.fps || 0,
        slow: !!L.slow,
        info: debug ? { phase: L.info?.phase || L.phase, signal: L.info?.signal, m: metrics } : null,
      }))
    }
  }

  function draw(lms, w, h, color) {
    const c = canvas.current
    if (!c) return
    if (c.width !== w || c.height !== h) {
      c.width = w
      c.height = h
    }
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, w, h)
    if (!lms) return
    const seen = (i) => (lms[i].visibility ?? 1) > 0.5
    ctx.lineWidth = Math.max(4, w / 120)
    ctx.lineCap = 'round'
    ctx.strokeStyle = color
    for (const [a, b] of CONNECTIONS) {
      if (!seen(a) || !seen(b)) continue
      ctx.beginPath()
      ctx.moveTo(lms[a].x * w, lms[a].y * h)
      ctx.lineTo(lms[b].x * w, lms[b].y * h)
      ctx.stroke()
    }
    ctx.fillStyle = '#ffffff'
    for (const i of SKELETON_POINTS) {
      if (!seen(i)) continue
      ctx.beginPath()
      ctx.arc(lms[i].x * w, lms[i].y * h, Math.max(4, w / 160), 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ---------- Lifecycle ----------

  // Battery and heat: stop the camera when the tab is hidden
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && stream.current) {
        stop()
        setStage('intro')
        setError('Camera paused while the app was in the background.')
      }
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      stop()
    }
  }, [stop])

  // A different exercise needs a fresh engine
  useEffect(() => {
    if (live.current.engine) live.current.engine = createRepEngine(ex)
  }, [ex])

  const close = () => {
    stop()
    onClose?.(tally)
  }

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const running = stage === 'setup' || stage === 'countdown' || stage === 'live'
  const faultList = Object.entries(tally.faults).sort((a, b) => b[1] - a[1])

  return (
    <div className="fc" role="dialog" aria-modal="true" aria-label={`Form check: ${ex.name}`}>
      <header className="fc-head">
        <div>
          <p className="tiny">Form feedback</p>
          <h2>{ex.name}</h2>
        </div>
        <div className="fc-tally" aria-live="polite">
          <span className="fc-good">{tally.good} good</span>
          <span className="fc-bad">{tally.bad} no-rep</span>
        </div>
        <button className="icon-btn" onClick={close} aria-label="Close form check">
          <Icon name="plus" className="rot45" />
        </button>
      </header>

      <div className={`fc-stage ${running ? 'on' : ''}`}>
        <video ref={video} className="fc-video" playsInline muted />
        <canvas ref={canvas} className="fc-canvas" />
        {stage === 'loading' && <p className="fc-msg">Starting the camera and pose model…</p>}
        {stage === 'setup' && (
          <div className="fc-msg">
            <strong>{CAMERA_SETUP[ex.view]}</strong>
            <span>{hud.reason || 'Hold still…'}</span>
          </div>
        )}
        {stage === 'countdown' && <div className="fc-count">{hud.count}</div>}
        {stage === 'live' && (hud.cue || hud.reason) && <div className={`fc-cue ${hud.cue === 'Good rep' ? 'good' : ''}`}>{hud.cue || hud.reason}</div>}
        {running && hud.slow && <p className="fc-slow">This device is too slow for live coaching ({hud.fps} fps). Results may miss fast reps.</p>}
        {debug && hud.info && (
          <pre className="fc-debug">
            {`phase ${hud.info.phase}  signal ${fmt(hud.info.signal)}  fps ${hud.fps}\n`}
            {hud.info.m?.ok
              ? ['kneeAngle', 'hipAngle', 'torsoLean', 'depth', 'wristOffset', 'heelLift', 'kneeRatio', 'lowerKnee', 'frontKnee', 'rearKneeGap']
                  .map((k) => `${k} ${fmt(hud.info.m[k])}`)
                  .join('\n')
              : hud.info.m?.reason}
          </pre>
        )}
      </div>

      {!running && (
        <div className="fc-intro">
          {!acked ? (
            <section className="fc-card">
              <h3>Before you start</h3>
              <p>
                Camera feedback checks depth and positions. It can’t see your spine or feel pain. Stop if anything hurts, and use a coach for heavy lifts.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  try {
                    localStorage.setItem(ACK_KEY, '1')
                  } catch {
                    /* private mode */
                  }
                  setAcked(true)
                }}
              >
                I understand
              </button>
            </section>
          ) : (
            <>
              <label className="field">
                <span>Exercise</span>
                <select value={exId} onChange={(e) => setExId(e.target.value)}>
                  {FORM_EXERCISES.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
              <ul className="fc-tips">
                <li>
                  <strong>{CAMERA_SETUP[ex.view]}.</strong> Phone on the floor or a bench, 2–3 m away, at about hip height. Landscape is best.
                </li>
                <li>Your whole body in view, head to feet{ex.needs === 'sideHands' ? ', including the plates' : ''}.</li>
                <li>Video stays on your phone. Nothing is recorded or uploaded.</li>
              </ul>
              <div className="row gap-s wrap">
                <label className="check-row">
                  <input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} />
                  <span>Spoken cues</span>
                </label>
                <label className="check-row">
                  <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
                  <span>Show numbers</span>
                </label>
              </div>
              {error && (
                <p className="signin-error" role="alert">
                  {error}
                </p>
              )}
              <button className="btn btn-lime big" onClick={start} disabled={stage === 'loading'}>
                <Icon name="camera" size={18} /> {stage === 'loading' ? 'Starting…' : tally.good + tally.bad ? 'Start again' : 'Start camera'}
              </button>
            </>
          )}
        </div>
      )}

      {(tally.good + tally.bad > 0 || running) && (
        <footer className="fc-summary">
          {tally.good} good rep{tally.good === 1 ? '' : 's'}, {tally.bad} no-rep{tally.bad === 1 ? '' : 's'}
          {faultList.length > 0 && `: ${faultList.map(([l, n]) => `${l} ×${n}`).join(', ')}`}
          {running && (
            <button className="btn btn-primary small" onClick={close}>
              Done
            </button>
          )}
        </footer>
      )}
    </div>
  )
}

const fmt = (v) => (typeof v === 'number' ? (Math.abs(v) < 5 ? v.toFixed(2) : Math.round(v)) : '–')
