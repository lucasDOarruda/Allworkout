// Simple line icons (24×24, 2px stroke). Used instead of emoji across the app.
const PATHS = {
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5 21 21',
  lock: 'M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  calendar: 'M4 5h16v15H4zM4 10h16M9 3v4M15 3v4',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5c2 .6 3.3 2.5 3.5 5.5',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  note: 'M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h7',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5v.5',
  timer: 'M12 8v5l3 2M9 2h6M12 4a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z',
  dumbbell: 'M3 10v4M6 7v10M9 9v6M9 12h6M15 9v6M18 7v10M21 10v4',
  rounds: 'M4 6h16M4 12h16M4 18h10',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6',
  chat: 'M4 5h16v11H9l-5 4z',
  chart: 'M5 20v-5M10 20v-9M15 20v-7M20 20V7',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  play: 'M7 4.5v15l12-7.5z',
  pencil: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  plus: 'M12 5v14M5 12h14',
  medal: 'M8 3l4 7 4-7M12 21a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z',
  flame: 'M12 21c4 0 6.5-2.7 6.5-6.3 0-3.7-3-6-4.2-9.7-1.8 2.2-2.3 4-2.3 5.5C10.5 9 9.5 8 9 6.5 6.8 8.5 5.5 11 5.5 14.7 5.5 18.3 8 21 12 21z',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 11.5v1',
  heart: 'M12 20s-7.5-4.5-7.5-10A4.3 4.3 0 0 1 12 7.5 4.3 4.3 0 0 1 19.5 10C19.5 15.5 12 20 12 20z',
  clipboard: 'M8 4h8v3H8zM6 5.5H4V21h16V5.5h-2M8 12h8M8 16h5',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  layers: 'M12 3 3 8l9 5 9-5zM3 13l9 5 9-5',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
}

export default function Icon({ name, size = 22, className = '', strokeWidth = 2 }) {
  const d = PATHS[name] || PATHS.info
  const filled = name === 'play'
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`icon ${className}`} aria-hidden="true">
      <path d={d} fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
