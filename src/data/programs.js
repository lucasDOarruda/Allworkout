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
]

export const programDays = (p) => p.weeks.flatMap((wk, wi) => wk.map((workoutId, di) => ({ key: `${wi}-${di}`, week: wi, day: di, workoutId })))
