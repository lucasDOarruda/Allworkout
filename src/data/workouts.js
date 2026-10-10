import { exerciseById } from './exercises'

export const FORMATS = {
  sets: 'Sets & reps',
  circuit: 'Circuit',
  emom: 'EMOM',
  amrap: 'AMRAP',
  tabata: 'Tabata',
  timed: 'Timed',
}
export const LEVELS = ['Beginner', 'Intermediate', 'Advanced']
export const FOCUSES = ['Strength', 'Hypertrophy', 'Conditioning', 'Fat loss', 'Mobility', 'Full body']

// m('kb-press', '6', { sets: 4, rest: 90, side: 'L' })
export const m = (exerciseId, reps, { sets = 1, rest = 0, note = '', side = '' } = {}) => ({
  exerciseId,
  name: exerciseById[exerciseId].name + (side ? ` (${side})` : ''),
  sets,
  reps,
  rest,
  note,
  video: exerciseById[exerciseId].video,
  image: null,
})

let partSeq = 0
export const part = (name, format, moves, opts = {}) => ({
  id: `p${++partSeq}`,
  name,
  format,
  rounds: 3,
  work: 40,
  rest: 20,
  minutes: 10,
  overview: '',
  howTo: '',
  moves,
  ...opts,
})

const warmupKB = () =>
  part('Warmup', 'timed', [m('russian-swing', '10'), m('push-up', '10'), m('jumping-jack', '10')], {
    minutes: 8,
    overview: '3 rounds easy pace, take your time, then stretch in the remaining time.',
  })

const base = {
  official: true,
  authorId: null,
  premium: false,
  price: '',
  payLink: '',
  cover: null,
  unlocked: [],
  requests: [],
  createdAt: '2026-01-01T09:00:00.000Z',
}

export const OFFICIAL_WORKOUTS = [
  {
    ...base,
    id: 'off-sweat-starter',
    category: 'Kettlebell',
    name: 'Full Body Sweat Starter',
    description: 'A warmup, then a 40-minute single-bell EMOM. Grab one kettlebell.',
    level: 'Intermediate',
    focus: 'Full body',
    parts: [
      warmupKB(),
      part(
        'Part 1',
        'emom',
        [
          m('front-rack-squat', '6', { side: 'L' }),
          m('front-rack-squat', '6', { side: 'R' }),
          m('gunslinger', '8', { side: 'L' }),
          m('gunslinger', '8', { side: 'R' }),
          m('swing-clean-push-press', '6', { side: 'L' }),
          m('swing-clean-push-press', '6', { side: 'R' }),
          m('american-swing', '15'),
          m('plank', '30s'),
        ],
        {
          rounds: 5,
          overview:
            'Ready for a serious full-body burner? This 40-minute EMOM packs 5 rounds of single-arm rack squats, gunslingers and push presses, plus American swings and a plank finisher. Grab your kettlebell and let’s crush it!',
          howTo:
            'Every minute on the minute, do the reps for that minute’s move. Rest for whatever is left of the minute. When the clock hits the next minute, start the next move.',
        },
      ),
    ],
  },
  {
    ...base,
    id: 'off-gym-strength-a',
    category: 'Gym',
    name: 'Strength Foundations A',
    description: 'Classic barbell strength day: squat, bench and row. Add 2.5 kg when you hit every rep.',
    level: 'Beginner',
    focus: 'Strength',
    parts: [
      part('Warmup', 'timed', [m('air-squat', '10'), m('push-up', '10'), m('bird-dog', '10')], { minutes: 6, overview: '2–3 easy rounds, then a few light sets of the first lift.' }),
      part(
        'Main lifts',
        'sets',
        [
          m('back-squat', '5', { sets: 5, rest: 150, note: 'Same weight across all sets.' }),
          m('bench-press', '5', { sets: 5, rest: 150 }),
          m('barbell-row', '5', { sets: 5, rest: 120 }),
        ],
        { overview: 'Five sets of five on the big three.', howTo: 'Log reps and kg for each set. The rest timer starts on its own.' },
      ),
      part('Finisher', 'sets', [m('plank', '45', { sets: 3, rest: 45, note: 'Seconds' })]),
    ],
  },
  {
    ...base,
    id: 'off-gym-pull',
    category: 'Gym',
    name: 'Pull Day Builder',
    description: 'A back and biceps session for width and thickness.',
    level: 'Intermediate',
    focus: 'Hypertrophy',
    parts: [
      part('Main', 'sets', [
        m('deadlift', '5', { sets: 4, rest: 180, note: 'Reset every rep.' }),
        m('lat-pulldown', '10', { sets: 4, rest: 90 }),
        m('seated-cable-row', '12', { sets: 3, rest: 75 }),
        m('face-pull', '15', { sets: 3, rest: 60 }),
        m('hammer-curl', '12', { sets: 3, rest: 60 }),
      ]),
    ],
  },
  {
    ...base,
    id: 'off-gym-legs',
    category: 'Gym',
    name: 'Leg Day Classic',
    description: 'Quads, hamstrings, glutes and calves. Bring snacks.',
    level: 'Intermediate',
    focus: 'Hypertrophy',
    parts: [
      part('Main', 'sets', [
        m('front-squat', '6', { sets: 4, rest: 150 }),
        m('romanian-deadlift', '10', { sets: 4, rest: 90 }),
        m('leg-press', '12', { sets: 3, rest: 90 }),
        m('hamstring-curl', '12', { sets: 3, rest: 60 }),
        m('standing-calf-raise', '15', { sets: 3, rest: 45 }),
      ]),
    ],
  },
  {
    ...base,
    id: 'off-gym-upper-circuit',
    category: 'Gym',
    name: 'Upper Body Burner',
    description: 'A fast dumbbell and cable circuit for the upper body.',
    level: 'Intermediate',
    focus: 'Conditioning',
    parts: [
      part(
        'Circuit',
        'circuit',
        [m('incline-db-press', '40s'), m('seated-cable-row', '40s'), m('lateral-raise', '40s'), m('tricep-pushdown', '40s'), m('db-curl', '40s')],
        { work: 40, rest: 20, rounds: 3 },
      ),
    ],
  },
  {
    ...base,
    id: 'off-kb-complex',
    category: 'Kettlebell',
    name: 'Kettlebell Complex Circuit',
    description: 'Clean, press, squat, swing. Don’t put the bell down.',
    level: 'Intermediate',
    focus: 'Conditioning',
    parts: [
      warmupKB(),
      part('Complex', 'circuit', [m('kb-clean', '45s'), m('kb-press', '45s'), m('goblet-squat', '45s'), m('russian-swing', '45s')], {
        work: 45,
        rest: 15,
        rounds: 4,
      }),
    ],
  },
  {
    ...base,
    id: 'off-kb-amrap',
    category: 'Kettlebell',
    name: 'Bell Ringer AMRAP 15',
    description: 'As many rounds as possible in 15 minutes.',
    level: 'Advanced',
    focus: 'Conditioning',
    parts: [
      part('AMRAP', 'amrap', [m('kb-snatch', '10 (5/side)'), m('goblet-squat', '10'), m('kb-row', '10 (5/side)'), m('burpee', '5')], {
        minutes: 15,
        howTo: 'Move through the list in order. Tap +1 round each time you finish it.',
      }),
    ],
  },
  {
    ...base,
    id: 'off-kb-strength',
    category: 'Kettlebell',
    name: 'Kettlebell Strength',
    description: 'A slower strength session with heavy bells.',
    level: 'Intermediate',
    focus: 'Strength',
    parts: [
      part('Main', 'sets', [
        m('goblet-squat', '8', { sets: 4, rest: 90 }),
        m('kb-press', '6', { sets: 4, rest: 90, note: 'Each side.' }),
        m('kb-row', '8', { sets: 4, rest: 75, note: 'Each side.' }),
        m('kb-windmill', '5', { sets: 3, rest: 60, note: 'Each side, slow.' }),
        m('turkish-get-up', '2', { sets: 3, rest: 60 }),
      ]),
    ],
  },
  {
    ...base,
    id: 'off-bw-tabata',
    category: 'Bodyweight',
    name: 'Tabata Blast',
    description: 'Four Tabatas back to back, 20 s on and 10 s off. 16 minutes, no equipment.',
    level: 'Intermediate',
    focus: 'Fat loss',
    parts: [part('Tabata', 'tabata', [m('jump-squat', 'max'), m('push-up', 'max'), m('mountain-climber', 'max'), m('hollow-hold', 'hold')])],
  },
  {
    ...base,
    id: 'off-bw-starter',
    category: 'Bodyweight',
    name: 'Home Starter Circuit',
    description: 'A friendly full-body circuit you can do in the living room.',
    level: 'Beginner',
    focus: 'Full body',
    parts: [
      part('Circuit', 'circuit', [m('air-squat', '30s'), m('push-up', '30s', { note: 'Knees down is fine.' }), m('glute-bridge', '30s'), m('plank', '30s')], {
        work: 30,
        rest: 30,
        rounds: 3,
      }),
    ],
  },
  {
    ...base,
    id: 'off-bw-calisthenics',
    category: 'Bodyweight',
    name: 'Calisthenics Strength',
    description: 'Pull-ups, dips and pike push-ups for real upper-body strength.',
    level: 'Advanced',
    focus: 'Strength',
    parts: [
      part('Main', 'sets', [
        m('pull-up', '5', { sets: 5, rest: 120 }),
        m('dip', '8', { sets: 5, rest: 120 }),
        m('pike-push-up', '8', { sets: 4, rest: 90 }),
        m('inverted-row', '12', { sets: 3, rest: 75 }),
      ]),
      part('Core', 'circuit', [m('hollow-hold', '30s'), m('side-plank', '30s'), m('superman', '30s')], { work: 30, rest: 15, rounds: 2 }),
    ],
  },
  {
    ...base,
    id: 'off-bw-amrap',
    category: 'Bodyweight',
    name: 'Cindy-Style AMRAP 20',
    description: '5 pull-ups, 10 push-ups, 15 air squats. Repeat for 20 minutes.',
    level: 'Intermediate',
    focus: 'Conditioning',
    parts: [part('AMRAP', 'amrap', [m('pull-up', '5'), m('push-up', '10'), m('air-squat', '15')], { minutes: 20 })],
  },
]
