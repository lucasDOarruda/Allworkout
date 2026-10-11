// Personal trainer applications: the options and checks shared by the application form
// and the admin review. Trainers are approved by an admin before they can publish or sell.

export const TERMS_VERSION = '2026-10-11'

export const QUALIFICATIONS = [
  ['cert3-4', 'Certificate III and IV in Fitness (SIS30321 / SIS40221)'],
  ['cert4', 'Certificate IV in Fitness (SIS40221)'],
  ['diploma', 'Diploma of Sport or Fitness'],
  ['degree', 'Bachelor of Exercise or Sport Science'],
  ['aep', 'Accredited Exercise Physiologist (ESSA)'],
  ['other', 'Other equivalent qualification'],
]

export const REGISTRATIONS = [
  ['ausactive', 'AUSactive'],
  ['paa', 'Physical Activity Australia'],
  ['essa', 'ESSA'],
  ['other', 'Other'],
  ['none', 'Not registered'],
]

export const label = (list, key) => list.find(([k]) => k === key)?.[1] || key || '–'

// ABN check digits (Australian Business Register algorithm)
export function validAbn(raw) {
  const d = String(raw || '').replace(/\s/g, '')
  if (!/^\d{11}$/.test(d)) return false
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
  const sum = [...d].reduce((s, ch, i) => s + (Number(ch) - (i === 0 ? 1 : 0)) * weights[i], 0)
  return sum % 89 === 0
}

export const formatAbn = (raw) => {
  const d = String(raw || '').replace(/\D/g, '')
  return d.length === 11 ? `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}` : d
}

export const abnLookupUrl = (abn) => `https://abr.business.gov.au/ABN/View?abn=${String(abn).replace(/\D/g, '')}`

export function ageFrom(dob) {
  if (!dob) return null
  const b = new Date(dob)
  if (Number.isNaN(b.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--
  return age
}

// A date string (YYYY-MM-DD) that is today or later
export const notExpired = (date) => !!date && date >= new Date().toLocaleDateString('en-CA')

export const DECLARATIONS = [
  ['accurate', 'The details and documents I’ve provided are true and my own.'],
  ['current', 'I’ll keep my qualification, first aid and CPR, and insurance current, and tell All Workout if any of them lapse.'],
  ['scope', 'I’ll screen members before training them (for example with the Adult Pre-Exercise Screening System), work within my scope of practice and refer people to health professionals when needed.'],
  ['terms', 'I agree to the Terms of Service, including the section for trainers, and the Privacy Policy.'],
]

export const EMPTY_APPLICATION = {
  fullName: '',
  dob: '',
  phone: '',
  abn: '',
  businessName: '',
  qualification: 'cert3-4',
  provider: '',
  completedYear: '',
  certNumber: '',
  registration: 'ausactive',
  registrationNumber: '',
  firstAidExpiry: '',
  insurer: '',
  insuranceExpiry: '',
  specialties: '',
  bio: '',
}

// Returns { field: message } for anything that needs fixing
export function checkApplication(a, certificate, agreed) {
  const e = {}
  if ((a.fullName || '').trim().length < 3) e.fullName = 'Enter your full legal name.'
  const age = ageFrom(a.dob)
  if (age === null) e.dob = 'Enter your date of birth.'
  else if (age < 18) e.dob = 'Trainers must be 18 or older.'
  else if (age > 100) e.dob = 'Check your date of birth.'
  if (!/^\+?[\d\s()-]{8,16}$/.test(a.phone || '')) e.phone = 'Enter a phone number.'
  if (!validAbn(a.abn)) e.abn = 'That isn’t a valid ABN. It has 11 digits, e.g. 42 327 513 086.'
  if ((a.provider || '').trim().length < 2) e.provider = 'Enter the training provider (RTO or university).'
  const y = Number(a.completedYear)
  if (!y || y < 1970 || y > new Date().getFullYear()) e.completedYear = 'Enter the year you completed it.'
  if (a.registration !== 'none' && !(a.registrationNumber || '').trim()) e.registrationNumber = 'Enter your registration number.'
  if (!notExpired(a.firstAidExpiry)) e.firstAidExpiry = 'First aid and CPR must be current.'
  if ((a.insurer || '').trim().length < 2) e.insurer = 'Enter your insurer.'
  if (!notExpired(a.insuranceExpiry)) e.insuranceExpiry = 'Insurance must be current.'
  if (!certificate) e.certificate = 'Add a photo or scan of your certificate.'
  if (DECLARATIONS.some(([k]) => !agreed[k])) e.declarations = 'Tick each statement to continue.'
  return e
}

// 'YYYY-MM-DD' → '1 Mar 2027' (with the year, for birthdays and expiry dates)
export const fmtDay = (d) => (d ? new Date(`${d}T00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '–')
