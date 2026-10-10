import { exerciseById } from '../data/exercises'

// Stylised anatomy figure (front + back) drawn in SVG.
// viewBox is 400 × 780; the figure is centred on x = 200 and mirrored.

const mirror = (x) => 400 - x

// Hotspot dot + label placement, per side
const SPOTS = {
  front: [
    { muscle: 'Cardio', side: 'right', ly: 92, dot: [300, 86], heart: true },
    { muscle: 'Shoulders', side: 'left', ly: 150, dot: [126, 170] },
    { muscle: 'Chest', side: 'left', ly: 222, dot: [178, 196] },
    { muscle: 'Biceps', side: 'right', ly: 238, dot: [290, 236] },
    { muscle: 'Abs', side: 'right', ly: 288, dot: [208, 268] },
    { muscle: 'Forearms', side: 'left', ly: 316, dot: [96, 345] },
    { muscle: 'Obliques', side: 'left', ly: 392, dot: [158, 292] },
    { muscle: 'Quads', side: 'left', ly: 478, dot: [172, 540] },
    { muscle: 'Adductors', side: 'right', ly: 560, dot: [208, 506] },
  ],
  back: [
    { muscle: 'Cardio', side: 'right', ly: 92, dot: [300, 86], heart: true },
    { muscle: 'Traps & Neck', side: 'left', ly: 138, dot: [200, 150] },
    { muscle: 'Triceps', side: 'left', ly: 236, dot: [108, 238] },
    { muscle: 'Lats', side: 'right', ly: 236, dot: [246, 236] },
    { muscle: 'Lower back', side: 'right', ly: 340, dot: [200, 322] },
    { muscle: 'Abductors', side: 'left', ly: 396, dot: [142, 412] },
    { muscle: 'Glutes', side: 'right', ly: 438, dot: [228, 414] },
    { muscle: 'Hamstrings', side: 'left', ly: 520, dot: [174, 548] },
    { muscle: 'Calves', side: 'left', ly: 636, dot: [176, 662] },
  ],
}

export const viewOf = (muscle) => (SPOTS.back.some((s) => s.muscle === muscle && !s.heart) ? 'back' : 'front')

// Highlight shapes for each muscle (left side; mirrored automatically)
function Region({ muscle, className }) {
  const both = (el) => (
    <>
      {el(false)}
      {el(true)}
    </>
  )
  const X = (x, flip) => (flip ? mirror(x) : x)
  const line = (x1, y1, x2, y2, w) => both((f) => <line x1={X(x1, f)} y1={y1} x2={X(x2, f)} y2={y2} strokeWidth={w} className={className} />)
  const ell = (cx, cy, rx, ry) => both((f) => <ellipse cx={X(cx, f)} cy={cy} rx={rx} ry={ry} className={className} />)

  switch (muscle) {
    case 'Shoulders':
      return ell(126, 170, 21, 19)
    case 'Chest':
      return ell(173, 192, 26, 19)
    case 'Biceps':
      return line(115, 205, 105, 268, 22)
    case 'Forearms':
      return line(99, 308, 92, 384, 20)
    case 'Abs':
      return <rect x={182} y={222} width={36} height={112} rx={12} className={className} />
    case 'Obliques':
      return ell(156, 288, 12, 34)
    case 'Quads':
      return line(172, 488, 176, 592, 38)
    case 'Adductors':
      return ell(192, 506, 8, 32)
    case 'Traps & Neck':
      return <path d="M164 142 L200 112 L236 142 L200 206 Z" className={className} />
    case 'Triceps':
      return line(117, 200, 105, 274, 22)
    case 'Lats':
      return ell(160, 234, 24, 44)
    case 'Lower back':
      return <rect x={178} y={298} width={44} height={58} rx={12} className={className} />
    case 'Abductors':
      return ell(144, 410, 11, 28)
    case 'Glutes':
      return ell(176, 412, 27, 34)
    case 'Hamstrings':
      return line(172, 494, 176, 598, 36)
    case 'Calves':
      return ell(177, 664, 17, 40)
    default:
      return null
  }
}

function Figure({ view }) {
  const limb = (x1, y1, x2, y2, w) => (
    <>
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={w} className="fig-limb" />
      <line x1={mirror(x1)} y1={y1} x2={mirror(x2)} y2={y2} strokeWidth={w} className="fig-limb" />
    </>
  )
  return (
    <g>
      {/* arms */}
      {limb(122, 172, 100, 292, 36)}
      {limb(100, 292, 90, 398, 28)}
      <circle cx={88} cy={414} r={14} className="fig-body" />
      <circle cx={mirror(88)} cy={414} r={14} className="fig-body" />
      {/* legs */}
      {limb(172, 468, 176, 612, 52)}
      {limb(176, 612, 180, 736, 36)}
      <ellipse cx={176} cy={756} rx={24} ry={11} className="fig-shoe" />
      <ellipse cx={mirror(176)} cy={756} rx={24} ry={11} className="fig-shoe" />
      {/* torso, neck, head */}
      <path d="M186 106 L214 106 L219 138 L181 138 Z" className="fig-body" />
      <path d="M142 140 Q200 126 258 140 L286 166 Q292 236 262 290 L252 366 L148 366 L138 290 Q108 236 114 166 Z" className="fig-body" />
      <ellipse cx={200} cy={76} rx={30} ry={37} className="fig-body" />
      {view === 'back' ? (
        <g className="fig-detail">
          <path d="M200 140 V360" />
          <path d="M150 200 Q175 230 200 214 Q225 230 250 200" />
          <path d="M176 330 Q200 344 224 330" />
          <path d="M172 50 Q200 30 228 50" className="fig-hair" />
        </g>
      ) : (
        <g className="fig-detail">
          <path d="M152 216 Q176 230 198 214 M202 214 Q224 230 248 216" />
          <path d="M200 222 V338 M184 254 H216 M184 284 H216 M186 312 H214" />
          <circle cx={200} cy={350} r={2} />
        </g>
      )}
      {/* shorts */}
      <path d="M146 358 L254 358 L266 474 L210 480 L200 436 L190 480 L134 474 Z" className="fig-shorts" />
    </g>
  )
}

const Heart = ({ x, y, s = 1 }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M0 -6 C-4 -14 -18 -12 -18 -1 C-18 8 -6 14 0 20 C6 14 18 8 18 -1 C18 -12 4 -14 0 -6 Z"
    className="heart"
  />
)

export default function BodyMap({ view, active, onPick, compact = false }) {
  const spots = SPOTS[view]
  return (
    <svg viewBox={compact ? '60 20 280 760' : '0 0 400 780'} className={`bodymap ${compact ? 'compact' : ''}`} role="group" aria-label={`Body map, ${view} view`}>
      <Figure view={view} />
      {spots.map((s) => (s.heart ? null : <Region key={s.muscle} muscle={s.muscle} className={`region ${active === s.muscle ? 'on' : ''}`} />))}
      {spots.map((s) => {
        const [dx, dy] = s.dot
        const lx = s.side === 'left' ? 6 : 394
        const lineY = s.ly + 10
        return (
          <g
            key={s.muscle}
            className={`spot ${active === s.muscle ? 'on' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={s.muscle}
            onClick={() => onPick(s.muscle)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onPick(s.muscle))}
          >
            <title>{s.muscle}</title>
            {!compact && (
              <>
                <path d={`M${lx} ${lineY} H${dx} V${dy}`} className="leader" />
                <text x={lx} y={s.ly} textAnchor={s.side === 'left' ? 'start' : 'end'} className="spot-label">
                  {s.muscle}
                </text>
              </>
            )}
            {s.heart ? <Heart x={dx - 6} y={dy - 10} s={1.2} /> : <circle cx={dx} cy={dy} r={10} className="spot-dot" />}
            {/* generous hit target */}
            {!compact && <rect x={s.side === 'left' ? 0 : 250} y={s.ly - 22} width={150} height={38} fill="transparent" />}
            <circle cx={dx} cy={dy} r={24} fill="transparent" />
          </g>
        )
      })}
    </svg>
  )
}

// Square crop of the figure centred on one muscle: used as an exercise thumbnail
export function MuscleThumb({ muscle, exerciseId, size = 64, className = '' }) {
  const target = muscle || (exerciseId && exerciseById[exerciseId]?.muscle) || 'Cardio'
  const view = viewOf(target)
  const spot = SPOTS[view].find((s) => s.muscle === target)
  let box = '40 0 320 320'
  if (spot && !spot.heart) {
    const span = 250
    const x = Math.min(400 - span, Math.max(0, spot.dot[0] - span / 2))
    const y = Math.min(780 - span, Math.max(0, spot.dot[1] - span / 2))
    box = `${x} ${y} ${span} ${span}`
  } else {
    box = '20 20 360 360'
  }
  return (
    <svg viewBox={box} className={`thumb ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <rect x="-10" y="-10" width="420" height="800" className="thumb-bg" />
      <Figure view={view} />
      {spot?.heart ? <Heart x={200} y={250} s={2.6} /> : <Region muscle={target} className="region on" />}
    </svg>
  )
}

// Image for a move: uploaded picture if the coach added one, otherwise the muscle crop
export function MoveImage({ move, size = 64, className = '' }) {
  if (move?.image) return <img src={move.image} alt="" className={`thumb ${className}`} style={{ width: size, height: size }} />
  return <MuscleThumb exerciseId={move?.exerciseId} size={size} className={className} />
}
