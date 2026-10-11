// Multi-week programs: each week is a list of workout ids, one per training day.

export const OFFICIAL_PROGRAMS = [
  {
    id: 'prog-full-body-burner',
    name: 'Full Body Burner',
    description: 'Three weeks, three sessions a week. Kettlebell EMOMs, circuits and one strength day to build an engine.',
    level: 'Intermediate',
    authorId: null,
    weeks: [
      ['off-sweat-starter', 'off-bw-starter', 'off-gym-strength-a'],
      ['off-kb-complex', 'off-bw-tabata', 'off-gym-strength-a'],
      ['off-sweat-starter', 'off-kb-amrap', 'off-gym-upper-circuit'],
    ],
  },
  {
    id: 'prog-strength-start',
    name: 'Strength Starter',
    description: 'Two weeks to learn the big lifts and build a habit. Perfect if you’re new to the gym.',
    level: 'Beginner',
    authorId: null,
    weeks: [
      ['off-gym-strength-a', 'off-bw-starter', 'off-gym-pull'],
      ['off-gym-strength-a', 'off-gym-legs', 'off-gym-pull'],
    ],
  },
  {
    id: 'prog-no-equipment',
    name: 'Anywhere Athlete',
    description: 'No equipment, no excuses. Two weeks of bodyweight circuits, Tabatas and AMRAPs.',
    level: 'Beginner',
    authorId: null,
    weeks: [
      ['off-bw-starter', 'off-bw-tabata', 'off-bw-amrap'],
      ['off-bw-calisthenics', 'off-bw-tabata', 'off-bw-amrap'],
    ],
  },
  // HYROX (independent training, not affiliated with HYROX)
  {
    id: 'prog-hyrox-8wk',
    name: 'HYROX 8-Week Race Prep',
    description: 'From your first station practice to a full race simulation. Three sessions a week: engine, strength and compromised running, with a half simulation in week 4.',
    level: 'Intermediate',
    authorId: null,
    weeks: [
      ['off-hyrox-stations', 'off-hyrox-engine', 'off-gym-strength-a'],
      ['off-hyrox-strength', 'off-hyrox-engine', 'off-hyrox-compromised'],
      ['off-hyrox-40', 'off-hyrox-strength', 'off-hyrox-engine'],
      ['off-hyrox-half', 'off-hyrox-strength', 'off-hyrox-compromised'],
      ['off-hyrox-40', 'off-hyrox-engine', 'off-hyrox-strength'],
      ['off-hyrox-compromised', 'off-hyrox-half', 'off-hyrox-engine'],
      ['off-hyrox-40', 'off-hyrox-strength', 'off-hyrox-stations'],
      ['off-hyrox-engine', 'off-hyrox-stations', 'off-hyrox-sim'],
    ],
  },
  {
    id: 'prog-strength-to-hyrox',
    name: 'Strength to HYROX',
    description: 'For gym-goers who lift: keep your strength, build the engine and learn the stations. Six weeks that finish with a full race simulation.',
    level: 'Intermediate',
    authorId: null,
    weeks: [
      ['off-gym-strength-a', 'off-hyrox-stations', 'off-hyrox-engine'],
      ['off-gym-legs', 'off-hyrox-strength', 'off-hyrox-engine'],
      ['off-gym-strength-a', 'off-hyrox-compromised', 'off-hyrox-40'],
      ['off-hyrox-strength', 'off-hyrox-engine', 'off-hyrox-half'],
      ['off-gym-legs', 'off-hyrox-compromised', 'off-hyrox-40'],
      ['off-hyrox-strength', 'off-hyrox-stations', 'off-hyrox-sim'],
    ],
  },
]

export const programDays = (p) => p.weeks.flatMap((wk, wi) => wk.map((workoutId, di) => ({ key: `${wi}-${di}`, week: wi, day: di, workoutId })))
