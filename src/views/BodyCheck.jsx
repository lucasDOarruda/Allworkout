import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { Chips, Empty, PageHead, Segmented } from '../components/ui'
import { ColumnChart } from '../components/Charts'
import Icon from '../components/Icon'
import { useStore } from '../store'
import { fileToDataUrl, uid } from '../lib/utils'
import { MEASURES, deleteAllCheckins, deleteCheckin, hasConsent, listCheckins, saveCheckin, setConsent } from '../lib/bodyStore'

// The camera code only loads when someone takes a guided photo
const BodyCapture = lazy(() => import('../formcoach/BodyCapture'))

const fmtDay = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const num = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v))

// Body check: progress photos and measurements, kept on this device only
export default function BodyCheck() {
  const { me, notify } = useStore()
  const owner = me.googleUid || me.id
  const [consent, setConsentState] = useState(() => hasConsent(owner))
  const [list, setList] = useState(null)
  const [tab, setTab] = useState('checkins')
  const [adding, setAdding] = useState(false)

  const load = useCallback(() => {
    listCheckins(owner)
      .then(setList)
      .catch((e) => {
        setList([])
        notify(e.message || 'Couldn’t open body check storage.', 'error')
      })
  }, [owner, notify])
  useEffect(() => {
    if (consent) load()
  }, [consent, load])

  if (!consent) return <Consent onAgree={() => (setConsent(owner, true), setConsentState(true))} />

  return (
    <div className="page narrow body-page">
      <PageHead title="Body check" back />
      <p className="muted small">
        <Icon name="lock" size={14} /> Photos and measurements stay on this device. They’re never uploaded.
      </p>
      {adding ? (
        <NewCheckin
          owner={owner}
          onDone={(saved) => {
            setAdding(false)
            if (saved) {
              notify('Check-in saved')
              load()
            }
          }}
        />
      ) : (
        <>
          <button className="btn btn-lime big full" onClick={() => setAdding(true)}>
            <Icon name="camera" size={18} /> New check-in
          </button>
          <Segmented
            options={[
              ['checkins', 'Check-ins'],
              ['compare', 'Compare'],
              ['progress', 'Progress'],
            ]}
            value={tab}
            onChange={setTab}
          />
          {list === null ? (
            <p className="muted">Loading…</p>
          ) : tab === 'checkins' ? (
            <Checkins list={list} onDelete={load} />
          ) : tab === 'compare' ? (
            <Compare list={list} />
          ) : (
            <Progress list={list} />
          )}
          <ScanCard />
          <button
            className="btn btn-ghost full bc-delete-all"
            onClick={async () => {
              if (!confirm('Delete all your body check photos and measurements from this device? This can’t be undone.')) return
              await deleteAllCheckins(owner)
              notify('All body check data deleted')
              setConsentState(false)
            }}
          >
            Delete all body check data
          </button>
        </>
      )}
    </div>
  )
}

function Consent({ onAgree }) {
  const [adult, setAdult] = useState(false)
  const [agree, setAgree] = useState(false)
  return (
    <div className="page narrow body-page">
      <PageHead title="Body check" back />
      <section className="card stack">
        <h2 className="card-h">Track how your body changes</h2>
        <p className="muted">Take a guided front and side photo, add your measurements, and compare check-ins over time.</p>
        <ul className="fc-tips bc-consent-list">
          <li>Your photos and measurements are stored only on this device. They aren’t uploaded, and nobody else can see them, including your trainer and the Kinetic Performances team.</li>
          <li>If you clear your browser data or change phones, they’re gone, so this isn’t a backup.</li>
          <li>You can delete any check-in, or everything, at any time.</li>
          <li>Body photos are personal. Only take them somewhere private.</li>
        </ul>
        <label className="check-row">
          <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
          <span>I’m 18 or older.</span>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>
            I agree to store body photos and measurements on this device. <a href="#/privacy">Privacy Policy</a>
          </span>
        </label>
        <button className="btn btn-primary big" disabled={!adult || !agree} onClick={onAgree}>
          Start body check
        </button>
      </section>
    </div>
  )
}

// ---------- New check-in: front photo, side photo, measurements ----------

function NewCheckin({ owner, onDone }) {
  const [step, setStep] = useState('front')
  const [photos, setPhotos] = useState({ front: null, side: null })
  const [camera, setCamera] = useState(false)
  const [m, setM] = useState({})
  const [note, setNote] = useState('')
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'))
  const [busy, setBusy] = useState(false)

  const setPhoto = (src) => {
    setPhotos((p) => ({ ...p, [step]: src }))
    setCamera(false)
  }
  const upload = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) setPhoto(await fileToDataUrl(f, 1080, 0.82))
  }

  const save = async () => {
    setBusy(true)
    try {
      const measures = Object.fromEntries(MEASURES.map(([k]) => [k, num(m[k])]).filter(([, v]) => v !== null))
      await saveCheckin({ id: uid('bc'), owner, date: new Date(`${date}T12:00`).toISOString(), front: photos.front, side: photos.side, measures, note: note.trim().slice(0, 300) })
      onDone(true)
    } catch (e) {
      alert(e.message || 'Couldn’t save. Your device storage may be full.')
    } finally {
      setBusy(false)
    }
  }

  if (step === 'front' || step === 'side') {
    const current = photos[step]
    return (
      <section className="card stack">
        <p className="label">
          Step {step === 'front' ? 1 : 2} of 3 · {step === 'front' ? 'Front photo' : 'Side photo'}
        </p>
        {camera ? (
          <Suspense fallback={<p className="muted">Starting the camera…</p>}>
            <BodyCapture view={step} onCapture={setPhoto} onCancel={() => setCamera(false)} />
          </Suspense>
        ) : current ? (
          <img className="bc-preview" src={current} alt={`${step} photo`} />
        ) : (
          <p className="muted">
            {step === 'front' ? 'Face the camera, arms slightly away from your body.' : 'Turn side-on, arms by your sides.'} Same place, clothes and light each time
            makes comparing easier.
          </p>
        )}
        {!camera && (
          <div className="row gap-s wrap">
            <button className="btn btn-primary" onClick={() => setCamera(true)}>
              <Icon name="camera" size={18} /> {current ? 'Retake' : 'Use the camera'}
            </button>
            <label className="btn btn-ghost">
              Upload a photo
              <input type="file" accept="image/*" hidden onChange={upload} />
            </label>
          </div>
        )}
        {!camera && (
          <div className="row between">
            <button className="btn btn-ghost" onClick={() => (step === 'front' ? onDone(false) : setStep('front'))}>
              {step === 'front' ? 'Cancel' : 'Back'}
            </button>
            <button className="btn btn-secondary" onClick={() => setStep(step === 'front' ? 'side' : 'measures')}>
              {current ? 'Next' : 'Skip photo'}
            </button>
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="card stack">
      <p className="label">Step 3 of 3 · Measurements (all optional)</p>
      <label className="field">
        <span>Date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <div className="bc-measures">
        {MEASURES.map(([k, label, unit]) => (
          <label key={k} className="field">
            <span>
              {label} ({unit})
            </span>
            <input inputMode="decimal" value={m[k] ?? ''} onChange={(e) => setM((x) => ({ ...x, [k]: e.target.value.replace(',', '.') }))} placeholder="–" maxLength={6} />
          </label>
        ))}
      </div>
      <p className="tiny">Measure in the morning, before eating, at the same spots each time: waist at the belly button, hips at the widest point.</p>
      <label className="field">
        <span>Note</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="How you feel, training phase…" />
      </label>
      <div className="row between">
        <button className="btn btn-ghost" onClick={() => setStep('side')}>
          Back
        </button>
        <button className="btn btn-primary" disabled={busy || (!photos.front && !photos.side && !Object.values(m).some((v) => num(v) !== null))} onClick={save}>
          {busy ? 'Saving…' : 'Save check-in'}
        </button>
      </div>
    </section>
  )
}

// ---------- Lists, comparisons and chart ----------

function Checkins({ list, onDelete }) {
  if (!list.length) return <Empty icon="camera" title="No check-ins yet">Take your first one to start tracking.</Empty>
  return (
    <ul className="bc-list">
      {[...list].reverse().map((c) => (
        <li key={c.id} className="card">
          <div className="bc-thumbs">
            {['front', 'side'].map((v) => (c[v] ? <img key={v} src={c[v]} alt={`${v} photo`} /> : <span key={v} className="bc-nophoto">No {v} photo</span>))}
          </div>
          <div className="grow">
            <p className="strong">{fmtDay(c.date)}</p>
            <p className="tiny">
              {MEASURES.filter(([k]) => c.measures?.[k] != null)
                .map(([k, l, u]) => `${l} ${c.measures[k]} ${u}`)
                .join(' · ') || 'No measurements'}
            </p>
            {c.note && <p className="small muted">{c.note}</p>}
          </div>
          <button
            className="icon-btn"
            aria-label={`Delete check-in from ${fmtDay(c.date)}`}
            onClick={async () => {
              if (!confirm(`Delete the check-in from ${fmtDay(c.date)}?`)) return
              await deleteCheckin(c.id)
              onDelete()
            }}
          >
            <Icon name="trash" size={18} />
          </button>
        </li>
      ))}
    </ul>
  )
}

function Compare({ list }) {
  const [a, setA] = useState(list[0]?.id)
  const [b, setB] = useState(list[list.length - 1]?.id)
  const [view, setView] = useState('front')
  const [mode, setMode] = useState('side')
  const [mix, setMix] = useState(50)
  if (list.length < 2) return <Empty icon="calendar" title="Two check-ins needed">Add another check-in to compare.</Empty>
  const A = list.find((c) => c.id === a) || list[0]
  const B = list.find((c) => c.id === b) || list[list.length - 1]
  const pick = (value, set) => (
    <select value={value} onChange={(e) => set(e.target.value)}>
      {list.map((c) => (
        <option key={c.id} value={c.id}>
          {fmtDay(c.date)}
        </option>
      ))}
    </select>
  )
  const imgA = A[view]
  const imgB = B[view]
  return (
    <section className="stack">
      <div className="row gap-s">
        <label className="field">
          <span>Before</span>
          {pick(A.id, setA)}
        </label>
        <label className="field">
          <span>After</span>
          {pick(B.id, setB)}
        </label>
      </div>
      <Chips
        options={[
          ['side', 'Side by side'],
          ['overlay', 'See-through'],
          ['slider', 'Slider'],
          ['table', 'Measurements'],
        ]}
        value={mode}
        onChange={(v) => setMode(v || 'side')}
        all={null}
      />
      {mode !== 'table' && (
        <Chips
          options={[
            ['front', 'Front'],
            ['side', 'Side'],
          ]}
          value={view}
          onChange={(v) => setView(v || 'front')}
          all={null}
        />
      )}
      {mode !== 'table' && (!imgA || !imgB) ? (
        <p className="muted">One of these check-ins has no {view} photo.</p>
      ) : mode === 'side' ? (
        <div className="bc-pair">
          <figure>
            <img src={imgA} alt="Before" />
            <figcaption>{fmtDay(A.date)}</figcaption>
          </figure>
          <figure>
            <img src={imgB} alt="After" />
            <figcaption>{fmtDay(B.date)}</figcaption>
          </figure>
        </div>
      ) : mode === 'overlay' ? (
        <>
          <div className="bc-stack">
            <img src={imgA} alt="Before" />
            <img src={imgB} alt="After" style={{ opacity: mix / 100 }} />
          </div>
          <label className="field">
            <span>
              {fmtDay(A.date)} ← see-through → {fmtDay(B.date)}
            </span>
            <input type="range" min="0" max="100" value={mix} onChange={(e) => setMix(Number(e.target.value))} />
          </label>
        </>
      ) : mode === 'slider' ? (
        <>
          <div className="bc-stack">
            <img src={imgB} alt="After" />
            <img src={imgA} alt="Before" style={{ clipPath: `inset(0 ${100 - mix}% 0 0)` }} />
            <span className="bc-divider" style={{ left: `${mix}%` }} />
          </div>
          <label className="field">
            <span>
              Drag: {fmtDay(A.date)} on the left, {fmtDay(B.date)} on the right
            </span>
            <input type="range" min="0" max="100" value={mix} onChange={(e) => setMix(Number(e.target.value))} />
          </label>
        </>
      ) : (
        <table className="adm-table bc-table">
          <thead>
            <tr>
              <th>Measure</th>
              <th className="num">{fmtDay(A.date)}</th>
              <th className="num">{fmtDay(B.date)}</th>
              <th className="num">Change</th>
            </tr>
          </thead>
          <tbody>
            {MEASURES.map(([k, l, u]) => {
              const va = A.measures?.[k]
              const vb = B.measures?.[k]
              const d = va != null && vb != null ? Math.round((vb - va) * 10) / 10 : null
              return (
                <tr key={k}>
                  <td>{l}</td>
                  <td className="num">{va != null ? `${va} ${u}` : '–'}</td>
                  <td className="num">{vb != null ? `${vb} ${u}` : '–'}</td>
                  <td className="num strong">{d == null ? '–' : `${d > 0 ? '+' : ''}${d} ${u}`}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}

function Progress({ list }) {
  const available = MEASURES.filter(([k]) => list.some((c) => c.measures?.[k] != null))
  const [key, setKey] = useState(available[0]?.[0] || 'weight')
  const def = MEASURES.find(([k]) => k === key) || MEASURES[0]
  const data = useMemo(
    () =>
      list
        .filter((c) => c.measures?.[key] != null)
        .map((c) => ({ key: c.id, label: fmtDay(c.date), short: new Date(c.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), value: c.measures[key] })),
    [list, key],
  )
  if (!available.length) return <Empty icon="chart" title="No measurements yet">Add measurements to a check-in to see them over time.</Empty>
  return (
    <section className="card stack">
      <Chips options={available.map(([k, l]) => [k, l])} value={key} onChange={(v) => setKey(v || key)} all={null} />
      <ColumnChart data={data} label={`${def[1]} over time`} format={(v) => `${v} ${def[2]}`} nowLabel={false} />
      {data.length >= 2 && (
        <p className="small">
          {def[1]}: {data[0].value} → {data[data.length - 1].value} {def[2]} ({Math.round((data[data.length - 1].value - data[0].value) * 10) / 10 > 0 ? '+' : ''}
          {Math.round((data[data.length - 1].value - data[0].value) * 10) / 10} {def[2]})
        </p>
      )}
    </section>
  )
}

function ScanCard() {
  return (
    <section className="card stack bc-scan">
      <span className="label">3D body scan · coming later</span>
      <p className="small muted">
        A 3D model you can spin 360°, with measurements worked out from your front and side photos. This needs a body-scanning service, which we’re still choosing.
      </p>
    </section>
  )
}
