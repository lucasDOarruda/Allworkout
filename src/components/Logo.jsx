// Kinetic Performances mark (from the brand files in public/brand). Drawn inline so it follows the
// theme: lime ring on dark backgrounds, dark ring on light ones. variant="dark" forces the dark look
// (e.g. the results snapshot, which is always dark).
export default function Logo({ size = 36, variant, title }) {
  return (
    <svg
      className={`kp-logo ${variant ? `kp-logo-${variant}` : ''}`}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <circle cx="50" cy="50" r="40" fill="none" className="kp-track" strokeWidth="10" />
      <circle cx="50" cy="50" r="40" fill="none" className="kp-arc" strokeWidth="10" strokeLinecap="round" strokeDasharray="190 252" transform="rotate(-90 50 50)" />
      <g transform="translate(-1.5 0)" className="kp-ink">
        <rect x="27" y="37" width="7" height="26" />
        <polygon points="34,50 44,37 52,37 42,50 52,63 44,63" />
        <path fillRule="evenodd" d="M56 37H67A9 9 0 0 1 67 55H63V63H56Z M63 43V49H66.5A3 3 0 0 0 66.5 43Z" />
      </g>
    </svg>
  )
}

// The name as a two-line wordmark: KINETIC (heavy) over PERFORMANCES (spaced, lime)
export function Wordmark({ className = '' }) {
  return (
    <span className={`kp-wordmark ${className}`} aria-label="Kinetic Performances">
      <span className="kp-wm-1" aria-hidden="true">
        Kinetic
      </span>
      <span className="kp-wm-2" aria-hidden="true">
        Performances
      </span>
    </span>
  )
}
