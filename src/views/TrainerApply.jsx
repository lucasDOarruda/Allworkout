import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { go, useStore } from '../store'
import { fileToDataUrl } from '../lib/utils'
import {
  DECLARATIONS,
  EMPTY_APPLICATION,
  QUALIFICATIONS,
  REGISTRATIONS,
  TERMS_VERSION,
  abnLookupUrl,
  checkApplication,
  formatAbn,
  validAbn,
} from '../lib/trainer'

// Firestore documents are capped at 1 MB, so keep the certificate image well under that
async function certificateImage(file) {
  for (const [max, q] of [
    [1600, 0.75],
    [1200, 0.65],
    [900, 0.55],
  ]) {
    const url = await fileToDataUrl(file, max, q)
    if (url.length < 850000) return url
  }
  throw new Error('too big')
}

// Personal trainers apply here (full-screen sheet). An admin approves them before they get
// coach tools: publishing workouts, selling them and taking on clients.
export default function TrainerApply() {
  const { me, actions, notify } = useStore()
  const [access, setAccess] = useState(undefined) // undefined = loading, null = offline
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!me?.googleUid) return setAccess(null)
    import('../lib/cloud').then((c) => c.myTrainerAccess(me.googleUid).then(setAccess))
  }, [me?.googleUid])

  const app = access?.application
  const status = app?.status || (me?.role === 'coach' ? 'approved' : me?.trainerStatus === 'pending' ? 'pending' : null)
  const close = () => go(me?.role === 'coach' ? 'you' : 'home')

  let body
  if (me?.role === 'admin') body = <StatusCard icon="check" title="You’re an admin" text="Admins already have every trainer tool." onClose={close} />
  else if (access === undefined) body = <p className="muted center">Loading your application…</p>
  else if (!me?.googleUid)
    body = <StatusCard icon="lock" title="Sign in with Google first" text="Trainer applications are linked to your Google account." onClose={close} />
  else if (editing || !status)
    body = (
      <ApplyForm
        me={me}
        previous={app}
        onSent={() => {
          actions.updateProfile({ trainerStatus: 'pending' })
          setAccess((a) => ({ ...(a || {}), application: { ...(app || {}), status: 'pending', submittedAt: new Date() } }))
          setEditing(false)
          notify('Application sent. We’ll review it soon.')
        }}
      />
    )
  else if (status === 'pending')
    body = (
      <StatusCard
        icon="timer"
        title="Application received"
        text="An admin is checking your qualification, ABN, first aid and insurance. Trainer tools switch on as soon as you’re approved. Until then you can train as a member."
        onClose={close}
      />
    )
  else if (status === 'approved')
    body = (
      <StatusCard icon="check" title="You’re an approved trainer" text="You can publish free and paid workouts and train members." onClose={close}>
        <button className="btn btn-primary big" onClick={() => go('create')}>
          Create a workout
        </button>
      </StatusCard>
    )
  else
    body = (
      <StatusCard icon="info" title="Your application wasn’t approved" text={app?.reviewNote || 'Check your details and documents, then send it again.'} onClose={close}>
        <button className="btn btn-primary big" onClick={() => setEditing(true)}>
          Update and resend
        </button>
      </StatusCard>
    )

  return (
    <div className="apply-back">
      <div className="apply" role="dialog" aria-modal="true" aria-labelledby="apply-title">
        <header className="apply-head">
          <div>
            <p className="tiny">Personal trainers</p>
            <h1 id="apply-title">Trainer application</h1>
          </div>
          <button className="icon-btn" onClick={close} aria-label="Close">
            <Icon name="plus" className="rot45" />
          </button>
        </header>
        {body}
      </div>
    </div>
  )
}

function StatusCard({ icon, title, text, onClose, children }) {
  return (
    <section className="apply-status">
      <span className="apply-status-icon">
        <Icon name={icon} size={28} />
      </span>
      <h2>{title}</h2>
      <p className="muted">{text}</p>
      <div className="stack gap-s">
        {children}
        <button className="btn btn-ghost" onClick={onClose}>
          Go to the app
        </button>
      </div>
    </section>
  )
}

function Field({ label, error, hint, children, wide }) {
  return (
    <label className={`field ${wide ? 'wide' : ''} ${error ? 'has-error' : ''}`}>
      <span>{label}</span>
      {children}
      {error ? <small className="field-error">{error}</small> : hint ? <small className="muted">{hint}</small> : null}
    </label>
  )
}

function ApplyForm({ me, previous, onSent }) {
  const [a, setA] = useState(() => ({ ...EMPTY_APPLICATION, fullName: me.name || '', ...(previous || {}) }))
  const [cert, setCert] = useState(null)
  const [agreed, setAgreed] = useState({})
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState('')
  const set = (k) => (e) => {
    setA((x) => ({ ...x, [k]: e.target.value }))
    setErrors((x) => ({ ...x, [k]: undefined }))
  }

  // A resubmission keeps the certificate already on file unless a new one is added
  useEffect(() => {
    if (!previous) return
    import('../lib/cloud').then((c) => c.loadCertificate(me.googleUid).then((img) => img && setCert((x) => x || img)).catch(() => {}))
  }, [previous, me.googleUid])

  const pickCert = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      setCert(await certificateImage(f))
      setErrors((x) => ({ ...x, certificate: undefined }))
    } catch {
      setErrors((x) => ({ ...x, certificate: 'Use a photo or screenshot (JPG or PNG) of the certificate.' }))
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setFailed('')
    const found = checkApplication(a, cert, agreed)
    setErrors(found)
    if (Object.keys(found).length) {
      document.querySelector('.apply .has-error, .apply .field-error')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    setBusy(true)
    try {
      const c = await import('../lib/cloud')
      await c.submitTrainerApp(me.googleUid, me.email || '', { ...a, termsVersion: TERMS_VERSION }, cert)
      onSent()
    } catch (err) {
      setFailed(err?.code === 'permission-denied' ? 'We couldn’t save your application. Sign out, sign in with Google again and retry.' : err?.message || 'Couldn’t send it. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const abnOk = validAbn(a.abn)

  return (
    <form className="apply-form" onSubmit={submit} noValidate>
      <p className="apply-intro">
        Only licensed personal trainers can publish workouts, sell them and train members on Kinetic Performances. Tell us about your qualification, business and cover. An admin checks every
        application before approving it. Only you and the admin can see these details.
      </p>
      {previous?.status === 'rejected' && previous.reviewNote && <p className="notice">Admin note: {previous.reviewNote}</p>}

      <fieldset>
        <legend>About you</legend>
        <div className="apply-grid">
          <Field label="Full legal name" error={errors.fullName} wide>
            <input value={a.fullName} onChange={set('fullName')} autoComplete="name" maxLength={80} />
          </Field>
          <Field label="Date of birth" error={errors.dob} hint="You must be 18 or older.">
            <input type="date" value={a.dob} onChange={set('dob')} autoComplete="bday" />
          </Field>
          <Field label="Mobile" error={errors.phone}>
            <input type="tel" value={a.phone} onChange={set('phone')} autoComplete="tel" placeholder="04xx xxx xxx" maxLength={16} />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend>Business</legend>
        <div className="apply-grid">
          <Field
            label="ABN"
            error={errors.abn}
            hint={
              abnOk ? (
                <a href={abnLookupUrl(a.abn)} target="_blank" rel="noreferrer">
                  Check {formatAbn(a.abn)} on ABN Lookup
                </a>
              ) : (
                '11 digits. You need an ABN to be paid for training.'
              )
            }
          >
            <input inputMode="numeric" value={a.abn} onChange={set('abn')} placeholder="12 345 678 901" maxLength={14} />
          </Field>
          <Field label="Business or trading name (optional)">
            <input value={a.businessName} onChange={set('businessName')} maxLength={80} />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend>Qualification</legend>
        <div className="apply-grid">
          <Field label="Highest fitness qualification" wide hint="Personal trainers need at least Certificate IV in Fitness.">
            <select value={a.qualification} onChange={set('qualification')}>
              {QUALIFICATIONS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Training provider (RTO or university)" error={errors.provider}>
            <input value={a.provider} onChange={set('provider')} maxLength={80} />
          </Field>
          <Field label="Year completed" error={errors.completedYear}>
            <input inputMode="numeric" value={a.completedYear} onChange={set('completedYear')} placeholder="2021" maxLength={4} />
          </Field>
          <Field label="Certificate or statement number (optional)">
            <input value={a.certNumber} onChange={set('certNumber')} maxLength={40} />
          </Field>
        </div>
        <div className={`apply-cert ${errors.certificate ? 'has-error' : ''}`}>
          <span className="label">Certificate</span>
          <label className="apply-cert-drop">
            {cert ? <img src={cert} alt="Your certificate" /> : <span>Add a photo or scan of your certificate</span>}
            <input type="file" accept="image/*" onChange={pickCert} hidden />
          </label>
          {errors.certificate && <small className="field-error">{errors.certificate}</small>}
        </div>
      </fieldset>

      <fieldset>
        <legend>Registration, first aid and insurance</legend>
        <div className="apply-grid">
          <Field label="Registered with" hint="Registration is recommended, not required.">
            <select value={a.registration} onChange={set('registration')}>
              {REGISTRATIONS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          {a.registration !== 'none' && (
            <Field label="Registration number" error={errors.registrationNumber}>
              <input value={a.registrationNumber} onChange={set('registrationNumber')} maxLength={40} />
            </Field>
          )}
          <Field label="First aid and CPR valid until" error={errors.firstAidExpiry}>
            <input type="date" value={a.firstAidExpiry} onChange={set('firstAidExpiry')} />
          </Field>
          <Field label="Insurer" error={errors.insurer} hint="Professional indemnity and public liability.">
            <input value={a.insurer} onChange={set('insurer')} maxLength={80} />
          </Field>
          <Field label="Insurance valid until" error={errors.insuranceExpiry}>
            <input type="date" value={a.insuranceExpiry} onChange={set('insuranceExpiry')} />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend>Your training</legend>
        <div className="apply-grid">
          <Field label="Specialties (optional)" wide>
            <input value={a.specialties} onChange={set('specialties')} placeholder="e.g. strength, kettlebells, pre and post natal" maxLength={120} />
          </Field>
          <Field label="Short bio (optional)" wide>
            <textarea value={a.bio} onChange={set('bio')} rows={3} maxLength={600} />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend>Declarations</legend>
        <div className="apply-checks">
          {DECLARATIONS.map(([k, text]) => (
            <label key={k} className="check-row">
              <input type="checkbox" checked={!!agreed[k]} onChange={(e) => {
                  setAgreed((x) => ({ ...x, [k]: e.target.checked }))
                  setErrors((x) => ({ ...x, declarations: undefined }))
                }} />
              <span>
                {k === 'terms' ? (
                  <>
                    I agree to the{' '}
                    <a href="#/terms" target="_blank" rel="noreferrer">
                      Terms of Service
                    </a>
                    , including the section for trainers, and the{' '}
                    <a href="#/privacy" target="_blank" rel="noreferrer">
                      Privacy Policy
                    </a>
                    .
                  </>
                ) : (
                  text
                )}
              </span>
            </label>
          ))}
          {errors.declarations && <small className="field-error">{errors.declarations}</small>}
        </div>
      </fieldset>

      {failed && (
        <p className="signin-error" role="alert">
          {failed}
        </p>
      )}
      {Object.values(errors).some(Boolean) && <p className="field-error center">Some details need fixing (marked above).</p>}
      <button className="btn btn-primary big" disabled={busy}>
        {busy ? 'Sending…' : previous ? 'Resend application' : 'Send application'}
      </button>
    </form>
  )
}
