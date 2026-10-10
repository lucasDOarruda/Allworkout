import { useState } from 'react'
import { Segmented } from '../components/ui'
import Icon from '../components/Icon'
import { computeStats, fmtDate, fmtKg } from '../lib/utils'

// Progress tab content (lives inside the You page)
export function ProgressBody({ db, userId }) {
  const [metric, setMetric] = useState('volume')
  const { all, totalKg, minutes, streak, prs, badges, weeks } = computeStats(db, userId)
  const earned = badges.filter((b) => b.earned).length
  const thisWeek = weeks[weeks.length - 1]

  return (
    <>
      <section className="card">
        <div className="row between">
          <div>
            <span className="label">This week</span>
            <span className="hero-n">{metric === 'volume' ? fmtKg(thisWeek.volume) : `${thisWeek.count} sessions`}</span>
          </div>
          <Segmented
            options={[
              ['volume', 'Volume'],
              ['count', 'Sessions'],
            ]}
            value={metric}
            onChange={setMetric}
          />
        </div>
        <WeekBars weeks={weeks} metric={metric} />
      </section>

      <div className="tiles">
        <Tile label="Sessions" value={all.length} />
        <Tile label="Weekly streak" value={`${streak} wk${streak === 1 ? '' : 's'}`} />
        <Tile label="Total lifted" value={fmtKg(totalKg)} />
        <Tile label="Minutes" value={minutes.toLocaleString()} />
      </div>

      <section className="card">
        <div className="row between">
          <h2 className="card-h">Badges</h2>
          <span className="muted small">
            {earned}/{badges.length}
          </span>
        </div>
        <div className="badges">
          {badges.map((b) => (
            <div key={b.id} className={`badge-tile ${b.earned ? 'earned' : ''}`} title={b.desc}>
              <span className="badge-icon" aria-hidden="true">
                <Icon name={b.icon} size={24} />
              </span>
              <span className="strong small">{b.name}</span>
              <span className="tiny">{b.earned ? 'Earned' : b.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="card-h">Personal records</h2>
        {prs.length === 0 ? (
          <p className="muted small">Log a “Sets & reps” workout with weights to see your PRs here.</p>
        ) : (
          <table className="pr-table">
            <thead>
              <tr>
                <th>Move</th>
                <th className="num">Best</th>
                <th className="num">Date</th>
              </tr>
            </thead>
            <tbody>
              {prs.slice(0, 12).map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td className="num strong">{p.kg ? `${p.kg} kg × ${p.reps}` : `${p.reps} reps`}</td>
                  <td className="num muted small">{fmtDate(p.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}

function Tile({ label, value }) {
  return (
    <div className="tile">
      <span className="tile-label">{label}</span>
      <span className="tile-value">{value}</span>
    </div>
  )
}

// Single-series bar chart: one purple hue, 4px rounded tops, hover/focus tooltip.
function WeekBars({ weeks, metric }) {
  const [hover, setHover] = useState(null)
  const val = (w) => (metric === 'volume' ? w.volume : w.count)
  const max = Math.max(1, ...weeks.map(val))
  const fmt = (w) => (metric === 'volume' ? fmtKg(w.volume) : `${w.count} ${w.count === 1 ? 'session' : 'sessions'}`)
  return (
    <div className="weekbars">
      <div className="weekbars-plot" style={{ height: 130 }} onMouseLeave={() => setHover(null)}>
        {weeks.map((w, i) => (
          <div
            key={w.key}
            className="weekbars-col"
            tabIndex={0}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            aria-label={`Week of ${w.label}: ${fmt(w)}`}
          >
            {hover === i && (
              <div className="tooltip">
                <span className="strong">{fmt(w)}</span>
                <br />
                <span className="tiny">week of {w.label}</span>
              </div>
            )}
            <div className={`weekbars-bar ${i === weeks.length - 1 ? 'current' : ''}`} style={{ height: val(w) ? `${(val(w) / max) * 100}%` : 2 }} />
          </div>
        ))}
      </div>
      <div className="weekbars-axis">
        {weeks.map((w, i) => (
          <span key={w.key}>{i === weeks.length - 1 ? 'Now' : i % 3 === 0 ? w.label : ''}</span>
        ))}
      </div>
    </div>
  )
}
