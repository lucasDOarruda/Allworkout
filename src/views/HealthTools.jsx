import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import FoodBuilder from './FoodBuilder'

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
}

const doi = (d) => `https://doi.org/${d}`
const scholar = (q) => `https://scholar.google.com/scholar?q=${encodeURIComponent(q)}`

export const SOURCES = [
  { claim: 'The Mifflin-St Jeor equation estimates resting energy use.', ref: 'Mifflin MD, St Jeor ST, et al. Am J Clin Nutr. 1990;51(2):241–247.', url: doi('10.1093/ajcn/51.2.241'), label: 'doi.org/10.1093/ajcn/51.2.241' },
  { claim: 'Mifflin-St Jeor was the most accurate common equation, yet still missed by more than 10% for a sizeable share of people.', ref: 'Frankenfield D, Roth-Yousey L, Compher C. J Am Diet Assoc. 2005;105(5):775–789.', url: doi('10.1016/j.jada.2005.02.005'), label: 'doi.org/10.1016/j.jada.2005.02.005' },
  { claim: 'Energy use adjusted for body size is stable from about 20 to 60 and declines slowly after 60.', ref: 'Pontzer H, et al. Daily energy expenditure through the human life course. Science. 2021;373(6556):808–812.', url: doi('10.1126/science.abe5017'), label: 'doi.org/10.1126/science.abe5017' },
  { claim: 'A BMI of 30 or more misses about half of people with excess body fat.', ref: 'Okorodudu DO, et al. Int J Obes. 2010;34(5):791–799.', url: doi('10.1038/ijo.2010.5'), label: 'doi.org/10.1038/ijo.2010.5' },
  { claim: 'BMI alone is an imperfect clinical measure and should be used with other measures.', ref: 'American Medical Association policy on BMI, June 2023.', url: scholar('AMA adopts new policy clarifying role of BMI as a measure in medicine 2023'), label: 'Search: AMA BMI policy 2023' },
  { claim: 'Keep your waist to less than half your height; 0.5–0.59 is increased risk and 0.6 or more is high risk.', ref: 'NICE. Obesity: identification and classification, waist-to-height ratio update (2022).', url: scholar('NICE waist-to-height ratio 2022 obesity identification'), label: 'Search: NICE waist-to-height ratio' },
  { claim: 'Waist-to-height ratio predicts heart and diabetes risk better than BMI, with one cut-off for women, men and different backgrounds.', ref: 'Ashwell M, Gunn P, Gibson S. Obes Rev. 2012;13(3):275–286.', url: doi('10.1111/j.1467-789X.2011.00952.x'), label: 'doi.org/10.1111/j.1467-789X.2011.00952.x' },
  { claim: 'The US Navy tape method estimates body fat from neck, waist, hips and height, typically within about 3–4 percentage points.', ref: 'Hodgdon JA, Beckett MB. Naval Health Research Center reports 84-11 and 84-29, 1984.', url: scholar('Hodgdon Beckett 1984 prediction of percent body fat Navy circumferences'), label: 'Search: Hodgdon & Beckett 1984' },
  { claim: 'When calories and protein are matched, changing the carb/fat mix makes little difference to fat loss.', ref: 'Hall KD, Guo J. Obesity energetics. Gastroenterology. 2017;152(7):1718–1727.', url: doi('10.1053/j.gastro.2017.01.052'), label: 'doi.org/10.1053/j.gastro.2017.01.052' },
  { claim: 'Carb periodisation (“fuel for the work required”) is a performance strategy for hard sessions.', ref: 'Impey SG, et al. Sports Med. 2018;48(5):1031–1048.', url: doi('10.1007/s40279-018-0867-7'), label: 'doi.org/10.1007/s40279-018-0867-7' },
  { claim: 'About 1.6 g of protein per kg a day maximises strength-training gains, with benefit up to about 2.2 g/kg for some.', ref: 'Morton RW, et al. Br J Sports Med. 2018;52(6):376–384.', url: doi('10.1136/bjsports-2017-097608'), label: 'doi.org/10.1136/bjsports-2017-097608' },
  { claim: 'Older adults need more protein: about 1.0–1.2 g/kg, and 1.2–1.5 g/kg if active or unwell.', ref: 'Bauer J, et al. PROT-AGE Study Group. J Am Med Dir Assoc. 2013;14(8):542–559.', url: doi('10.1016/j.jamda.2013.05.021'), label: 'doi.org/10.1016/j.jamda.2013.05.021' },
  { claim: 'On average, performance changes across the menstrual cycle are trivial; general cycle-based guidance isn’t supported.', ref: 'McNulty KL, et al. Sports Med. 2020;50(10):1813–1827.', url: doi('10.1007/s40279-020-01319-3'), label: 'doi.org/10.1007/s40279-020-01319-3' },
  { claim: 'Eating too little for your training (REDs) harms hormones, bones, mood and performance in women and men.', ref: 'Mountjoy M, et al. 2023 IOC consensus statement on REDs. Br J Sports Med. 2023;57(17):1073–1097.', url: doi('10.1136/bjsports-2023-106994'), label: 'doi.org/10.1136/bjsports-2023-106994' },
  { claim: 'In adults over 65, a BMI of about 27–28 is linked with the lowest risk of death.', ref: 'Winter JE, et al. Am J Clin Nutr. 2014;99(4):875–890.', url: doi('10.3945/ajcn.113.068122'), label: 'doi.org/10.3945/ajcn.113.068122' },
  { claim: 'Asian populations have higher health risk at lower BMI, so lower cut-offs (23 and 27.5) are used.', ref: 'WHO Expert Consultation. Lancet. 2004;363(9403):157–163.', url: doi('10.1016/S0140-6736(03)15268-3'), label: 'doi.org/10.1016/S0140-6736(03)15268-3' },
  { claim: 'Strength training is safe and strongly recommended for older adults.', ref: 'Fragala MS, et al. NSCA position statement. J Strength Cond Res. 2019;33(8):2019–2052.', url: doi('10.1519/JSC.0000000000003230'), label: 'doi.org/10.1519/JSC.0000000000003230' },
  { claim: 'When body fat is known, resting energy can be estimated from lean mass (Cunningham equation).', ref: 'Cunningham JJ. Am J Clin Nutr. 1980;33(11):2372–2374.', url: doi('10.1093/ajcn/33.11.2372'), label: 'doi.org/10.1093/ajcn/33.11.2372' },
  { claim: 'The revised Harris-Benedict equation for resting energy.', ref: 'Roza AM, Shizgal HM. Am J Clin Nutr. 1984;40(1):168–182.', url: doi('10.1093/ajcn/40.1.168'), label: 'doi.org/10.1093/ajcn/40.1.168' },
  { claim: 'The Katch-McArdle equation estimates resting energy from lean body mass.', ref: 'McArdle WD, Katch FI, Katch VL. Exercise Physiology: Nutrition, Energy, and Human Performance.', url: scholar('Katch McArdle equation resting metabolic rate lean body mass'), label: 'Search: Katch-McArdle equation' },
  { claim: 'About 0.4 g/kg of protein per meal across at least four meals supports muscle growth.', ref: 'Schoenfeld BJ, Aragon AA. J Int Soc Sports Nutr. 2018;15:10.', url: doi('10.1186/s12970-018-0215-1'), label: 'doi.org/10.1186/s12970-018-0215-1' },
  { claim: 'Foods with fewer calories per gram (vegetables, fruit, soups, potatoes) help people feel full on less energy.', ref: 'Rolls BJ. The relationship between dietary energy density and energy intake. Physiol Behav. 2009;97(5):609–615.', url: doi('10.1016/j.physbeh.2009.03.011'), label: 'doi.org/10.1016/j.physbeh.2009.03.011' },
  { claim: 'People ate about 500 kcal a day more on an ultra-processed diet than on an unprocessed one.', ref: 'Hall KD, et al. Cell Metab. 2019;30(1):67–77.', url: doi('10.1016/j.cmet.2019.05.008'), label: 'doi.org/10.1016/j.cmet.2019.05.008' },
  { claim: 'Food values are averages from USDA FoodData Central; brands vary.', ref: 'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central.', url: 'https://fdc.nal.usda.gov/', label: 'fdc.nal.usda.gov' },
  { claim: 'The Australian Dietary Guidelines: a plate built from the five food groups.', ref: 'National Health and Medical Research Council. Australian Dietary Guidelines. 2013.', url: 'https://www.eatforhealth.gov.au/guidelines', label: 'eatforhealth.gov.au/guidelines' },
  { claim: 'Adequate fibre intake is about 30 g a day for men and 25 g for women.', ref: 'NHMRC. Nutrient Reference Values for Australia and New Zealand: Dietary fibre.', url: 'https://www.eatforhealth.gov.au/nutrient-reference-values/nutrients/dietary-fibre', label: 'eatforhealth.gov.au · dietary fibre' },
  { claim: 'A Mediterranean diet with extra olive oil or nuts reduced major cardiovascular events.', ref: 'Estruch R, et al. PREDIMED. N Engl J Med. 2018;378:e34.', url: doi('10.1056/NEJMoa1800389'), label: 'doi.org/10.1056/NEJMoa1800389' },
  { claim: 'Eating 25–29 g of fibre a day or more is linked with lower death and disease risk.', ref: 'Reynolds A, et al. Carbohydrate quality and human health. Lancet. 2019;393(10170):434–445.', url: doi('10.1016/S0140-6736(18)31809-9'), label: 'doi.org/10.1016/S0140-6736(18)31809-9' },
  { claim: 'Women aged 19–50 need about 18 mg of iron a day, compared with 8 mg for men.', ref: 'NHMRC. Nutrient Reference Values for Australia and New Zealand: Iron.', url: 'https://www.eatforhealth.gov.au/nutrient-reference-values/nutrients/iron', label: 'eatforhealth.gov.au · iron' },
  { claim: 'Well-planned vegan diets are healthy, but need a reliable source of vitamin B12.', ref: 'Melina V, Craig W, Levin S. Position of the Academy of Nutrition and Dietetics: vegetarian diets. J Acad Nutr Diet. 2016;116(12):1970–1980.', url: doi('10.1016/j.jand.2016.09.025'), label: 'doi.org/10.1016/j.jand.2016.09.025' },
]

export const EQUATIONS = [
  { id: 'msj', name: 'Mifflin-St Jeor', suits: 'Most adults. The most accurate common equation in reviews.', cite: [1, 2] },
  { id: 'hb', name: 'Harris-Benedict (revised)', suits: 'The classic equation. Tends to read a little high.', cite: [19, 2] },
  { id: 'km', name: 'Katch-McArdle', suits: 'Needs body fat %. Good for lean, muscular people.', cite: [20], needsBf: true },
  { id: 'cun', name: 'Cunningham', suits: 'Needs body fat %. Built for athletes with lots of muscle.', cite: [18], needsBf: true },
  { id: 'avg', name: 'Average of all', suits: 'Smooths out each equation’s quirks.', cite: [] },
]

const ACTIVITY = [
  ['1.2', 'Mostly sitting, little exercise'],
  ['1.375', 'Light: exercise 1–3 days a week'],
  ['1.55', 'Moderate: exercise 3–5 days a week'],
  ['1.725', 'Very active: hard exercise 6–7 days a week'],
  ['1.9', 'Extra: physical job plus hard training'],
]
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const KCAL_PER_KG = 7700 // rough energy in 1 kg of body fat

export const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
export const r = (n, step = 1) => Math.round(n / step) * step
export const fmt = (n) => r(n).toLocaleString()

// ---------- Calculations ----------

// Resting energy from every equation we support (lean-mass ones need body fat %)
export function restingAll(t) {
  const w = num(t.weight)
  const h = num(t.height)
  const a = num(t.age)
  const bf = num(t.bodyFat)
  const male = t.sex === 'male'
  const lbm = bf >= 3 && bf <= 60 ? w * (1 - bf / 100) : null
  const out = {
    msj: 10 * w + 6.25 * h - 5 * a + (male ? 5 : -161),
    hb: male ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * a : 447.593 + 9.247 * w + 3.098 * h - 4.33 * a,
    km: lbm ? 370 + 21.6 * lbm : null,
    cun: lbm ? 500 + 22 * lbm : null,
  }
  const vals = Object.values(out).filter((v) => v !== null)
  out.avg = vals.reduce((x, y) => x + y, 0) / vals.length
  return { ...out, lbm }
}

export function energy(t, goalOverride) {
  if (goalOverride) t = { ...t, goal: goalOverride }
  const w = num(t.weight)
  const h = num(t.height)
  const a = num(t.age)
  const all = restingAll(t)
  const notes = []
  let eq = EQUATIONS.find((x) => x.id === t.equation) || EQUATIONS[0]
  if (eq.needsBf && !all.lbm) {
    notes.push({ kind: 'info', text: `${eq.name} needs your body fat %, so we’re using Mifflin-St Jeor for now.` })
    eq = EQUATIONS[0]
  }
  const bmr = all[eq.id]
  const tdee = bmr * num(t.activity)
  const over65 = a >= 65

  let target = tdee
  if (t.goal === 'lose') {
    target = tdee * (1 - num(t.deficit) / 100)
    if (over65) {
      const maxDeficit = (0.005 * w * KCAL_PER_KG) / 7
      if (tdee - target > maxDeficit) {
        target = tdee - maxDeficit
        notes.push({ kind: 'info', text: 'Over 65, we cap weight loss at 0.5% of body weight a week to help protect muscle and bone.' })
      }
    }
    if (num(t.deficit) > 25) notes.push({ kind: 'warn', text: 'A deficit above 25% is hard to sustain and raises the risk of losing muscle and under-fuelling.', cite: [14] })
  } else if (t.goal === 'gain') {
    target = tdee * (1 + num(t.surplus) / 100)
  }
  if (target < bmr) {
    target = bmr
    notes.push({ kind: 'warn', text: 'Your target was raised to your resting energy. Eating below it isn’t recommended without medical supervision.', cite: [14] })
  }

  // Protein: per kg, using a reference weight at BMI 25 when BMI is over 30
  const bmi = w / (h / 100) ** 2
  const refW = bmi > 30 ? 25 * (h / 100) ** 2 : w
  const pRange = over65 ? [1.2, 1.5] : t.goal === 'maintain' ? [1.2, 1.6] : [1.6, 2.2]
  const pTarget = over65 ? 1.4 : t.goal === 'maintain' ? 1.4 : 1.8
  const protein = refW * pTarget
  const fat = Math.max(0.6 * refW, (0.25 * target) / 9)
  const carbs = Math.max(0, (target - protein * 4 - fat * 9) / 4)
  const weekly = ((target - tdee) * 7) / KCAL_PER_KG

  return { bmr, tdee, target, protein, fat, carbs, pRange, refW, eq, all, bmi, weekly, over65, notes }
}

function carbWeek(t, e) {
  const n = t.hardDays.length
  const m = 7 - n
  const s = num(t.swing)
  const a = n && m ? (2 * s * m) / 7 : 0 // extra on hard days
  const b = n && m ? (2 * s * n) / 7 : 0 // less on rest days
  const hi = e.carbs * (1 + a)
  const lo = e.carbs * (1 - b)
  const days = DAYS.map((d, i) => {
    const hard = t.hardDays.includes(i)
    const carbs = hard ? hi : lo
    return { day: d, hard, carbs, kcal: e.protein * 4 + e.fat * 9 + carbs * 4 }
  })
  return { hi, lo, days, weekly: days.reduce((acc, d) => acc + d.kcal, 0) }
}

function body(t) {
  const h = num(t.height)
  const w = num(t.weight)
  const waist = num(t.waist)
  const neck = num(t.neck)
  const hips = num(t.hips)
  const whtr = h ? waist / h : 0
  const whtrCat =
    whtr < 0.4 ? ['Below typical range', 'neutral'] : whtr < 0.5 ? ['Healthy range', 'good'] : whtr < 0.6 ? ['Increased risk', 'warn'] : ['High risk', 'bad']

  let bf = null
  if (t.sex === 'male' && waist > neck && h) bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(h)) - 450
  if (t.sex === 'female' && waist + hips > neck && h) bf = 495 / (1.29579 - 0.35004 * Math.log10(waist + hips - neck) + 0.221 * Math.log10(h)) - 450
  if (bf !== null && (!Number.isFinite(bf) || bf < 2 || bf > 70)) bf = null

  const bmi = h ? w / (h / 100) ** 2 : 0
  const lower = t.background === 'lower'
  const cuts = lower ? [18.5, 23, 27.5] : [18.5, 25, 30]
  const bmiCat = bmi < cuts[0] ? 'Underweight' : bmi < cuts[1] ? 'Healthy weight' : bmi < cuts[2] ? 'Overweight' : 'Obesity'
  return { whtr, whtrCat, targetWaist: h / 2, bf, bmi, bmiCat, cuts }
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
  const blocked = t.pregnant || (a > 0 && a < 18)

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

        {tab !== 'evidence' && <AboutYou t={t} set={set} />}

        {tab !== 'evidence' && blocked ? (
          <section className="ht-card ht-notice">
            <h2>We won’t show numbers for you here</h2>
            {t.pregnant ? (
              <p>
                Energy and weight needs change a lot during pregnancy and breastfeeding, and general equations don’t apply. Please talk
                to your midwife, GP or an accredited dietitian.
              </p>
            ) : (
              <p>These equations are for adults. If you’re under 18, please talk to your GP or an accredited dietitian about energy and growth.</p>
            )}
          </section>
        ) : (
          <>
            {tab === 'energy' && <Energy t={t} set={set} e={e} />}
            {tab === 'food' && <FoodBuilder t={t} set={set} />}
            {tab === 'carbs' && <Carbs t={t} set={set} e={e} />}
            {tab === 'body' && <Body t={t} set={set} />}
          </>
        )}
        {tab === 'evidence' && <Evidence flash={flash} />}

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
          <p className="tiny">Your details are saved only in this browser.</p>
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
          {t.sex === 'male' ? 'Male' : 'Female'} · {t.age} y · {t.height} cm · {t.weight} kg{t.pregnant ? ' · pregnant/breastfeeding' : ''}
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
            {['female', 'male'].map((s) => (
              <button key={s} className={t.sex === s ? 'on' : ''} onClick={() => set({ sex: s })} aria-pressed={t.sex === s}>
                {s === 'female' ? 'Female' : 'Male'}
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
      {t.sex === 'female' && (
        <label className="check">
          <input type="checkbox" checked={t.pregnant} onChange={(e) => set({ pregnant: e.target.checked })} />
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
      <p className="tiny">{SOURCES.length} sources. Scroll the list, or tap any [n] on the page to jump here.</p>
      <ol className="ht-sources">
        {SOURCES.map((s, i) => (
          <li key={i} id={`src-${i + 1}`} className={`ht-card ${flash === i + 1 ? 'flash' : ''}`}>
            <span className="ht-src-n">{i + 1}</span>
            <div>
              <p className="strong">{s.claim}</p>
              <p className="tiny">{s.ref}</p>
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
