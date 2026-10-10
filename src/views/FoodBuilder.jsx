import { useMemo, useState } from 'react'
import { DIETS, FOODS, FOOD_CATEGORIES, STARTERS, allowed, foodById } from '../data/foods'
import { Cite, energy, fmt, num } from './HealthTools'

const FOCUS = [
  { id: 'muscle', name: 'Build muscle', sub: 'Protein at every meal', goal: 'gain' },
  { id: 'lose', name: 'Lose fat', sub: 'Full on fewer calories', goal: 'lose' },
  { id: 'maintain', name: 'Maintain', sub: 'Balanced plate', goal: 'maintain' },
  { id: 'longevity', name: 'Longevity', sub: 'Mediterranean style', goal: 'maintain' },
]
const GOAL_TO_FOCUS = { gain: 'muscle', lose: 'lose', maintain: 'maintain' }
const FIXED = ['veg', 'fruit'] // portions we don't shrink when fitting calories
const SOURCE_GROUPS = [
  ['protein', 'Protein & legumes', ['protein', 'legumes']],
  ['carbs', 'Carbs', ['carbs']],
  ['veg', 'Veg', ['veg']],
  ['fruit', 'Fruit', ['fruit']],
  ['dairy', 'Dairy & alternatives', ['dairy']],
  ['fats', 'Nuts, seeds & fats', ['fats']],
]

// ---------- Plan helpers ----------

// Follow a food's swap list until we find something this diet allows
function resolve(id, diet, seen = new Set()) {
  const food = foodById[id]
  if (!food || seen.has(id)) return null
  if (allowed(food, diet)) return id
  seen.add(id)
  for (const s of food.swap) {
    const got = resolve(s, diet, seen)
    if (got) return got
  }
  return null
}

function starter(focus, diet) {
  const plan = {}
  for (const [id, p] of STARTERS[focus]) {
    const got = resolve(id, diet)
    if (got) plan[got] = (plan[got] || 0) + p
  }
  return plan
}

export function totals(plan) {
  const t = { kcal: 0, p: 0, c: 0, f: 0, fibre: 0, byCat: {} }
  for (const [id, n] of Object.entries(plan)) {
    const food = foodById[id]
    if (!food || !n) continue
    t.kcal += food.kcal * n
    t.p += food.p * n
    t.c += food.c * n
    t.f += food.f * n
    t.fibre += food.fibre * n
    t.byCat[food.cat] = (t.byCat[food.cat] || 0) + food.kcal * n
  }
  return t
}

// Scale everything except veg and fruit so the day lands on the calorie target:
// first proportionally (to the nearest ¼ portion), then nudge one ¼ portion at a time.
const STEP = 0.25
const MIN_PORTION = 0.25
const MAX_PORTION = 6
const snap = (n) => Math.min(MAX_PORTION, Math.max(MIN_PORTION, Math.round(n / STEP) * STEP))

function fit(plan, target) {
  const ids = Object.keys(plan).filter((id) => !FIXED.includes(foodById[id].cat))
  if (!ids.length) return plan
  const fixed = Object.keys(plan)
    .filter((id) => FIXED.includes(foodById[id].cat))
    .reduce((a, id) => a + foodById[id].kcal * plan[id], 0)
  const scalable = ids.reduce((a, id) => a + foodById[id].kcal * plan[id], 0)
  const k = Math.max(0.1, (target - fixed) / scalable)
  const next = { ...plan }
  for (const id of ids) next[id] = snap(plan[id] * k)

  let diff = target - totals(next).kcal
  for (let i = 0; i < 60; i++) {
    let best = null
    for (const id of ids) {
      const d = Math.sign(diff) * STEP
      const v = next[id] + d
      if (v < MIN_PORTION || v > MAX_PORTION) continue
      const after = Math.abs(diff - foodById[id].kcal * d)
      if (after < Math.abs(diff) && (!best || after < best.after)) best = { id, v, after }
    }
    if (!best) break
    next[best.id] = best.v
    diff = target - totals(next).kcal
  }
  return next
}

// ---------- Component ----------

export default function FoodBuilder({ t, set }) {
  const focusId = t.focus || GOAL_TO_FOCUS[t.goal] || 'maintain'
  const focus = FOCUS.find((x) => x.id === focusId)
  const e = useMemo(() => energy(t, focus.goal), [t, focus.goal])
  const suggested = useMemo(() => starter(focusId, t.diet), [focusId, t.diet])
  const plan = useMemo(() => t.plan || fit(suggested, e.target), [t.plan, suggested, e.target])
  const tot = totals(plan)
  const fibreTarget = t.sex === 'male' ? 30 : 25
  const [cat, setCat] = useState('protein')
  const [view, setView] = useState('plate')

  const setPortion = (id, d) => {
    const next = { ...plan }
    const v = Math.max(0, Math.round(((next[id] || 0) + d) * 4) / 4)
    if (v) next[id] = v
    else delete next[id]
    set({ plan: next })
  }

  const age = num(t.age)
  const tips = []
  if (t.sex === 'female' && age >= 19 && age <= 50)
    tips.push(['Iron', <>You need about 18 mg of iron a day (men need 8 mg) <Cite n={29} />. Lean red meat, legumes, tofu and leafy greens help; pair plant iron with vitamin C like oranges or capsicum.</>])
  if (age >= 65) tips.push(['Over 65', <>Have protein at every meal, about 25–30 g each, to help protect muscle <Cite n={12} />.</>])
  if (t.diet === 'vegan') tips.push(['Vitamin B12', <>On a vegan diet, take a B12 supplement or eat fortified foods every day <Cite n={30} />.</>])
  if (tot.fibre < fibreTarget)
    tips.push(['Low fibre', <>You’re at {fmt(tot.fibre)} g, under your {fibreTarget} g target <Cite n={26} />. Add legumes, wholegrains, veg or chia.</>, 'warn'])

  const guidance = {
    muscle: (
      <>
        Hit about 1.6 g protein per kg <Cite n={11} /> split over 4+ meals of roughly 0.4 g/kg each, about {fmt(0.4 * e.refW)} g a meal for you{' '}
        <Cite n={21} />. Put most of your carbs around training <Cite n={10} />, and eat slightly above maintenance.
      </>
    ),
    lose: (
      <>
        Fill up on foods with fewer calories per bite: vegetables, fruit, legumes and potatoes <Cite n={22} />. Keep protein high to hold on to
        muscle <Cite n={11} />, and cut back on ultra-processed food, which makes it easy to overeat <Cite n={23} />.
      </>
    ),
    maintain: (
      <>
        Build each plate from the five food groups: vegetables and legumes, fruit, wholegrains, lean protein, and dairy or alternatives{' '}
        <Cite n={25} />.
      </>
    ),
    longevity: (
      <>
        Eat Mediterranean style: olive oil, nuts, fish, legumes, wholegrains and plenty of plants <Cite n={27} />. Aim for 25–30 g of fibre or
        more a day <Cite n={28} />.
      </>
    ),
  }[focusId]

  const rows = [
    ['Calories', tot.kcal, e.target, 'kcal'],
    ['Protein', tot.p, e.protein, 'g'],
    ['Carbs', tot.c, e.carbs, 'g'],
    ['Fat', tot.f, e.fat, 'g'],
    ['Fibre', tot.fibre, fibreTarget, 'g', 26],
  ]
  const kcalTotal = tot.kcal || 1
  const inPlan = Object.keys(plan).sort((a, b) => FOOD_CATEGORIES.findIndex(([c]) => c === foodById[a].cat) - FOOD_CATEGORIES.findIndex(([c]) => c === foodById[b].cat))
  const catFoods = FOODS.filter((x) => x.cat === cat && allowed(x, t.diet))

  return (
    <>
      <section className="ht-card">
        <h2>What’s your focus?</h2>
        <div className="fb-focus">
          {FOCUS.map((x) => (
            <button key={x.id} className={x.id === focusId ? 'on' : ''} onClick={() => set({ focus: x.id, plan: null })} aria-pressed={x.id === focusId}>
              <strong>{x.name}</strong>
              <span>{x.sub}</span>
            </button>
          ))}
        </div>
        <div className="field">
          <span>How you eat</span>
          <div className="fb-chips">
            {DIETS.map(([k, l]) => (
              <button key={k} className={t.diet === k ? 'on' : ''} onClick={() => set({ diet: k, plan: null })} aria-pressed={t.diet === k}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="ht-read fb-guide">
          <h3>{focus.name}</h3>
          <p>{guidance}</p>
        </div>
      </section>

      <div className="fb-layout">
        <aside className="fb-side">
          <section className="ht-card">
            <div className="row between">
              <h2>Today’s totals</h2>
              <span className="tiny">Targets from your Energy tab</span>
            </div>
            <div className="fb-bars">
              {rows.map(([label, v, target, unit, cite]) => {
                const pct = target ? (v / target) * 100 : 0
                const tone = label === 'Fibre' ? (pct >= 100 ? 'good' : 'low') : pct > 110 ? 'over' : pct < 90 ? 'low' : 'good'
                return (
                  <div key={label} className="fb-bar">
                    <span>{label}</span>
                    <span className="fb-track">
                      <i className={tone} style={{ width: `${Math.min(100, pct)}%` }} />
                    </span>
                    <strong>
                      {fmt(v)} / {fmt(target)} {unit} {cite && <Cite n={cite} />}
                    </strong>
                  </div>
                )
              })}
            </div>
            <span className="tiny">Where your calories come from</span>
            <div className="fb-sources" role="img" aria-label={SOURCE_GROUPS.map(([, l, cats]) => `${l} ${Math.round((cats.reduce((a, c) => a + (tot.byCat[c] || 0), 0) / kcalTotal) * 100)}%`).join(', ')}>
              {SOURCE_GROUPS.map(([k, , cats]) => (
                <span key={k} className={`src-${k}`} style={{ width: `${(cats.reduce((a, c) => a + (tot.byCat[c] || 0), 0) / kcalTotal) * 100}%` }} />
              ))}
            </div>
            <ul className="fb-legend">
              {SOURCE_GROUPS.map(([k, l, cats]) => (
                <li key={k}>
                  <i className={`src-${k}`} />
                  {l} {Math.round((cats.reduce((a, c) => a + (tot.byCat[c] || 0), 0) / kcalTotal) * 100)}%
                </li>
              ))}
            </ul>
          </section>
          {tips.length > 0 && (
            <section className="ht-card">
              <h2>Tips for you</h2>
              {tips.map(([title, body, kind]) => (
                <p key={title} className={`ht-note ${kind || ''}`}>
                  <strong>{title}:</strong> {body}
                </p>
              ))}
            </section>
          )}
        </aside>

        <div className="fb-main">
          <section className="ht-card">
            <div className="row between wrap gap-s">
              <div className="fb-swap" role="tablist">
                <button role="tab" aria-selected={view === 'plate'} className={view === 'plate' ? 'on' : ''} onClick={() => setView('plate')}>
                  Your day <span className="fb-count">{inPlan.length}</span>
                </button>
                <button role="tab" aria-selected={view === 'add'} className={view === 'add' ? 'on' : ''} onClick={() => setView('add')}>
                  Add foods
                </button>
              </div>
              <span className="row gap-s">
                <button className="btn btn-ghost small" onClick={() => set({ plan: fit(plan, e.target) })}>
                  Fit to my calories
                </button>
                <button className="btn btn-primary small" onClick={() => set({ plan: null })}>
                  Reset
                </button>
              </span>
            </div>
            <p className="tiny">
              ★ marks foods picked for your focus. Tap + and − to change portions. Values are averages from USDA FoodData Central; brands vary{' '}
              <Cite n={24} />.
            </p>

            {view === 'plate' &&
              (inPlan.length === 0 ? (
                <p className="muted">
                  Nothing on your plate yet.{' '}
                  <button className="link-btn" onClick={() => setView('add')}>
                    Add foods
                  </button>
                </p>
              ) : (
                <ul className="fb-plate">
                  {inPlan.map((id) => {
                    const food = foodById[id]
                    return (
                      <li key={id}>
                        <span className="grow">
                          <span className="strong">
                            {suggested[id] ? '★ ' : ''}
                            {food.name}
                          </span>
                          <span className="tiny block">
                            {plan[id]} × {food.serving} · {fmt(food.kcal * plan[id])} kcal · P {fmt(food.p * plan[id])} g
                          </span>
                        </span>
                        <Stepper value={plan[id]} onMinus={() => setPortion(id, -0.25)} onPlus={() => setPortion(id, 0.25)} label={food.name} />
                      </li>
                    )
                  })}
                </ul>
              ))}

            {view === 'add' && (
              <>
                <div className="fb-cats" role="tablist">
                  {FOOD_CATEGORIES.map(([k, l]) => {
                    const count = Object.keys(plan).filter((id) => foodById[id].cat === k).length
                    return (
                      <button key={k} role="tab" aria-selected={cat === k} className={cat === k ? 'on' : ''} onClick={() => setCat(k)}>
                        {l}
                        {count > 0 && <span className="fb-count">{count}</span>}
                      </button>
                    )
                  })}
                </div>
                <div className="fb-slider">
                  {catFoods.map((food) => {
                    const n = plan[food.id] || 0
                    return (
                      <article key={food.id} className={`fb-food ${n ? 'on' : ''}`}>
                        <div className="row between gap-s">
                          <span className="strong">{food.name}</span>
                          <Stepper value={n} onMinus={() => setPortion(food.id, -0.25)} onPlus={() => setPortion(food.id, n ? 0.25 : 1)} label={food.name} />
                        </div>
                        <span className="tiny">{food.serving}</span>
                        <span className="fb-macros">
                          <strong>{food.kcal}</strong> kcal · P <strong>{food.p}</strong> · C {food.c} · F {food.f} · fibre {food.fibre}
                        </span>
                        <span className={`fb-why ${suggested[food.id] ? 'star' : ''}`}>
                          {suggested[food.id] ? '★ ' : ''}
                          {food.why}
                        </span>
                      </article>
                    )
                  })}
                </div>
                <p className="tiny fb-hint">Swipe or scroll sideways for more →</p>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  )
}

function Stepper({ value, onMinus, onPlus, label }) {
  return (
    <span className="fb-stepper">
      {value > 0 && (
        <>
          <button onClick={onMinus} aria-label={`Less ${label}`}>
            −
          </button>
          <span>{value}</span>
        </>
      )}
      <button className="plus" onClick={onPlus} aria-label={`More ${label}`}>
        +
      </button>
    </span>
  )
}
