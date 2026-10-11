import { useState } from 'react'

// Single-series column chart: one hue, thin bars with 4px rounded tops,
// recessive axis, hover/focus tooltip. The newest bar is emphasised.
export function ColumnChart({ data, format = (v) => v, height = 150, label, nowLabel = 'Now' }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="chart" role="img" aria-label={label}>
      <div className="chart-max tiny">{format(max)}</div>
      <div className="weekbars-plot" style={{ height }} onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <div
            key={d.key}
            className="weekbars-col"
            tabIndex={0}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            aria-label={`${d.label}: ${format(d.value)}`}
          >
            {hover === i && (
              <div className="tooltip">
                <span className="strong">{format(d.value)}</span>
                <br />
                <span className="tiny">{d.label}</span>
              </div>
            )}
            <div className={`weekbars-bar ${i === data.length - 1 ? 'current' : ''}`} style={{ height: d.value ? `${(d.value / max) * 100}%` : 2 }} />
          </div>
        ))}
      </div>
      <div className="weekbars-axis">
        {data.map((d, i) => (
          <span key={d.key}>{i === data.length - 1 ? nowLabel || d.short : i % (data.length > 14 ? 7 : 3) === 0 ? d.short : ''}</span>
        ))}
      </div>
    </div>
  )
}

// Ranked horizontal bars for "top N" lists (magnitude, one hue)
export function BarList({ rows, format = (v) => v, empty = 'Nothing yet.' }) {
  if (!rows.length) return <p className="muted small">{empty}</p>
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="barlist">
      {rows.map((r) => (
        <li key={r.key}>
          <span className="barlist-label">
            {r.label}
            {r.sub && <span className="tiny block">{r.sub}</span>}
          </span>
          <span className="barlist-track">
            <i style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <strong className="barlist-v">{format(r.value)}</strong>
        </li>
      ))}
    </ul>
  )
}
