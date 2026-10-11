// Members' main goal, asked at sign-up and editable in Settings
export const GOALS = [
  ['lose-weight', 'Lose weight'],
  ['build-muscle', 'Build muscle'],
  ['get-stronger', 'Get stronger'],
  ['get-fit', 'Get fitter'],
  ['health', 'Feel healthier'],
  ['event', 'Train for an event'],
]
export const goalLabel = (k) => GOALS.find(([g]) => g === k)?.[1] || ''

// Calculator names for the admin's calculator-use chart
export const TOOL_LABELS = {
  energy: 'Energy & macros',
  food: 'Food builder',
  carbs: 'Carb cycling',
  body: 'Beyond BMI',
  goal_lose: 'Goal picked: lose fat',
  goal_maintain: 'Goal picked: maintain',
  goal_gain: 'Goal picked: gain muscle',
}
