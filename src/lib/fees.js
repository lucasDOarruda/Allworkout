// Platform fee on every paid sale. The community share is part of the fee, not on top of it.
// Keep in sync with the backend (PLATFORM_FEE_PCT / COMMUNITY_SHARE_PCT).
export const FEES = {
  platformPct: 10, // taken from each sale
  communityPct: 3, // of the sale, goes to the community health awareness fund
}
export const runningPct = FEES.platformPct - FEES.communityPct // app hosting + payment processing
export const coachPct = 100 - FEES.platformPct

const round2 = (n) => Math.round(n * 100) / 100

// "$12", "A$12.50", "12 €" → { amount: 12.5, symbol: 'A$' }
export function parsePrice(price) {
  const s = String(price || '')
  const m = s.match(/(\d+(?:[.,]\d{1,2})?)/)
  const amount = m ? Number(m[1].replace(',', '.')) : 0
  const symbol = s.replace(/[\d.,\s]/g, '').trim() || '$'
  return { amount, symbol }
}

export function splitSale(price) {
  const { amount, symbol } = parsePrice(price)
  const fee = round2((amount * FEES.platformPct) / 100)
  const community = round2((amount * FEES.communityPct) / 100)
  return { amount, symbol, fee, community, running: round2(fee - community), coach: round2(amount - fee) }
}

export const money = (n, symbol = '$') => `${symbol}${n.toFixed(2).replace(/\.00$/, '')}`

// Totals across every unlocked (paid) premium workout
export function salesTotals(workouts) {
  const t = { sales: 0, gross: 0, fee: 0, community: 0, running: 0, coach: 0 }
  for (const w of workouts) {
    if (!w.premium) continue
    for (let i = 0; i < (w.unlocked || []).length; i++) {
      const s = splitSale(w.price)
      t.sales++
      t.gross += s.amount
      t.fee += s.fee
      t.community += s.community
      t.running += s.running
      t.coach += s.coach
    }
  }
  for (const k of Object.keys(t)) t[k] = round2(t[k])
  return t
}
