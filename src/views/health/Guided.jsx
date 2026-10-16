import { useRef, useState } from 'react'
import { ACTIVITY, AIMS, EQUATION_SEX, EXPERIENCE, LIFE_STAGES, aimEnergy, fmt, num, plausibility, summaryText, trainingGuidance, validate, womensHealth } from '../../lib/healthCalc'
import { photoUrl } from '../../lib/photos'
import Logo from '../../components/Logo'

// Guided health assessment: one question at a time, with why we ask, progress, Back, Skip and Edit.
// Answers are saved in the health tools state (local storage) on every change, so the member can
// switch apps or reload and carry on from the same step.

export const GOAL_INFO = {
  'fat-loss': {
    photo: 'home',
    text: 'Fat loss comes from eating a little less energy than you use, over weeks. Keep protein high and keep strength training, so more of what you lose is fat rather than muscle. Scale weight moves with water, salt and food, so watch the 2–4 week trend. Results vary, so we don’t promise a weekly number.',
    cite: [11, 37],
  },
  muscle: {
    photo: 'dumbbells',
    text: 'Muscle grows from progressive strength training, enough protein and enough energy. A small surplus is enough: gaining weight quickly mostly adds fat. Expect slow, steady progress, usually faster in your first year of training.',
    cite: [11, 36, 31],
  },
  maintain: {
    photo: 'class',
    text: 'Eat around your maintenance energy and keep training. Useful for building habits, recovering after a diet, or staying where you are.',
    cite: [31],
  },
  performance: {
    photo: 'ropes',
    text: 'Training for a sport or event: fuel hard sessions with enough carbohydrate, eat enough overall, and plan recovery. Eating too little for your training harms performance and health.',
    cite: [10, 14],
  },
  longevity: {
    photo: 'coach',
    text: 'Healthy ageing: strength, cardio fitness, balance and mobility help you stay independent. Aim for the activity guidelines rather than a number on the scale.',
    cite: [31, 17],
  },
}

const GENDERS = [
  ['', 'Prefer not to say'],
  ['woman', 'Woman'],
  ['man', 'Man'],
  ['non-binary', 'Non-binary'],
  ['self', 'I describe myself another way'],
]

// Steps: id, title, whether it can be skipped, and when it's complete
const STEPS = [
  { id: 'equation', title: 'Which equation should we use?', optional: false, done: (t) => !!t.sex },
  { id: 'body', title: 'Your age, height and weight', optional: false, done: (t) => num(t.age) > 0 && num(t.height) > 0 && num(t.weight) > 0 && !Object.keys(validate(t)).some((k) => ['age', 'height', 'weight'].includes(k)) },
  { id: 'goal', title: 'What’s your main goal?', optional: false, done: (t) => !!t.aim },
  { id: 'activity', title: 'How active are you?', optional: false, done: (t) => !!t.activity },
  { id: 'bodyfat', title: 'Do you know your body fat %?', optional: true, done: (t) => !validate(t).bodyFat },
  { id: 'recovery', title: 'Sleep and recovery', optional: true, done: (t) => !validate(t).sleep },
  { id: 'womens', title: 'Women’s health (optional)', optional: true, done: () => true },
  { id: 'review', title: 'Check your answers', optional: false, done: () => true },
]

function Why({ children }) {
  return (
    <aside className="hg-why">
      <strong>Why we ask</strong>
      <p>{children}</p>
    </aside>
  )
}

function Choice({ options, value, onChange, name }) {
  return (
    <div className="hg-choices" role="radiogroup" aria-label={name}>
      {options.map(([k, label, sub]) => (
        <button type="button" key={k} role="radio" aria-checked={value === k} className={`hg-choice ${value === k ? 'on' : ''}`} onClick={() => onChange(k)}>
          <span className="hg-radio" aria-hidden="true" />
          <span>
            <span className="strong block">{label}</span>
            {sub && <span className="small muted">{sub}</span>}
          </span>
        </button>
      ))}
    </div>
  )
}

function NumberField({ label, value, onChange, error, unit, step = 1, inputMode = 'decimal', hint }) {
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span>
        {label}
        {unit ? ` (${unit})` : ''}
      </span>
      <input type="number" inputMode={inputMode} step={step} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : e.target.value)} />
      {error ? <small className="field-error">{error}</small> : hint ? <small className="muted">{hint}</small> : null}
    </label>
  )
}

export function Walkthrough({ t, set, onDone }) {
  const i = Math.min(Math.max(0, num(t.wStep)), STEPS.length - 1)
  const step = STEPS[i]
  const errors = validate(t)
  const go = (n) => {
    set({ wStep: n })
    document.querySelector('.hg')?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }
  const next = () => (i === STEPS.length - 1 ? onDone() : go(i + 1))

  return (
    <section className="ht-card hg" aria-labelledby="hg-title">
      <div className="row between">
        <span className="ht-eyebrow">Health profile</span>
        <span className="tiny">
          Step {i + 1} of {STEPS.length}
        </span>
      </div>
      <div className="hg-progress" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={i + 1}>
        {STEPS.map((s, k) => (
          <span key={s.id} className={k <= i ? 'on' : ''} />
        ))}
      </div>
      <h2 id="hg-title">{step.title}</h2>

      {step.id === 'equation' && (
        <>
          <p className="muted">Energy equations were built from data recorded as male or female. Pick the one that fits your body best.</p>
          <Choice name="Equation" options={EQUATION_SEX} value={t.sex} onChange={(v) => set({ sex: v })} />
          <label className="field">
            <span>How do you describe your gender? (optional, not used in calculations)</span>
            <select value={t.gender || ''} onChange={(e) => set({ gender: e.target.value })}>
              {GENDERS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <Why>The equation choice only changes the numbers in the formula. It isn’t a question about who you are. “Not sure” averages both equations.</Why>
        </>
      )}

      {step.id === 'body' && (
        <>
          <div className="hg-grid3">
            <NumberField label="Age" value={t.age} onChange={(v) => set({ age: v })} error={errors.age} inputMode="numeric" />
            <NumberField label="Height" unit="cm" value={t.height} onChange={(v) => set({ height: v })} error={errors.height} />
            <NumberField label="Weight" unit="kg" step={0.1} value={t.weight} onChange={(v) => set({ weight: v })} error={errors.weight} />
          </div>
          {num(t.age) > 0 && num(t.age) < 18 && <p className="notice">These equations are for adults. If you’re under 18, talk to your GP or an accredited dietitian about energy and growth.</p>}
          <Why>All energy equations use these three numbers. We don’t make assumptions from age alone: energy use adjusted for body size is stable from about 20 to 60.</Why>
        </>
      )}

      {step.id === 'goal' && (
        <div className="hg-goals" role="radiogroup" aria-label="Main goal">
          {AIMS.map((a) => {
            const info = GOAL_INFO[a.id]
            const on = t.aim === a.id
            return (
              <button type="button" key={a.id} role="radio" aria-checked={on} className={`hg-goal ${on ? 'on' : ''}`} onClick={() => set({ aim: a.id, goal: aimEnergy(a.id) })}>
                <img src={photoUrl(info.photo)} alt="" />
                <span>
                  <strong>{a.label}</strong>
                  <span className="small">{info.text}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}

      {step.id === 'activity' && (
        <>
          <Choice name="Activity level" options={ACTIVITY.map(([v, l]) => [v, l])} value={String(t.activity)} onChange={(v) => set({ activity: v })} />
          <div className="field">
            <span>Training days a week</span>
            <div className="row gap-xs wrap">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => (
                <button type="button" key={d} className={`chip ${num(t.days) === d ? 'on' : ''}`} aria-pressed={num(t.days) === d} onClick={() => set({ days: d })}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>Training experience</span>
            <div className="row gap-xs wrap">
              {EXPERIENCE.map(([k, l]) => (
                <button type="button" key={k} className={`chip ${t.experience === k ? 'on' : ''}`} aria-pressed={t.experience === k} onClick={() => set({ experience: k })}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <Why>Activity turns resting energy into daily energy. Training days and experience shape the guidance, not the maths.</Why>
        </>
      )}

      {step.id === 'bodyfat' && (
        <>
          <NumberField label="Body fat" unit="%" step={0.5} value={t.bodyFat} onChange={(v) => set({ bodyFat: v })} error={errors.bodyFat} hint="From a scan (e.g. DEXA) or a reliable measurement. Leave blank if you don’t know." />
          {plausibility(t).map((p) => (
            <p key={p} className="ht-note info">
              {p}
            </p>
          ))}
          <Why>If you know it, we can use equations based on lean mass, which suit very lean or muscular people better. Bathroom-scale readings can be off by a lot.</Why>
        </>
      )}

      {step.id === 'recovery' && (
        <>
          <NumberField label="Average sleep" unit="hours a night" step={0.5} value={t.sleep} onChange={(v) => set({ sleep: v })} error={errors.sleep} />
          <div className="field">
            <span>How recovered do you usually feel before training?</span>
            <div className="row gap-xs wrap">
              {[
                ['low', 'Often tired'],
                ['ok', 'Mostly fine'],
                ['good', 'Fresh'],
              ].map(([k, l]) => (
                <button type="button" key={k} className={`chip ${t.recovery === k ? 'on' : ''}`} aria-pressed={t.recovery === k} onClick={() => set({ recovery: k })}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <Why>Sleep and recovery don’t change your calories, but they shape the guidance. Adults are advised to sleep 7 or more hours a night.</Why>
        </>
      )}

      {step.id === 'womens' && (
        <>
          <p className="muted">Only answer if it applies to you. You can skip this, and you can change it any time.</p>
          <Choice name="Life stage" options={[...LIFE_STAGES, ['', 'Doesn’t apply / prefer not to say']]} value={t.lifeStage || ''} onChange={(v) => set({ lifeStage: v || null, pregnant: v === 'pregnant' || v === 'breastfeeding' })} />
          <Why>
            Pregnancy and breastfeeding change energy needs, so we don’t use the standard equations then. Missing periods can be a sign of under-eating. We don’t change your
            training by cycle phase, because research doesn’t show a pattern that fits everyone.
          </Why>
        </>
      )}

      {step.id === 'review' && <Review t={t} onEdit={go} />}

      <div className="hg-nav">
        <button type="button" className="btn btn-ghost" disabled={i === 0} onClick={() => go(i - 1)}>
          Back
        </button>
        {step.optional && (
          <button type="button" className="btn btn-ghost" onClick={() => go(i + 1)}>
            Skip
          </button>
        )}
        <button type="button" className="btn btn-primary grow" disabled={!step.done(t)} onClick={next}>
          {i === STEPS.length - 1 ? 'See my results' : 'Continue'}
        </button>
      </div>
    </section>
  )
}

function Review({ t, onEdit }) {
  const rows = [
    ['Equation', EQUATION_SEX.find(([k]) => k === t.sex)?.[1] || '–', 0],
    ['Age, height, weight', `${t.age} y · ${t.height} cm · ${t.weight} kg`, 1],
    ['Goal', AIMS.find((a) => a.id === t.aim)?.label || '–', 2],
    ['Activity', `${ACTIVITY.find(([v]) => v === String(t.activity))?.[1] || '–'} · ${num(t.days)} training days`, 3],
    ['Body fat', t.bodyFat ? `${t.bodyFat}%` : 'Skipped', 4],
    ['Sleep', t.sleep ? `${t.sleep} h` : 'Skipped', 5],
    ['Women’s health', t.lifeStage ? LIFE_STAGES.find(([k]) => k === t.lifeStage)?.[1] : 'Skipped', 6],
  ]
  return (
    <dl className="hg-review">
      {rows.map(([k, v, step]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
          <button type="button" className="link-btn small" onClick={() => onEdit(step)} aria-label={`Edit ${k}`}>
            Edit
          </button>
        </div>
      ))}
    </dl>
  )
}

// ---------- Results extras ----------

export function ProfileBar({ t, set }) {
  const aim = AIMS.find((a) => a.id === t.aim)
  return (
    <section className="ht-card hg-profile">
      <span className="small">
        <strong>{aim ? aim.label : 'Your plan'}</strong> · {t.age} y · {t.height} cm · {t.weight} kg
      </span>
      <span className="row gap-s">
        <button type="button" className="link-btn small" onClick={() => set({ onboarded: false, wStep: STEPS.length - 1 })}>
          Edit answers
        </button>
        <button
          type="button"
          className="link-btn small"
          onClick={() => {
            if (confirm('Start the questions again? Your answers stay until you change them.')) set({ onboarded: false, wStep: 0 })
          }}
        >
          Start again
        </button>
      </span>
    </section>
  )
}

export function MacroTable({ e }) {
  const rows = [
    ['Protein', e.protein, 4, e.macroKcal.protein],
    ['Carbohydrate', e.carbs, 4, e.macroKcal.carbs],
    ['Fat', e.fat, 9, e.macroKcal.fat],
  ]
  return (
    <table className="ht-table hg-macros">
      <caption className="tiny">How your macros add up</caption>
      <thead>
        <tr>
          <th>Macro</th>
          <th className="num">Grams</th>
          <th className="num">kcal per g</th>
          <th className="num">kcal</th>
          <th className="num">Share</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, g, per, kcal]) => (
          <tr key={name}>
            <td>{name}</td>
            <td className="num">{g} g</td>
            <td className="num">{per}</td>
            <td className="num">{fmt(kcal)}</td>
            <td className="num">{e.macroTotal ? Math.round((kcal / e.macroTotal) * 100) : 0}%</td>
          </tr>
        ))}
        <tr className="hard">
          <td>Total</td>
          <td />
          <td />
          <td className="num strong">{fmt(e.macroTotal)}</td>
          <td className="num">target {fmt(e.target)}</td>
        </tr>
      </tbody>
    </table>
  )
}

// Cite comes from the health tools page, so [n] links jump to its Evidence tab
export function Guidance(props) {
  const { t, Cite } = props
  const goal = GOAL_INFO[t.aim]
  const items = trainingGuidance(t)
  const women = womensHealth(t)
  return (
    <>
      {goal && (
        <section className="ht-card hg-goalcard">
          <img src={photoUrl(goal.photo)} alt="" />
          <div>
            <h2>{AIMS.find((a) => a.id === t.aim)?.label}</h2>
            <p>
              {goal.text} <Cite n={goal.cite} />
            </p>
          </div>
        </section>
      )}
      <section className="ht-card">
        <h2>Training guidance</h2>
        <ul className="hg-guidance">
          {items.map((g) => (
            <li key={g.title}>
              <strong>{g.title}</strong>
              <span>
                {g.text} <Cite n={g.cite} />
              </span>
            </li>
          ))}
        </ul>
      </section>
      {women.length > 0 && (
        <section className="ht-card ht-callout">
          <h3>Your health context</h3>
          {women.map((w, k) => (
            <p key={k} className={`ht-note ${w.kind}`}>
              {w.text} <Cite n={w.cite} />
            </p>
          ))}
        </section>
      )}
      <section className="ht-card">
        <h2>Make the estimate yours</h2>
        <p className="muted">
          Equations are a starting point and can be off by 10% or more for some people. Weigh yourself a few mornings a week and compare the average over 2–3 weeks. If it
          isn’t moving the way you want, adjust by about 100–200 kcal a day and check again.
        </p>
      </section>
    </>
  )
}

// ---------- Shareable snapshot ----------

export function SnapshotButton({ t, e }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="btn btn-lime big full" onClick={() => setOpen(true)}>
        Share or save my results
      </button>
      {open && <Snapshot t={t} e={e} onClose={() => setOpen(false)} />}
    </>
  )
}

function Snapshot({ t, e, onClose }) {
  const card = useRef(null)
  const [includeBody, setIncludeBody] = useState(false)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const aim = AIMS.find((a) => a.id === t.aim)
  const today = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

  // The PNG. Rendered twice: iOS Safari sometimes misses images or fonts on the first pass.
  const makeBlob = async () => {
    const { toBlob } = await import('html-to-image')
    const opts = { pixelRatio: 2, backgroundColor: '#0c0d09', cacheBust: true }
    await toBlob(card.current, opts).catch(() => null)
    const blob = await toBlob(card.current, opts)
    if (!blob) throw new Error('Couldn’t create the image.')
    return blob
  }
  const run = async (label, fn) => {
    setBusy(label)
    setMsg('')
    try {
      await fn()
    } catch (err) {
      if (err?.name !== 'AbortError') setMsg(err.message || 'That didn’t work on this browser.')
    } finally {
      setBusy('')
    }
  }
  const download = (blob) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `all-workout-results-${new Date().toISOString().slice(0, 10)}.png`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  const share = () =>
    run('share', async () => {
      const blob = await makeBlob()
      const file = new File([blob], 'all-workout-results.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'My Kinetic Performances results', text: 'My energy and macro estimates' })
      else {
        download(blob)
        setMsg('Sharing isn’t available here, so the image was downloaded instead.')
      }
    })
  const copy = () =>
    run('copy', async () => {
      await navigator.clipboard.writeText(summaryText(t, e, { includeBody }))
      setMsg('Summary copied.')
    })
  const pdf = () => {
    // The print stylesheet shows only the snapshot; "Save as PDF" is in the print dialog
    document.documentElement.classList.add('print-snapshot')
    const done = () => {
      document.documentElement.classList.remove('print-snapshot')
      window.removeEventListener('afterprint', done)
    }
    window.addEventListener('afterprint', done)
    window.print()
    setTimeout(done, 60000)
  }

  return (
    <div className="contact-back" onClick={onClose}>
      <div className="contact-pop hg-snap-pop" role="dialog" aria-modal="true" aria-label="Share your results" onClick={(ev) => ev.stopPropagation()}>
        <div className="contact-pop-head">
          <h2>Share your results</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div ref={card} className="snapshot-card">
          <div className="snap-head">
            <Logo size={40} variant="dark" />
            <span>
              <strong>Kinetic Performances</strong>
              <small>Energy & macros · {today}</small>
            </span>
          </div>
          {aim && <p className="snap-goal">Goal: {aim.label}</p>}
          <div className="snap-target">
            <small>Daily target</small>
            <strong>{fmt(e.target)} kcal</strong>
          </div>
          <table className="snap-table">
            <thead>
              <tr>
                <th>Nutrition</th>
                <th>Grams</th>
                <th>kcal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Protein</td>
                <td>{e.protein} g</td>
                <td>{fmt(e.macroKcal.protein)}</td>
              </tr>
              <tr>
                <td>Carbohydrate</td>
                <td>{e.carbs} g</td>
                <td>{fmt(e.macroKcal.carbs)}</td>
              </tr>
              <tr>
                <td>Fat</td>
                <td>{e.fat} g</td>
                <td>{fmt(e.macroKcal.fat)}</td>
              </tr>
              <tr className="snap-total">
                <td>Total</td>
                <td />
                <td>{fmt(e.macroTotal)}</td>
              </tr>
            </tbody>
          </table>
          <p className="snap-small">
            Maintenance {fmt(e.range[0])}–{fmt(e.range[1])} kcal · Resting {fmt(e.bmr)} kcal
          </p>
          {includeBody && (
            <p className="snap-small">
              Based on {t.age} y · {t.height} cm · {t.weight} kg
            </p>
          )}
          <p className="snap-foot">Estimates from published equations, not medical advice · Kinetic Performances</p>
        </div>

        <label className="check-row">
          <input type="checkbox" checked={includeBody} onChange={(ev) => setIncludeBody(ev.target.checked)} />
          <span>Include my age, height and weight (off by default). Health details like pregnancy or periods are never included.</span>
        </label>
        <div className="hg-snap-actions">
          <button type="button" className="btn btn-primary" disabled={!!busy} onClick={share}>
            {busy === 'share' ? 'Preparing…' : 'Share'}
          </button>
          <button type="button" className="btn btn-secondary" disabled={!!busy} onClick={() => run('png', async () => download(await makeBlob()))}>
            {busy === 'png' ? 'Preparing…' : 'Download PNG'}
          </button>
          <button type="button" className="btn btn-ghost" disabled={!!busy} onClick={copy}>
            Copy summary
          </button>
          <button type="button" className="btn btn-ghost" disabled={!!busy} onClick={pdf}>
            Save as PDF
          </button>
        </div>
        {msg && <p className="small" role="status">{msg}</p>}
      </div>
    </div>
  )
}
