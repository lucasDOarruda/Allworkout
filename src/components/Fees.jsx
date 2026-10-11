import { FEES, coachPct, money, runningPct, splitSale } from '../lib/fees'

// Stacked bar: where each sale goes
export function FeeBar({ price }) {
  const s = price ? splitSale(price) : null
  const rows = [
    ['coach', 'Trainer', coachPct, s && money(s.coach, s.symbol)],
    ['running', 'Running the app & payments', runningPct, s && money(s.running, s.symbol)],
    ['community', 'Community health awareness', FEES.communityPct, s && money(s.community, s.symbol)],
  ]
  return (
    <div className="feebar">
      <div className="feebar-track" role="img" aria-label={rows.map(([, l, p]) => `${l} ${p}%`).join(', ')}>
        {rows.map(([k, , p]) => (
          <span key={k} className={`fee-${k}`} style={{ width: `${p}%` }} />
        ))}
      </div>
      <ul className="feebar-legend">
        {rows.map(([k, label, p, amt]) => (
          <li key={k}>
            <span className={`fee-dot fee-${k}`} aria-hidden="true" />
            <span className="grow">{label}</span>
            <strong>{amt || `${p}%`}</strong>
            {amt && <span className="tiny"> ({p}%)</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
