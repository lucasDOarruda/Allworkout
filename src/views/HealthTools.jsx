import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import FoodBuilder from './FoodBuilder'
import { useStore } from '../store'
import { ACTIVITY, DAYS, EQUATIONS, body, carbWeek, energy, fmt, noNumbersReason, num, r, womensHealth } from '../lib/healthCalc'
import { Guidance, MacroTable, ProfileBar, SnapshotButton, Walkthrough } from './health/Guided'
import { LINKS_CHECKED, SOURCES, STRENGTH_LABEL } from '../data/healthEvidence'

// Shared with the food builder
export { energy, fmt, num, r } from '../lib/healthCalc'
export { SOURCES } from '../data/healthEvidence'
import { HealthConsent } from './Settings'

// Free public health calculators. Education only: every number links to its source.

const STORE_KEY = 'aw:health-tools'
const DEFAULTS = {
  sex: 'female',
  age: 34,
  height: 168,
  weight: 68,
  pregnant: false,
  activity: '1.55',
  goal: 'lose',
  deficit: 20,
  surplus: 10,
  bodyFat: '',
  hardDays: [0, 2, 4],
  swing: 0.35,
  waist: 78,
  neck: 33,
  hips: 98,
  background: 'most',
  equation: 'msj',
  focus: null, // food builder focus; null = follow the Energy goal
  diet: 'all',
  plan: null, // food builder portions { foodId: portions }; null = starter day
  aboutOpen: true,
  // Guided walkthrough (saved with everything else, so it resumes after a reload)
  onboarded: false,
  wStep: 0,
  aim: null,
  gender: '',
  days: 3,
  experience: null,
  sleep: '',
  recovery: null,
  lifeStage: null,
}

// ---------- UI ----------

// [n] buttons jump to the matching source in the Evidence tab
const CiteCtx = createContext(() => {})
export function Cite({ n }) {
  const cite = useContext(CiteCtx)
  return (
    <>
      {[].concat(n).map((k) => (
        <button key={k} className="cite" onClick={() => cite(k)} aria-label={`Source ${k}`}>
          [{k}]
        </button>
      ))}
    </>
  )
}

function useTools() {
  const [t, setT] = useState(() => {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}') }
    } catch {
      return DEFAULTS
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(t))
    } catch {
      /* private mode */
    }
  }, [t])
  return [t, (patch) => setT((p) => ({ ...p, ...patch }))]
}

export default function HealthTools({ onClose }) {
  const [t, set] = useTools()
  const [tab, setTab] = useState('energy')
  const [flash, setFlash] = useState(null)
  const e = useMemo(() => energy(t), [t])
  const a = num(t.age)
  // No personalised calorie numbers in pregnancy, breastfeeding or under 18
  const blockReason = noNumbersReason(t)
  const blocked = !!blockReason || (a > 0 && a < 18)
  const { me } = useStore()

  // Counts which calculators get used and which goals people pick (no personal details)
  useEffect(() => {
    if (tab !== 'evidence') import('../lib/cloud').then((c) => c.trackTool(tab))
  }, [tab])
  const firstGoal = useRef(t.goal)
  useEffect(() => {
    if (t.goal !== firstGoal.current) import('../lib/cloud').then((c) => c.trackTool(`goal_${t.goal}`))
  }, [t.goal])

  // Members who opted in keep their latest numbers in their account (saved after a pause)
  useEffect(() => {
    if (!me?.googleUid || !me.healthConsent || blocked) return
    const timer = setTimeout(() => {
      const b = body(t)
      const one = (n) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : null)
      import('../lib/cloud').then((c) =>
        c.saveHealth(me.googleUid, {
          sex: t.sex,
          age: num(t.age),
          height: num(t.height),
          weight: num(t.weight),
          activity: num(t.activity),
          goal: t.goal,
          waist: num(t.waist),
          hips: num(t.hips),
          neck: num(t.neck),
          bmi: one(b.bmi),
          bmiCategory: b.bmiCat,
          whtr: Math.round(b.whtr * 100) / 100,
          bodyFat: b.bf === null ? null : one(b.bf),
          bmr: Math.round(e.bmr),
          tdee: Math.round(e.tdee),
          target: Math.round(e.target),
          protein: Math.round(e.protein),
          carbs: Math.round(e.carbs),
          fat: Math.round(e.fat),
          // Guided profile (women's health answers are never synced)
          aim: t.aim || null,
          trainingDays: num(t.days),
          experience: t.experience || null,
          sleepHours: t.sleep === '' ? null : num(t.sleep),
        }),
      )
    }, 4000)
    return () => clearTimeout(timer)
  }, [t, e, me?.googleUid, me?.healthConsent, blocked])

  // Only the overlay version locks page scrolling; the page version scrolls normally
  useEffect(() => {
    if (!onClose) return
    const onKey = (ev) => ev.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  // [n] jumps to the source in the Evidence tab
  const cite = (n) => {
    setTab('evidence')
    setFlash(n)
    setTimeout(() => document.getElementById(`src-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
    setTimeout(() => setFlash(null), 2200)
  }

  return (
    <CiteCtx.Provider value={cite}>
    <div className={onClose ? 'ht-overlay' : 'ht-page'} {...(onClose ? { role: 'dialog', 'aria-modal': true, 'aria-label': 'Health tools' } : {})}>
      <div className={`ht ${tab === 'food' ? 'wide' : ''}`}>
        {onClose && (
        <header className="ht-top">
            <span className="l-brand">
              <span className="l-mark">AW</span> All Workout
            </span>
            <span className="ht-eyebrow">Free community tools</span>
            {onClose && (
              <button className="icon-btn ht-close" onClick={onClose} aria-label="Close health tools">
                ✕
              </button>
            )}
          </header>
        )}

        <h1 className="ht-title">
          Know your numbers.
          <br />
          <span>Keep the science.</span>
        </h1>
        <p className="ht-lede">
          Free calculators for energy, food, carb cycling and body measures. Each result shows its error range and links to the
          research behind it. No account needed.
        </p>

        <div className="ht-tabs" role="tablist">
          {[
            ['energy', 'Energy & macros'],
            ['food', 'Food builder'],
            ['carbs', 'Carb cycling'],
            ['body', 'Beyond BMI'],
            ['evidence', 'Evidence'],
          ].map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>

        {/* Energy tab: guided questions first, then the results dashboard */}
        {tab === 'energy' && !t.onboarded && <Walkthrough t={t} set={set} onDone={() => set({ onboarded: true })} />}
        {tab === 'energy' && t.onboarded && <ProfileBar t={t} set={set} />}
        {tab !== 'evidence' && tab !== 'energy' && <AboutYou t={t} set={set} />}

        {tab === 'energy' && !t.onboarded ? null : tab !== 'evidence' && blocked ? (
          <section className="ht-card ht-notice">
            <h2>We won’t show calorie numbers for you here</h2>
            {blockReason === 'pregnant' || blockReason === 'breastfeeding' ? (
              <>
                <p>
                  Energy and weight needs change a lot during pregnancy and breastfeeding, and the standard equations don’t apply. Please talk to your midwife, GP or an
                  accredited dietitian about nutrition.
                </p>
                {womensHealth(t).map((w, k) => (
                  <p key={k} className="ht-note info">
                    {w.text} <Cite n={w.cite} />
                  </p>
                ))}
              </>
            ) : (
              <p>These equations are for adults. If you’re under 18, please talk to your GP or an accredited dietitian about energy and growth.</p>
            )}
          </section>
        ) : (
          <>
            {tab === 'energy' && (
              <>
                <Energy t={t} set={set} e={e} />
                <Guidance t={t} Cite={Cite} />
                <SnapshotButton t={t} e={e} />
              </>
            )}
            {tab === 'food' && <FoodBuilder t={t} set={set} />}
            {tab === 'carbs' && <Carbs t={t} set={set} e={e} />}
            {tab === 'body' && <Body t={t} set={set} />}
          </>
        )}
        {tab === 'evidence' && <Evidence flash={flash} />}

        {me?.googleUid && tab !== 'evidence' && !blocked && (
          <div className="ht-consent">
            <HealthConsent />
          </div>
        )}
        <footer className="ht-foot">
          <p>
            <strong>Education, not medical advice.</strong> These are estimates for healthy adults. Talk to your GP or an accredited
            dietitian before big changes, especially if you have a health condition.
          </p>
          <p>
            If counting food or weighing yourself feels stressful, you’re not alone. Call the Butterfly Foundation on{' '}
            <a href="tel:1800334673">1800 33 4673</a> or visit{' '}
            <a href="https://butterfly.org.au/get-support/helpline/" target="_blank" rel="noreferrer">
              butterfly.org.au
            </a>
            .
          </p>
          <p className="tiny">
            {me?.googleUid && me.healthConsent
              ? 'Your details are saved in this browser and, as you chose, to your All Workout account.'
              : 'Your details are saved only in this browser. We count which calculators are used, but not what you enter.'}
          </p>
        </footer>
      </div>
    </div>
    </CiteCtx.Provider>
  )
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function NumInput({ value, onChange, min, max, step = 1, label }) {
  return <input type="number" inputMode="decimal" min={min} max={max} step={step} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
}

function AboutYou({ t, set }) {
  if (!t.aboutOpen) {
    return (
      <button className="ht-card ht-about-mini" onClick={() => set({ aboutOpen: true })} aria-expanded="false">
        <span className="strong">About you</span>
        <span className="muted small grow">
          {t.sex === 'male' ? 'Male' : t.sex === 'female' ? 'Female' : 'Not sure'} equation · {t.age} y · {t.height} cm · {t.weight} kg
          {t.lifeStage === 'pregnant' ? ' · pregnant' : t.lifeStage === 'breastfeeding' ? ' · breastfeeding' : ''}
        </span>
        <span className="link-btn small">Edit</span>
      </button>
    )
  }
  return (
    <section className="ht-card">
      <div className="row between">
        <h2>About you</h2>
        <span className="row gap-s">
          <span className="tiny">Saved only in this browser</span>
          <button className="link-btn small" onClick={() => set({ aboutOpen: false })} aria-expanded="true">
            Done
          </button>
        </span>
      </div>
      <div className="ht-grid4">
        <div className="field">
          <span>Sex (for the equations)</span>
          <div className="ht-seg">
            {[
              ['female', 'Female'],
              ['male', 'Male'],
              ['unsure', 'Not sure'],
            ].map(([s, label]) => (
              <button key={s} className={t.sex === s ? 'on' : ''} onClick={() => set({ sex: s })} aria-pressed={t.sex === s}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <Field label="Age">
          <NumInput value={t.age} onChange={(v) => set({ age: v })} min={10} max={110} label="Age" />
        </Field>
        <Field label="Height (cm)">
          <NumInput value={t.height} onChange={(v) => set({ height: v })} min={100} max={230} label="Height in centimetres" />
        </Field>
        <Field label="Weight (kg)">
          <NumInput value={t.weight} onChange={(v) => set({ weight: v })} min={30} max={300} step={0.1} label="Weight in kilograms" />
        </Field>
      </div>
      {t.sex !== 'male' && (
        <label className="check">
          <input
            type="checkbox"
            checked={t.lifeStage === 'pregnant' || t.lifeStage === 'breastfeeding' || !!t.pregnant}
            onChange={(e) => set({ pregnant: e.target.checked, lifeStage: e.target.checked ? 'pregnant' : null })}
          />
          <span>I’m pregnant or breastfeeding</span>
        </label>
      )}
      <p className="tiny">The calculators open with example values. Replace them with yours.</p>
    </section>
  )
}

function Stat({ label, value, unit, sub, accent }) {
  return (
    <div className={`ht-stat ${accent ? 'accent' : ''}`}>
      <span className="ht-stat-l">{label}</span>
      <span className="ht-stat-v">
        {value}
        {unit && <small> {unit}</small>}
      </span>
      {sub && <span className="ht-stat-s">{sub}</span>}
    </div>
  )
}

function Notes({ notes }) {
  if (!notes.length) return null
  return (
    <div className="ht-notes">
      {notes.map((n, i) => (
        <p key={i} className={`ht-note ${n.kind}`}>
          {n.kind === 'warn' ? '⚠ ' : 'ℹ '}
          {n.text} {n.cite && <Cite n={n.cite} />}
        </p>
      ))}
    </div>
  )
}

function SafetyBox({ t, e }) {
  return (
    <>
      {e.over65 && (
        <section className="ht-card ht-callout">
          <h3>Over 65</h3>
          <ul>
            <li>
              We limit weight loss to 0.5% of your body weight a week, to help you keep muscle and bone.
            </li>
            <li>
              Protein goes up to 1.2–1.5 g per kg a day. <Cite n={12} />
            </li>
            <li>
              Strength training 2–3 times a week is strongly encouraged. <Cite n={17} />
            </li>
            <li>
              At this age a BMI of about 27–28 is linked with the lowest risk of death, so a little extra weight isn’t a worry on its
              own. <Cite n={15} />
            </li>
          </ul>
        </section>
      )}
      {t.sex === 'female' ? (
        <section className="ht-card ht-callout">
          <h3>For women</h3>
          <ul>
            <li>
              A missed, lighter or irregular period is a sign you may be eating too little for your training. See your GP. <Cite n={14} />
            </li>
            <li>
              You don’t need to plan training around your cycle. On average the effect on performance is trivial, so go by how you
              feel. <Cite n={13} />
            </li>
          </ul>
        </section>
      ) : (
        <section className="ht-card ht-callout">
          <h3>For men</h3>
          <p>
            Signs you may be eating too little for your training: lower sex drive or fewer morning erections, constant tiredness,
            getting sick or injured often, performance going backwards, and low mood. If several sound familiar, eat more and see
            your GP. <Cite n={14} />
          </p>
        </section>
      )}
    </>
  )
}

function Energy({ t, set, e }) {
  const lo = e.tdee * 0.9
  const hi = e.tdee * 1.1
  return (
    <>
      <section className="ht-card">
        <h2>Your activity and goal</h2>
        <div className="ht-grid2">
          <Field label="Activity level">
            <select value={t.activity} onChange={(ev) => set({ activity: ev.target.value })}>
              {ACTIVITY.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Body fat % (optional)">
            <NumInput value={t.bodyFat} onChange={(v) => set({ bodyFat: v })} min={3} max={60} step={0.5} label="Body fat percent" />
          </Field>
        </div>
        <Field label="Equation">
          <select value={t.equation} onChange={(ev) => set({ equation: ev.target.value })}>
            {EQUATIONS.map((q) => (
              <option key={q.id} value={q.id} disabled={q.needsBf && !e.all.lbm}>
                {q.name}
                {q.id === 'msj' ? ' (recommended)' : ''}
                {q.needsBf && !e.all.lbm ? ' (add body fat %)' : ''}
              </option>
            ))}
          </select>
        </Field>
        <div className="field">
          <span>Goal</span>
          <div className="ht-seg">
            {[
              ['lose', 'Fat loss'],
              ['maintain', 'Maintain'],
              ['gain', 'Muscle gain'],
            ].map(([k, l]) => (
              <button key={k} className={t.goal === k ? 'on' : ''} onClick={() => set({ goal: k })} aria-pressed={t.goal === k}>
                {l}
              </button>
            ))}
          </div>
        </div>
        {t.goal === 'lose' && (
          <Field label={`Deficit: ${t.deficit}% below maintenance`}>
            <input type="range" min={5} max={35} step={5} value={t.deficit} onChange={(ev) => set({ deficit: Number(ev.target.value) })} />
          </Field>
        )}
        {t.goal === 'gain' && (
          <Field label={`Surplus: ${t.surplus}% above maintenance`}>
            <input type="range" min={5} max={15} step={5} value={t.surplus} onChange={(ev) => set({ surplus: Number(ev.target.value) })} />
          </Field>
        )}
      </section>

      <section className="ht-card">
        <h2>Your energy</h2>
        <div className="ht-stats">
          <Stat label="Resting energy" value={fmt(e.bmr)} unit="kcal" sub={<>{e.eq.name} {e.eq.cite.length > 0 && <Cite n={e.eq.cite[0]} />}</>} />
          <Stat label="Maintenance" value={`${fmt(lo)}–${fmt(hi)}`} unit="kcal" sub={<>±10%: equations can be off by this much <Cite n={2} /></>} />
          <Stat
            accent
            label="Daily target"
            value={fmt(e.target)}
            unit="kcal"
            sub={e.weekly ? `About ${e.weekly > 0 ? '+' : '−'}${Math.abs(e.weekly).toFixed(2)} kg a week (rough guide)` : 'Holding steady'}
          />
        </div>
        <Notes notes={e.notes} />
        <details className="ht-compare">
          <summary>Compare equations</summary>
          <table className="ht-table">
            <thead>
              <tr>
                <th>Equation</th>
                <th className="num">Resting</th>
                <th className="num">Maintenance</th>
              </tr>
            </thead>
            <tbody>
              {EQUATIONS.map((q) => {
                const v = e.all[q.id]
                return (
                  <tr key={q.id} className={q.id === e.eq.id ? 'hard' : ''}>
                    <td>
                      <span className="strong">{q.name}</span> {q.cite.length > 0 && <Cite n={q.cite} />}
                      <span className="tiny block">{q.suits}</span>
                    </td>
                    <td className="num">{v ? fmt(v) : '–'}</td>
                    <td className="num">{v ? fmt(v * num(t.activity)) : 'needs body fat %'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </details>
      </section>

      <section className="ht-card">
        <h2>Daily macros</h2>
        <div className="ht-stats">
          <Stat
            label="Protein"
            value={fmt(e.protein)}
            unit="g"
            sub={
              <>
                {e.pRange[0]}–{e.pRange[1]} g/kg{e.refW !== num(t.weight) ? ' of a BMI-25 reference weight' : ''} <Cite n={e.over65 ? 12 : 11} />
              </>
            }
          />
          <Stat label="Carbs" value={fmt(e.carbs)} unit="g" sub="The rest of your energy" />
          <Stat label="Fat" value={fmt(e.fat)} unit="g" sub="At least 25% of energy" />
        </div>
        <MacroBar e={e} />
        <MacroTable e={e} />
        <p className="tiny">Metabolism doesn’t “crash” at 30: adjusted for body size it holds steady until about 60. <Cite n={3} /></p>
      </section>
      <SafetyBox t={t} e={e} />
    </>
  )
}

function MacroBar({ e }) {
  const p = e.protein * 4
  const c = e.carbs * 4
  const f = e.fat * 9
  const total = p + c + f || 1
  return (
    <div className="ht-macrobar" role="img" aria-label={`Protein ${r((p / total) * 100)}%, carbs ${r((c / total) * 100)}%, fat ${r((f / total) * 100)}% of energy`}>
      <span className="m-p" style={{ width: `${(p / total) * 100}%` }}>
        Protein {r((p / total) * 100)}%
      </span>
      <span className="m-c" style={{ width: `${(c / total) * 100}%` }}>
        Carbs {r((c / total) * 100)}%
      </span>
      <span className="m-f" style={{ width: `${(f / total) * 100}%` }}>
        Fat {r((f / total) * 100)}%
      </span>
    </div>
  )
}

function Carbs({ t, set, e }) {
  const w = carbWeek(t, e)
  const toggle = (i) => set({ hardDays: t.hardDays.includes(i) ? t.hardDays.filter((x) => x !== i) : [...t.hardDays, i].sort() })
  return (
    <>
      <section className="ht-card ht-read">
        <h3>Read this first</h3>
        <p>
          For fat loss and muscle gain, your weekly calories and protein matter far more than which day the carbs land on <Cite n={9} />.
          Carb cycling is a way to put more fuel on hard training days <Cite n={10} />. It doesn’t burn extra fat. This planner keeps your
          weekly total the same as the Energy tab.
        </p>
      </section>
      <section className="ht-card">
        <h2>Your training week</h2>
        <div className="field">
          <span>Tap your hard training days</span>
          <div className="ht-days">
            {DAYS.map((d, i) => (
              <button key={d} className={t.hardDays.includes(i) ? 'on' : ''} onClick={() => toggle(i)} aria-pressed={t.hardDays.includes(i)}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <Field label="How big a swing between days">
          <select value={t.swing} onChange={(ev) => set({ swing: Number(ev.target.value) })}>
            <option value={0.2}>Small: about ±20% carbs</option>
            <option value={0.35}>Medium: about ±35% carbs</option>
            <option value={0.5}>Large: about ±50% carbs</option>
          </select>
        </Field>
      </section>
      <section className="ht-card">
        <h2>Your carb week</h2>
        {t.hardDays.length === 0 || t.hardDays.length === 7 ? (
          <p className="muted">Pick some hard days and some easier days to see a cycle. Every day is {fmt(e.carbs)} g for now.</p>
        ) : (
          <>
            <div className="ht-stats">
              <Stat accent label="Training days" value={fmt(w.hi)} unit="g carbs" />
              <Stat label="Rest days" value={fmt(w.lo)} unit="g carbs" />
              <Stat label="Weekly total" value={fmt(w.weekly)} unit="kcal" sub={`Same as ${fmt(e.target * 7)} kcal on the Energy tab`} />
            </div>
            <table className="ht-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th className="num">Carbs</th>
                  <th className="num">Protein</th>
                  <th className="num">Fat</th>
                  <th className="num">kcal</th>
                </tr>
              </thead>
              <tbody>
                {w.days.map((d) => (
                  <tr key={d.day} className={d.hard ? 'hard' : ''}>
                    <td>
                      {d.day} {d.hard && <span className="ht-pill">Training</span>}
                    </td>
                    <td className="num">{fmt(d.carbs)} g</td>
                    <td className="num">{fmt(e.protein)} g</td>
                    <td className="num">{fmt(e.fat)} g</td>
                    <td className="num">{fmt(d.kcal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
      <SafetyBox t={t} e={e} />
    </>
  )
}

function Body({ t, set }) {
  const b = body(t)
  const markerPct = Math.min(100, Math.max(0, ((b.whtr - 0.3) / 0.5) * 100))
  const over65 = num(t.age) >= 65
  return (
    <>
      <section className="ht-card">
        <h2>A tape measure tells you more than a scale</h2>
        <p className="muted">
          BMI only uses height and weight, so it can’t tell muscle from fat or show where fat sits <Cite n={[4, 5]} />. Waist size relative to
          height tracks heart and diabetes risk better <Cite n={[6, 7]} />.
        </p>
        <div className="ht-grid4">
          <Field label="Waist (cm), at the navel">
            <NumInput value={t.waist} onChange={(v) => set({ waist: v })} min={40} max={200} step={0.5} label="Waist in centimetres" />
          </Field>
          <Field label="Neck (cm), below the larynx">
            <NumInput value={t.neck} onChange={(v) => set({ neck: v })} min={20} max={70} step={0.5} label="Neck in centimetres" />
          </Field>
          {t.sex === 'female' && (
            <Field label="Hips (cm), widest point">
              <NumInput value={t.hips} onChange={(v) => set({ hips: v })} min={50} max={200} step={0.5} label="Hips in centimetres" />
            </Field>
          )}
          <Field label="Background">
            <select value={t.background} onChange={(ev) => set({ background: ev.target.value })}>
              <option value="most">Most backgrounds</option>
              <option value="lower">Asian, Middle Eastern, Black African or African-Caribbean</option>
            </select>
          </Field>
        </div>
        <p className="tiny">Measure standing, relaxed, after breathing out. Tape snug but not pressing in.</p>
      </section>

      <section className="ht-card">
        <p className="ht-eyebrow">Waist-to-height ratio · our main measure</p>
        <div className="row between">
          <span className="ht-big">{b.whtr.toFixed(2)}</span>
          <span className={`ht-badge ${b.whtrCat[1]}`}>{b.whtrCat[0]}</span>
        </div>
        <div className="ht-gauge" aria-hidden="true">
          <span className="g-low" />
          <span className="g-ok" />
          <span className="g-mid" />
          <span className="g-high" />
          <i style={{ left: `${markerPct}%` }} />
        </div>
        <div className="ht-gauge-axis">
          {['0.3', '0.4', '0.5', '0.6', '0.8'].map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
        <p>
          Keep your waist under half your height. Today that’s under <strong>{fmt(b.targetWaist)} cm</strong>. The same cut-off works for
          women and men and across backgrounds <Cite n={[6, 7]} />.
        </p>
      </section>

      <section className="ht-card">
        <h2>Body fat estimate (tape method)</h2>
        {b.bf === null ? (
          <p className="muted">Check your measurements: we couldn’t calculate a sensible estimate from them.</p>
        ) : (
          <div className="ht-stats">
            <Stat accent label="Estimated body fat" value={`${r(b.bf, 0.5)}%`} sub={<>Likely between {r(b.bf - 3.5)}% and {r(b.bf + 3.5)}% <Cite n={8} /></>} />
            <Stat label="Lean mass" value={fmt(num(t.weight) * (1 - b.bf / 100))} unit="kg" sub="Use body fat % in the Energy tab for a sharper estimate" />
          </div>
        )}
      </section>

      <section className="ht-card">
        <h2>BMI, with its limits</h2>
        <div className="ht-stats">
          <Stat label="BMI" value={b.bmi.toFixed(1)} sub={b.bmiCat} />
          <Stat
            label="Cut-offs used"
            value={`${b.cuts[1]} / ${b.cuts[2]}`}
            sub={
              t.background === 'lower' ? (
                <>Lower cut-offs for higher-risk backgrounds <Cite n={[16, 6]} /></>
              ) : (
                'Overweight / obesity'
              )
            }
          />
        </div>
        <p className="muted small">
          BMI misses about half of people with excess body fat and labels many muscular people as overweight, so use it alongside your waist
          and other measures <Cite n={[4, 5]} />.
          {over65 && (
            <>
              {' '}
              Over 65, a BMI of about 27–28 is linked with the lowest risk of death <Cite n={15} />.
            </>
          )}
        </p>
      </section>
    </>
  )
}

function Evidence({ flash }) {
  const myths = [
    ['“BMI tells you if you’re healthy”', 'It misses about half of people with excess body fat and labels many muscular people as overweight. Use it alongside waist and other measures', [4, 5]],
    ['“Metabolism crashes at 30”', 'Energy use adjusted for body size holds steady from about 20 to 60. It falls only after 60, mostly with lost muscle', [3]],
    ['“Carb cycling burns more fat”', 'With calories and protein matched, carb timing hasn’t been shown to change fat loss. It can help you fuel hard sessions', [9, 10]],
    ['“Women must train by cycle phase”', 'On average, performance changes across the menstrual cycle are trivial. Go by how you feel', [13]],
  ]
  return (
    <>
      <p className="ht-eyebrow">Myths we don’t repeat</p>
      <div className="ht-myths">
        {myths.map(([title, body, cites]) => (
          <article key={title} className="ht-card">
            <h3>{title}</h3>
            <p className="muted">
              {body} <Cite n={cites} />.
            </p>
          </article>
        ))}
      </div>
      <p className="ht-eyebrow">Sources</p>
      <p className="tiny">
        {SOURCES.length} sources from journals and public-health bodies. Each is marked strong (guidelines, consensus statements, systematic reviews, large trials), moderate
        (single trials, validation studies) or emerging (narrower or lower-quality evidence). Tap any [n] on the page to jump here.
      </p>
      <ol className="ht-sources">
        {SOURCES.map((s, i) => (
          <li key={i} id={`src-${i + 1}`} className={`ht-card ${flash === i + 1 ? 'flash' : ''}`}>
            <span className="ht-src-n">{i + 1}</span>
            <div>
              <p className="strong">{s.claim}</p>
              <p className="tiny">{s.ref}</p>
              <p className="tiny ht-src-meta">
                <span className={`ht-strength ${s.strength}`}>{STRENGTH_LABEL[s.strength]}</span> {s.org}
                {s.published ? ` · ${s.published}` : ''} · link checked {LINKS_CHECKED}
              </p>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            </div>
          </li>
        ))}
      </ol>
    </>
  )
}
