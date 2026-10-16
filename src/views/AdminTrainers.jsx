import { useEffect, useState } from 'react'
import { Chips } from '../components/ui'
import Icon from '../components/Icon'
import { useStore } from '../store'
import { fmtDate, timeAgo } from '../lib/utils'
import { QUALIFICATIONS, REGISTRATIONS, abnLookupUrl, ageFrom, fmtDay, formatAbn, label, notExpired, validAbn } from '../lib/trainer'
import { CloudSetup } from './AdminCloud'

// Personal trainer applications from Firestore
export function useTrainerApps() {
  const [state, setState] = useState({ loading: true })
  const load = () => {
    setState((s) => ({ ...s, loading: true }))
    import('../lib/cloud').then((c) => c.loadTrainerApps().then((r) => setState({ loading: false, ...r })))
  }
  useEffect(load, [])
  return { ...state, reload: load }
}

const STATUS = { pending: 'Waiting for review', approved: 'Approved', rejected: 'Not approved' }

// Things the admin should look at closely, worked out from the application
function checks(a) {
  const age = ageFrom(a.dob)
  return [
    [validAbn(a.abn), 'ABN check digits are valid', 'ABN check digits are wrong'],
    [age !== null && age >= 18, `Age ${age ?? '?'}`, `Age ${age ?? '?'}: must be 18 or older`],
    [a.qualification !== 'other', label(QUALIFICATIONS, a.qualification), 'Other qualification: check it’s equivalent to Certificate IV in Fitness'],
    [notExpired(a.firstAidExpiry), `First aid and CPR valid until ${fmtDay(a.firstAidExpiry)}`, `First aid and CPR expired ${fmtDay(a.firstAidExpiry)}`],
    [notExpired(a.insuranceExpiry), `Insurance valid until ${fmtDay(a.insuranceExpiry)}`, `Insurance expired ${fmtDay(a.insuranceExpiry)}`],
  ]
}

export function Trainers({ apps: data }) {
  const [filter, setFilter] = useState('pending')
  const [open, setOpen] = useState(null)
  if (data.loading) return <p className="muted">Loading applications…</p>
  if (data.error) return <CloudSetup error={data.error} onRetry={data.reload} />
  const apps = data.apps || []
  const count = (s) => apps.filter((a) => a.status === s).length
  const rows = apps.filter((a) => !filter || a.status === filter)

  return (
    <>
      <p className="notice">
        Only approved trainers can publish workouts, sell them and train members. Check each certificate, ABN, first aid and insurance before approving.
      </p>
      <div className="adm-toolbar">
        <Chips
          options={[
            ['pending', `Waiting (${count('pending')})`],
            ['approved', `Approved (${count('approved')})`],
            ['rejected', `Not approved (${count('rejected')})`],
          ]}
          value={filter}
          onChange={setFilter}
        />
        <button className="btn btn-ghost small" onClick={data.reload}>
          Refresh
        </button>
      </div>
      <section className="adm-panel">
        {rows.length === 0 ? (
          <p className="muted small">{filter === 'pending' ? 'No applications waiting.' : 'None here.'}</p>
        ) : (
          <ul className="adm-list">
            {rows.map((a) => {
              const flags = checks(a).filter(([ok]) => !ok).length
              return (
                <li key={a.uid}>
                  <button className="adm-row-btn" onClick={() => setOpen(a.uid)}>
                    <span className="grow">
                      <span className="strong">{a.fullName}</span>
                      <span className="tiny block">
                        {label(QUALIFICATIONS, a.qualification)} · ABN {formatAbn(a.abn)} · sent {a.submittedAt ? timeAgo(a.submittedAt.toISOString()) : 'just now'}
                      </span>
                    </span>
                    {flags > 0 && <span className="crm-status quiet">{flags} to check</span>}
                    <span className={`crm-status ${a.status === 'approved' ? 'online' : a.status === 'rejected' ? 'inactive' : 'new'}`}>{STATUS[a.status]}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      {open && <Review app={apps.find((a) => a.uid === open)} onClose={() => setOpen(null)} onDone={data.reload} />}
    </>
  )
}

function Review({ app: a, onClose, onDone }) {
  const { notify } = useStore()
  const [cert, setCert] = useState(undefined)
  const [note, setNote] = useState(a.reviewNote || '')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    import('../lib/cloud').then((c) => c.loadCertificate(a.uid).then(setCert, () => setCert(null)))
  }, [a.uid])

  const decide = async (status) => {
    if (status === 'rejected' && !note.trim()) return notify('Add a note so the trainer knows what to fix.', 'error')
    setBusy(true)
    try {
      const c = await import('../lib/cloud')
      await c.reviewTrainerApp(a.uid, status, note.trim())
      notify(status === 'approved' ? `${a.fullName} is now an approved trainer` : status === 'rejected' ? 'Application declined' : 'Trainer access removed')
      onDone()
      onClose()
    } catch {
      notify('Couldn’t save the decision. Check the Firestore rules are deployed.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const mail = (subject, body) => `mailto:${a.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  const facts = [
    ['Full name', a.fullName],
    ['Date of birth', a.dob ? `${fmtDay(a.dob)} (age ${ageFrom(a.dob)})` : '–'],
    ['Mobile', a.phone],
    ['Email', a.email || '–'],
    ['ABN', formatAbn(a.abn)],
    ['Business name', a.businessName || '–'],
    ['Qualification', label(QUALIFICATIONS, a.qualification)],
    ['Provider', a.provider],
    ['Completed', a.completedYear],
    ['Certificate no.', a.certNumber || '–'],
    ['Registered with', label(REGISTRATIONS, a.registration)],
    ['Registration no.', a.registrationNumber || '–'],
    ['First aid and CPR until', fmtDay(a.firstAidExpiry)],
    ['Insurer', a.insurer],
    ['Insurance until', fmtDay(a.insuranceExpiry)],
    ['Specialties', a.specialties || '–'],
  ]

  return (
    <div className="adm-drawer-back" onClick={onClose}>
      <aside className="adm-drawer" role="dialog" aria-modal="true" aria-label={`Application from ${a.fullName}`} onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <span className={`crm-status ${a.status === 'approved' ? 'online' : a.status === 'rejected' ? 'inactive' : 'new'}`}>{STATUS[a.status]}</span>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="plus" className="rot45" />
          </button>
        </div>
        <h2>{a.fullName}</h2>
        <p className="tiny">
          Sent {a.submittedAt ? fmtDate(a.submittedAt.toISOString()) : 'just now'}
          {a.reviewedAt ? ` · reviewed ${fmtDate(a.reviewedAt.toISOString())}` : ''}
        </p>

        <ul className="trainer-checks">
          {checks(a).map(([ok, good, bad]) => (
            <li key={good} className={ok ? 'ok' : 'bad'}>
              <Icon name={ok ? 'check' : 'info'} size={16} /> {ok ? good : bad}
            </li>
          ))}
        </ul>
        <div className="row gap-s wrap">
          <a className="btn btn-secondary small" href={abnLookupUrl(a.abn)} target="_blank" rel="noreferrer">
            Check ABN on ABN Lookup
          </a>
          {a.email && (
            <a className="btn btn-ghost small" href={mail('Your Kinetic Performances trainer application', `Hi ${a.fullName.split(' ')[0]},\n\n`)}>
              Email applicant
            </a>
          )}
        </div>

        <h3 className="adm-sub">Certificate</h3>
        {cert === undefined ? (
          <p className="muted small">Loading…</p>
        ) : cert ? (
          <a href={cert} target="_blank" rel="noreferrer" className="trainer-cert">
            <img src={cert} alt={`Certificate from ${a.fullName}`} />
          </a>
        ) : (
          <p className="muted small">No certificate image found.</p>
        )}

        <dl className="crm-facts">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        {a.bio && <p className="small">{a.bio}</p>}

        <h3 className="adm-sub">Decision</h3>
        <label className="field">
          <span>Note to the trainer (needed when you decline)</span>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="e.g. Your insurance certificate has expired. Upload a current one and resend." />
        </label>
        <div className="row gap-s wrap">
          {a.status !== 'approved' && (
            <button className="btn btn-primary" disabled={busy} onClick={() => decide('approved')}>
              Approve trainer
            </button>
          )}
          {a.status === 'pending' && (
            <button className="btn btn-ghost" disabled={busy} onClick={() => decide('rejected')}>
              Decline
            </button>
          )}
          {a.status === 'approved' && (
            <button className="btn btn-ghost" disabled={busy} onClick={() => decide('rejected')}>
              Remove trainer access
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}
