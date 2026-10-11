import { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon'
import { CONNECTIONS } from './poseMath.js'
import { computeMetrics } from './metrics.js'
import { loadPoseLandmarker } from './landmarker.js'

// Guided body photo: the pose model checks the member is fully in frame and standing correctly
// for a front or side photo, then a timer takes the picture. Runs on the device; the photo is
// handed back to the caller and never uploaded.

const STEADY_MS = 1000
const TIMER_S = 3

// Is the pose right for this photo? Returns '' when ready, or what to fix.
function checkPose(lms, m, view, width, height) {
  if (!lms) return 'Step into the frame'
  if (!m.ok) return m.reason
  const nose = lms[0]
  const ankles = [lms[27], lms[28]].filter((a) => (a.visibility ?? 1) > 0.5)
  if ((nose.visibility ?? 1) < 0.5 || nose.y < 0.02) return 'Move back so your head is in view'
  if (!ankles.length || Math.max(...ankles.map((a) => a.y)) > 0.98) return 'Move back so your feet are in view'
  if (Math.max(...ankles.map((a) => a.y)) - nose.y < 0.45) return 'Come a little closer to the camera'
  // Shoulder width compared with leg length (in pixels): wide from the front, narrow side-on
  const px = (p) => ({ x: p.x * width, y: p.y * height })
  const seg = (a, b) => Math.hypot(px(a).x - px(b).x, px(a).y - px(b).y)
  const legLen = seg(lms[23], lms[25]) + seg(lms[25], lms[27]) || 1
  const shoulderGap = Math.abs(lms[11].x - lms[12].x) * width / legLen
  if (view === 'front') {
    if (shoulderGap < 0.25) return 'Face the camera'
    if (m.kneeAngle < 160) return 'Stand tall, legs straight'
    if (Math.abs(lms[11].y - lms[12].y) > 0.04) return 'Level your shoulders'
  } else {
    if (shoulderGap > 0.2) return 'Turn side-on to the camera'
    if (m.kneeAngle < 165 || m.hipAngle < 165) return 'Stand tall, legs straight'
    if (m.torsoLean > 12) return 'Stand up straight'
  }
  return ''
}

export default function BodyCapture({ view, onCapture, onCancel }) {
  const video = useRef(null)
  const canvas = useRef(null)
  const stream = useRef(null)
  const model = useRef(null)
  const raf = useRef(0)
  const state = useRef({ readySince: 0, countFrom: 0 })
  const [status, setStatus] = useState('starting') // starting | live | error
  const [hint, setHint] = useState('Starting the camera…')
  const [count, setCount] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error(), { name: 'Insecure' })
        const cam = navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } })
        const lm = loadPoseLandmarker('VIDEO')
        stream.current = await cam
        if (cancelled) return
        video.current.srcObject = stream.current
        await video.current.play()
        model.current = await lm
        if (cancelled) return
        setStatus('live')
        tick()
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setError(
          err?.name === 'NotAllowedError'
            ? 'Camera access was blocked. Allow the camera for this site, or upload a photo instead.'
            : 'The camera couldn’t start. You can upload a photo instead.',
        )
      }
    })()
    return () => {
      cancelled = true
      cancelAnimationFrame(raf.current)
      stream.current?.getTracks().forEach((t) => t.stop())
      try {
        model.current?.close()
      } catch {
        /* closed */
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function take() {
    const v = video.current
    if (!v?.videoWidth) return
    const scale = Math.min(1, 1080 / Math.max(v.videoWidth, v.videoHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(v.videoWidth * scale)
    c.height = Math.round(v.videoHeight * scale)
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
    onCapture(c.toDataURL('image/jpeg', 0.82))
  }

  function tick() {
    raf.current = requestAnimationFrame(tick)
    const v = video.current
    const S = state.current
    if (!v || !model.current || v.readyState < 2 || v.currentTime === S.lastTime) return
    S.lastTime = v.currentTime
    const now = performance.now()
    let res
    try {
      res = model.current.detectForVideo(v, now)
    } catch {
      return
    }
    const lms = res.landmarks?.[0]
    const m = computeMetrics(lms, res.worldLandmarks?.[0], { width: v.videoWidth, height: v.videoHeight, view, needs: view === 'front' ? 'both' : 'side' })
    const problem = checkPose(lms, m, view, v.videoWidth, v.videoHeight)
    draw(lms, v.videoWidth, v.videoHeight, problem ? '#cfd2c4' : '#4ade80')

    if (problem) {
      S.readySince = 0
      S.countFrom = 0
      if (S.hint !== problem) setHint((S.hint = problem))
      setCount(null)
      return
    }
    S.readySince ||= now
    if (now - S.readySince < STEADY_MS) {
      if (S.hint !== 'Hold still') setHint((S.hint = 'Hold still'))
      return
    }
    S.countFrom ||= now
    const left = TIMER_S - Math.floor((now - S.countFrom) / 1000)
    if (left !== S.left) {
      S.left = left
      setCount(left > 0 ? left : null)
    }
    if (left <= 0) {
      cancelAnimationFrame(raf.current)
      take()
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
    ctx.lineWidth = Math.max(4, w / 160)
    ctx.lineCap = 'round'
    ctx.strokeStyle = color
    for (const [a, b] of CONNECTIONS) {
      if ((lms[a].visibility ?? 1) < 0.5 || (lms[b].visibility ?? 1) < 0.5) continue
      ctx.beginPath()
      ctx.moveTo(lms[a].x * w, lms[a].y * h)
      ctx.lineTo(lms[b].x * w, lms[b].y * h)
      ctx.stroke()
    }
  }

  return (
    <div className="bc-capture">
      <div className="fc-stage on bc-stage">
        <video ref={video} className="fc-video" playsInline muted />
        <canvas ref={canvas} className="fc-canvas" />
        <div className="bc-guide" aria-hidden="true" />
        {status !== 'error' && (
          <div className="fc-msg">
            <strong>{view === 'front' ? 'Front photo: face the camera' : 'Side photo: turn side-on'}</strong>
            <span>{hint}</span>
          </div>
        )}
        {count && <div className="fc-count">{count}</div>}
      </div>
      {error && (
        <p className="signin-error" role="alert">
          {error}
        </p>
      )}
      <div className="row gap-s wrap bc-actions">
        {status === 'live' && (
          <button className="btn btn-secondary" onClick={take}>
            <Icon name="camera" size={18} /> Take it now
          </button>
        )}
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <p className="tiny bc-tip">Phone at hip height, 2–3 m away. Fitted clothes, arms slightly away from your body, plain background. The timer starts when you’re in position.</p>
    </div>
  )
}
