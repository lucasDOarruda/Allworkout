// Health tools calculation engine. Plain JavaScript (no React) so it can be tested on its own.
// Every result is an ESTIMATE from published equations, not a measurement.
// Numbers in `cite` are 1-based indexes into SOURCES (src/data/healthEvidence.js).

export const KCAL = { protein: 4, carbs: 4, fat: 9 }
export const KCAL_PER_KG = 7700 // rough energy in 1 kg of body fat
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const EQUATIONS = [
  { id: 'msj', name: 'Mifflin-St Jeor', suits: 'Most adults. The most accurate common equation in reviews.', cite: [1, 2] },
  { id: 'hb', name: 'Harris-Benedict (revised)', suits: 'The classic equation. Tends to read a little high.', cite: [19, 2] },
  { id: 'km', name: 'Katch-McArdle', suits: 'Needs body fat %. Good for lean, muscular people.', cite: [20], needsBf: true },
  { id: 'cun', name: 'Cunningham', suits: 'Needs body fat %. Built for athletes with lots of muscle.', cite: [18], needsBf: true },
  { id: 'avg', name: 'Average of all', suits: 'Smooths out each equation’s quirks.', cite: [] },
]

export const ACTIVITY = [
  ['1.2', 'Mostly sitting, little exercise'],
  ['1.375', 'Light: exercise 1–3 days a week'],
  ['1.55', 'Moderate: exercise 3–5 days a week'],
  ['1.725', 'Very active: hard exercise 6–7 days a week'],
  ['1.9', 'Extra: physical job plus hard training'],
]

// The equations were built from data on people recorded as male or female. This choice only picks
// the equation's constants; it isn't a gender question. "Not sure" averages the two.
export const EQUATION_SEX = [
  ['female', 'Female equation'],
  ['male', 'Male equation'],
  ['unsure', 'Not sure / prefer not to say'],
]

// Primary goals. `energy` is what the calorie target does with it.
export const AIMS = [
  { id: 'fat-loss', label: 'Lose body fat', energy: 'lose' },
  { id: 'muscle', label: 'Build muscle', energy: 'gain' },
  { id: 'maintain', label: 'Maintain', energy: 'maintain' },
  { id: 'performance', label: 'Perform better', energy: 'maintain' },
  { id: 'longevity', label: 'Healthy ageing', energy: 'maintain' },
]
export const aimEnergy = (aim) => AIMS.find((a) => a.id === aim)?.energy || 'maintain'

export const EXPERIENCE = [
  ['new', 'New to training'],
  ['some', 'Under a year'],
  ['regular', '1–3 years'],
  ['experienced', 'More than 3 years'],
]

export const LIFE_STAGES = [
  ['cycle', 'I have regular periods'],
  ['irregular', 'My periods are irregular or have stopped (not menopause)'],
  ['contraception', 'Hormonal contraception changes my periods'],
  ['peri', 'Perimenopause'],
  ['post', 'Post-menopause'],
  ['pregnant', 'Pregnant'],
  ['breastfeeding', 'Breastfeeding'],
]

export const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
export const r = (n, step = 1) => Math.round(n / step) * step
export const fmt = (n) => r(n).toLocaleString()

// ---------- Validation ----------

// Returns { field: message } for answers outside realistic ranges (empty object when fine)
export function validate(t) {
  const e = {}
  const a = num(t.age)
  const h = num(t.height)
  const w = num(t.weight)
  if (t.age !== '' && t.age != null && (a < 13 || a > 110)) e.age = 'Enter an age between 13 and 110.'
  if (t.height !== '' && t.height != null && (h < 120 || h > 230)) e.height = 'Enter a height between 120 and 230 cm.'
  if (t.weight !== '' && t.weight != null && (w < 30 || w > 300)) e.weight = 'Enter a weight between 30 and 300 kg.'
  if (t.bodyFat !== '' && t.bodyFat != null) {
    const bf = num(t.bodyFat)
    if (bf < 3 || bf > 60) e.bodyFat = 'Body fat is usually between 3% and 60%. Leave it blank if you’re not sure.'
  }
  const sleep = t.sleep === '' || t.sleep == null ? null : num(t.sleep)
  if (sleep !== null && (sleep < 2 || sleep > 14)) e.sleep = 'Enter average sleep between 2 and 14 hours.'
  return e
}

// Gentle notes for values that are possible but unusual (not errors)
export function plausibility(t) {
  const notes = []
  const bf = t.bodyFat === '' || t.bodyFat == null ? null : num(t.bodyFat)
  if (bf !== null && t.sex === 'female' && bf < 12) notes.push('Below about 12% body fat is very low for most women. Check how it was measured.')
  if (bf !== null && t.sex === 'male' && bf < 5) notes.push('Below about 5% body fat is very low. Check how it was measured.')
  return notes
}

// ---------- Energy ----------

// Resting energy from every equation we support (lean-mass ones need body fat %)
export function restingAll(t) {
  const w = num(t.weight)
  const h = num(t.height)
  const a = num(t.age)
  const bf = num(t.bodyFat)
  const lbm = bf >= 3 && bf <= 60 ? w * (1 - bf / 100) : null
  const msj = (male) => 10 * w + 6.25 * h - 5 * a + (male ? 5 : -161)
  const hb = (male) => (male ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * a : 447.593 + 9.247 * w + 3.098 * h - 4.33 * a)
  const both = (f) => (t.sex === 'male' ? f(true) : t.sex === 'female' ? f(false) : (f(true) + f(false)) / 2)
  const out = {
    msj: both(msj),
    hb: both(hb),
    km: lbm ? 370 + 21.6 * lbm : null,
    cun: lbm ? 500 + 22 * lbm : null,
  }
  const vals = Object.values(out).filter((v) => v !== null)
  out.avg = vals.reduce((x, y) => x + y, 0) / vals.length
  return { ...out, lbm }
}

// Whole-gram macros that add back up to the calorie target (protein 4, carbs 4, fat 9 kcal/g)
export function roundedMacros(target, protein, fat) {
  let P = Math.round(protein)
  let F = Math.round(fat)
  let C = Math.round((target - P * KCAL.protein - F * KCAL.fat) / KCAL.carbs)
  if (C < 0) {
    // Very low targets: protein first, then fat, carbs at zero
    C = 0
    F = Math.max(0, Math.round((target - P * KCAL.protein) / KCAL.fat))
    if (P * KCAL.protein > target) P = Math.round(target / KCAL.protein)
  }
  const kcal = { protein: P * KCAL.protein, fat: F * KCAL.fat, carbs: C * KCAL.carbs }
  return { protein: P, fat: F, carbs: C, kcal, total: kcal.protein + kcal.fat + kcal.carbs }
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
  if (t.sex === 'unsure') notes.push({ kind: 'info', text: 'We averaged the male and female equations. Your real needs may sit a little above or below this.' })
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
  const proteinRaw = refW * pTarget
  const fatRaw = Math.max(0.6 * refW, (0.25 * target) / 9)
  const m = roundedMacros(target, proteinRaw, fatRaw)
  if (m.carbs === 0) notes.push({ kind: 'warn', text: 'Your target is too low for protein, fat and carbs together, so carbs are at zero. Talk to a dietitian before eating this little.' })
  const weekly = ((target - tdee) * 7) / KCAL_PER_KG

  return {
    bmr,
    tdee,
    target,
    // Whole grams that reconcile with the target
    protein: m.protein,
    fat: m.fat,
    carbs: m.carbs,
    macroKcal: m.kcal,
    macroTotal: m.total,
    pRange,
    refW,
    eq,
    all,
    bmi,
    weekly,
    over65,
    notes,
    // Equations are typically within about ±10% for most people (Frankenfield 2005)
    range: [tdee * 0.9, tdee * 1.1],
  }
}

// ---------- Carb cycling and body measures (unchanged) ----------

export function carbWeek(t, e) {
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

export function body(t) {
  const h = num(t.height)
  const w = num(t.weight)
  const waist = num(t.waist)
  const neck = num(t.neck)
  const hips = num(t.hips)
  const whtr = h ? waist / h : 0
  const whtrCat =
    whtr < 0.4 ? ['Below typical range', 'neutral'] : whtr < 0.5 ? ['Healthy range', 'good'] : whtr < 0.6 ? ['Increased risk', 'warn'] : ['High risk', 'bad']

  // The Navy tape method has separate male and female equations; with "not sure" we don't guess
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

// ---------- Situations where standard equations don't apply ----------

// No personalised calorie target in pregnancy or breastfeeding, or for under-18s
export function noNumbersReason(t) {
  if (t.lifeStage === 'pregnant' || t.pregnant) return 'pregnant'
  if (t.lifeStage === 'breastfeeding') return 'breastfeeding'
  const a = num(t.age)
  if (a > 0 && a < 18) return 'under18'
  return null
}

// ---------- Guidance ----------

// Training guidance from public-health guidelines, shaped by goal, experience and life stage.
// Each item: { title, text, cite }. No item depends on menstrual cycle phase.
export function trainingGuidance(t) {
  const out = []
  const a = num(t.age)
  const days = num(t.days)
  out.push({
    title: 'Strength training',
    text: 'Train all major muscle groups on at least 2 days a week. Progress gradually: a little more weight, reps or sets over time.',
    cite: [31, 32],
  })
  out.push({
    title: 'Cardio fitness',
    text: 'Aim for 150–300 minutes of moderate activity a week, or 75–150 minutes of vigorous activity, or a mix. Some is better than none.',
    cite: [31, 32],
  })
  if (t.aim === 'muscle')
    out.push({
      title: 'Building muscle',
      text: 'Eat enough protein (see your macros), keep a small calorie surplus, and train each muscle group about twice a week. Gaining muscle is slower than gaining weight; aim for steady strength progress.',
      cite: [11, 36],
    })
  if (t.aim === 'fat-loss')
    out.push({
      title: 'Losing fat',
      text: 'Keep lifting to hold on to muscle, keep protein high, and expect scale weight to go up and down day to day with water and food. Judge progress over weeks, not days.',
      cite: [11, 37],
    })
  if (t.aim === 'performance')
    out.push({
      title: 'Performance',
      text: 'Fuel your hard sessions. More carbs around big training days can help (see Carb cycling), and under-eating for your training harms performance and health.',
      cite: [10, 14],
    })
  if (t.aim === 'longevity' || a >= 65)
    out.push({
      title: 'Healthy ageing',
      text: 'Strength, balance and cardio all matter. From middle age, add balance work and keep lifting: strength training is safe and strongly recommended for older adults.',
      cite: [17, 31],
    })
  if (t.experience === 'new')
    out.push({ title: 'Starting out', text: 'Begin with 2–3 full-body sessions a week, learn the movements with lighter weights, and increase slowly.', cite: [31] })
  if (days >= 6) out.push({ title: 'Recovery', text: 'Training 6 or more days a week: make some sessions easy and keep at least one rest day.', cite: [14] })
  const sleep = t.sleep === '' || t.sleep == null ? null : num(t.sleep)
  if (sleep !== null && sleep < 7)
    out.push({ title: 'Sleep', text: 'Adults are advised to sleep 7 or more hours a night. Less sleep can make training feel harder and recovery slower.', cite: [33] })
  if (t.lifeStage === 'peri' || t.lifeStage === 'post')
    out.push({
      title: 'Bone health',
      text: 'Resistance and impact training can help bone density after menopause. Build up gradually, and get advice if you have low bone density.',
      cite: [38, 17],
    })
  return out
}

// Women's health messages. Never changes training by cycle phase.
export function womensHealth(t) {
  const out = []
  if (t.lifeStage === 'pregnant')
    out.push({
      kind: 'info',
      text: 'If you and your baby are healthy, regular physical activity in pregnancy is recommended, adapted as your body changes. Your energy needs change through pregnancy, so we don’t give a calorie target. Talk to your midwife or GP about nutrition and any symptoms.',
      cite: [35, 34],
    })
  if (t.lifeStage === 'breastfeeding')
    out.push({
      kind: 'info',
      text: 'Breastfeeding raises energy needs, and how much varies a lot. We don’t give a calorie target. Avoid strict dieting and talk to your GP or an accredited dietitian.',
      cite: [34],
    })
  if (t.lifeStage === 'irregular')
    out.push({
      kind: 'warn',
      text: 'Missing or irregular periods can be a sign of not eating enough for your training (low energy availability). Please see your GP, especially before trying to lose weight.',
      cite: [14],
    })
  if (t.lifeStage === 'cycle' || t.lifeStage === 'contraception')
    out.push({
      kind: 'info',
      text: 'On average, performance changes across the menstrual cycle are small, so we don’t change your plan by phase. If symptoms affect a session, adjust that day based on how you feel.',
      cite: [13],
    })
  if (t.lifeStage === 'peri' || t.lifeStage === 'post')
    out.push({
      kind: 'info',
      text: 'Menopause can change sleep, energy and body composition. Strength and impact training support muscle and bone. Talk to your GP about symptoms that affect your daily life.',
      cite: [38],
    })
  return out
}

// One-line summary for copying or sharing (no body details unless asked)
export function summaryText(t, e, { includeBody = false } = {}) {
  const lines = [
    'All Workout · Energy & macros (estimate)',
    `Daily target: ${fmt(e.target)} kcal`,
    `Protein ${e.protein} g · Carbs ${e.carbs} g · Fat ${e.fat} g`,
    `Maintenance: ${fmt(e.range[0])}–${fmt(e.range[1])} kcal · Resting: ${fmt(e.bmr)} kcal`,
  ]
  if (includeBody) lines.push(`Based on: ${num(t.age)} y, ${num(t.height)} cm, ${num(t.weight)} kg`)
  lines.push('Estimates from published equations, not medical advice.')
  return lines.join('\n')
}
