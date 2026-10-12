// Health tools calculation tests. Run: npm run test:health
import test from 'node:test'
import assert from 'node:assert/strict'
import { KCAL, aimEnergy, energy, noNumbersReason, restingAll, roundedMacros, summaryText, trainingGuidance, validate, womensHealth } from '../src/lib/healthCalc.js'
import { SOURCES } from '../src/data/healthEvidence.js'

const base = { sex: 'male', age: 30, height: 180, weight: 80, activity: '1.55', goal: 'maintain', deficit: 20, surplus: 10, bodyFat: '', equation: 'msj' }

test('Mifflin-St Jeor matches the published equation', () => {
  // 10×80 + 6.25×180 − 5×30 + 5 = 1780 (male); −161 for female = 1614
  assert.equal(Math.round(restingAll(base).msj), 1780)
  assert.equal(Math.round(restingAll({ ...base, sex: 'female' }).msj), 1614)
})

test('"Not sure" averages the male and female equations', () => {
  assert.equal(Math.round(restingAll({ ...base, sex: 'unsure' }).msj), Math.round((1780 + 1614) / 2))
  assert.ok(energy({ ...base, sex: 'unsure' }).notes.some((n) => /averaged/.test(n.text)))
})

test('macro calories always add back up to the target', () => {
  for (const goal of ['lose', 'maintain', 'gain'])
    for (const w of [50, 68, 95, 140])
      for (const sex of ['male', 'female', 'unsure']) {
        const e = energy({ ...base, goal, weight: w, sex })
        const kcal = e.protein * KCAL.protein + e.carbs * KCAL.carbs + e.fat * KCAL.fat
        assert.equal(kcal, e.macroTotal)
        assert.ok(Math.abs(kcal - e.target) <= 4, `${goal} ${w}kg ${sex}: ${kcal} vs ${e.target}`)
      }
})

test('very low targets drop carbs to zero and never go over', () => {
  const m = roundedMacros(800, 180, 70) // protein + fat alone would be 1350 kcal
  assert.equal(m.carbs, 0)
  assert.ok(m.total <= 800 + 4, `total ${m.total}`)
})

test('protein uses a BMI-25 reference weight above BMI 30', () => {
  const e = energy({ ...base, weight: 140 }) // BMI ≈ 43
  assert.ok(Math.abs(e.refW - 25 * 1.8 ** 2) < 0.01)
})

test('validation catches unrealistic values and allows blanks', () => {
  assert.deepEqual(validate({ ...base, bodyFat: '' }), {})
  const v = validate({ ...base, age: 7, height: 300, weight: 10, bodyFat: 80, sleep: 20 })
  assert.deepEqual(Object.keys(v).sort(), ['age', 'bodyFat', 'height', 'sleep', 'weight'])
})

test('no calorie prescription in pregnancy, breastfeeding or under 18', () => {
  assert.equal(noNumbersReason({ ...base, lifeStage: 'pregnant' }), 'pregnant')
  assert.equal(noNumbersReason({ ...base, lifeStage: 'breastfeeding' }), 'breastfeeding')
  assert.equal(noNumbersReason({ ...base, age: 16 }), 'under18')
  assert.equal(noNumbersReason(base), null)
})

test('training guidance never depends on menstrual cycle phase', () => {
  const plain = trainingGuidance({ ...base, aim: 'muscle' }).map((g) => g.title)
  for (const stage of ['cycle', 'contraception']) assert.deepEqual(trainingGuidance({ ...base, aim: 'muscle', lifeStage: stage }).map((g) => g.title), plain)
  assert.ok(womensHealth({ lifeStage: 'cycle' })[0].text.includes('don’t change your plan by phase'))
  assert.equal(womensHealth({ lifeStage: 'irregular' })[0].kind, 'warn')
})

test('goals map to the calorie target', () => {
  assert.equal(aimEnergy('fat-loss'), 'lose')
  assert.equal(aimEnergy('muscle'), 'gain')
  assert.equal(aimEnergy('longevity'), 'maintain')
})

test('the summary leaves out body details unless asked', () => {
  const e = energy(base)
  assert.ok(!summaryText(base, e).includes('80 kg'))
  assert.ok(summaryText(base, e, { includeBody: true }).includes('80 kg'))
})

test('every citation points at a real source with a link', () => {
  const cited = new Set()
  for (const t of [{ aim: 'muscle' }, { aim: 'fat-loss' }, { aim: 'performance' }, { aim: 'longevity', age: 70, experience: 'new', days: 6, sleep: 5, lifeStage: 'post' }])
    trainingGuidance({ ...base, ...t }).forEach((g) => g.cite.forEach((c) => cited.add(c)))
  for (const s of ['pregnant', 'breastfeeding', 'irregular', 'cycle', 'peri']) womensHealth({ lifeStage: s }).forEach((g) => g.cite.forEach((c) => cited.add(c)))
  for (const c of cited) {
    const src = SOURCES[c - 1]
    assert.ok(src, `source ${c} exists`)
    assert.match(src.url, /^https:\/\//)
  }
})
