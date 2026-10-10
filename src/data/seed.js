import { m, part } from './workouts'

// Demo community: one admin, two coaches, three clients.
// Dates are generated relative to "now" on first load.

const daysAgo = (d, h = 18) => {
  const t = new Date()
  t.setDate(t.getDate() - d)
  t.setHours(h, 0, 0, 0)
  return t.toISOString()
}

const sets = (name, n, reps, kg) => Array.from({ length: n }, (_, i) => ({ name, set: i + 1, reps, kg }))

const user = (id, name, role, color, extra = {}) => ({
  id,
  name,
  role,
  color,
  photo: null,
  bio: '',
  payLink: '',
  partners: [],
  favorites: [],
  seeking: false,
  goals: '',
  specialties: '',
  coachPrice: '',
  createdAt: daysAgo(40),
  demo: true,
  ...extra,
})

export function buildSeed() {
  const users = {
    'demo-admin': user('demo-admin', 'Alex Admin', 'admin', '#7C5CFF', { bio: 'Runs All Workout.' }),
    'demo-maya': user('demo-maya', 'Maya Okafor', 'coach', '#0E9F7E', {
      bio: 'Kettlebell coach. Swings fix most things.',
      specialties: 'Kettlebell, conditioning, mobility',
      coachPrice: '$49/month',
      payLink: 'https://ko-fi.com/',
      partners: ['demo-jonas'],
      createdAt: daysAgo(60),
    }),
    'demo-jonas': user('demo-jonas', 'Jonas Berg', 'coach', '#D9622B', {
      bio: 'Powerlifting nerd, 5×5 forever.',
      specialties: 'Strength, powerlifting, beginners',
      coachPrice: '$35/month',
      payLink: 'https://paypal.me/',
      partners: ['demo-maya'],
      createdAt: daysAgo(55),
    }),
    'demo-priya': user('demo-priya', 'Priya Nair', 'client', '#B05CD6', {
      bio: 'Home workouts between meetings.',
      goals: 'Get stronger, 3 sessions a week',
      createdAt: daysAgo(20),
    }),
    'demo-sam': user('demo-sam', 'Sam Lee', 'client', '#2F80ED', {
      bio: 'New to lifting.',
      goals: 'Learn the barbell lifts safely',
      seeking: true,
      createdAt: daysAgo(4),
    }),
    'demo-ana': user('demo-ana', 'Ana Costa', 'client', '#E0457B', {
      goals: 'Run a half marathon, stay strong',
      createdAt: daysAgo(2),
    }),
  }

  const coachWorkout = (w) => ({
    official: false,
    category: 'Community',
    premium: false,
    price: '',
    payLink: '',
    cover: null,
    unlocked: [],
    requests: [],
    ...w,
  })

  const workouts = [
    coachWorkout({
      id: 'cw-maya-premium',
      authorId: 'demo-maya',
      name: 'Bell Program · Week 1',
      description: 'The first week of my paid kettlebell programme. Heavy swings, presses and get-ups.',
      level: 'Intermediate',
      focus: 'Strength',
      premium: true,
      price: '$12',
      payLink: 'https://ko-fi.com/',
      unlocked: ['demo-priya'],
      createdAt: daysAgo(6, 9),
      parts: [
        part('Warmup', 'timed', [m('kb-halo', '10'), m('goblet-squat', '10'), m('russian-swing', '15')], { minutes: 6, overview: 'Two easy rounds.' }),
        part('Strength', 'sets', [
          m('russian-swing', '15', { sets: 5, rest: 60, note: 'Two-hand, heavy bell.' }),
          m('kb-press', '6', { sets: 4, rest: 90, note: 'Each side. Hard glutes.' }),
          m('turkish-get-up', '2', { sets: 3, rest: 90, note: 'Alternate sides.' }),
          m('kb-windmill', '5', { sets: 3, rest: 60 }),
        ]),
      ],
    }),
    coachWorkout({
      id: 'cw-maya-free',
      authorId: 'demo-maya',
      name: 'Swing EMOM 12',
      description: 'A free taster: ten swings every minute, plus get-ups. Simple and hard.',
      level: 'Beginner',
      focus: 'Conditioning',
      createdAt: daysAgo(10, 9),
      parts: [part('EMOM', 'emom', [m('russian-swing', '10'), m('turkish-get-up', '1 each side')], { rounds: 6, howTo: 'Swings on odd minutes, get-ups on even minutes.' })],
    }),
    coachWorkout({
      id: 'cw-jonas-beginner',
      authorId: 'demo-jonas',
      name: 'First Barbell Session',
      description: 'Learn the squat, press and deadlift with light weight. Free for everyone.',
      level: 'Beginner',
      focus: 'Strength',
      createdAt: daysAgo(3, 12),
      parts: [
        part('Main', 'sets', [
          m('back-squat', '8', { sets: 3, rest: 120, note: 'Start with the empty bar.' }),
          m('overhead-press', '8', { sets: 3, rest: 90 }),
          m('deadlift', '5', { sets: 3, rest: 120 }),
        ]),
      ],
    }),
  ]

  const coaching = [
    { id: 'co-1', coachId: 'demo-maya', clientId: 'demo-priya', status: 'active', createdAt: daysAgo(15) },
    { id: 'co-2', coachId: 'demo-jonas', clientId: 'demo-ana', status: 'pending', createdAt: daysAgo(1) },
  ]

  const assignments = [
    { id: 'as-1', coachId: 'demo-maya', clientId: 'demo-priya', workoutId: 'off-sweat-starter', note: 'Light bell this week, focus on form.', createdAt: daysAgo(2) },
    { id: 'as-2', coachId: 'demo-maya', clientId: 'demo-priya', workoutId: 'cw-maya-free', note: '', createdAt: daysAgo(5) },
  ]

  const sessions = [
    {
      id: 's-1',
      userId: 'demo-jonas',
      workoutId: 'off-gym-strength-a',
      workoutName: 'Strength Foundations A',
      format: 'sets',
      date: daysAgo(1, 7),
      duration: 52 * 60,
      rpe: 8,
      note: 'Squats felt fast today.',
      partnerIds: ['demo-maya'],
      sets: [...sets('Back Squat', 5, 5, 120), ...sets('Bench Press', 5, 5, 85), ...sets('Barbell Row', 5, 5, 80)],
    },
    { id: 's-2', userId: 'demo-priya', workoutId: 'cw-maya-free', workoutName: 'Swing EMOM 12', format: 'emom', date: daysAgo(4, 18), duration: 12 * 60, rpe: 6, note: '', partnerIds: [], sets: [] },
    { id: 's-3', userId: 'demo-priya', workoutId: 'off-bw-tabata', workoutName: 'Tabata Blast', format: 'tabata', date: daysAgo(0, 11), duration: 16 * 60, rpe: 7, note: 'Lunch break done', partnerIds: [], sets: [] },
    { id: 's-4', userId: 'demo-jonas', workoutId: 'off-gym-legs', workoutName: 'Leg Day Classic', format: 'sets', date: daysAgo(9, 7), duration: 64 * 60, rpe: 9, note: '', partnerIds: [], sets: [...sets('Front Squat', 4, 6, 90), ...sets('Romanian Deadlift', 4, 10, 30)] },
    { id: 's-5', userId: 'demo-maya', workoutId: 'off-sweat-starter', workoutName: 'Full Body Sweat Starter', format: 'emom', date: daysAgo(2, 8), duration: 48 * 60, rpe: 8, note: '16 kg bell', partnerIds: [], sets: [] },
  ]

  const comments = [
    { id: 'c-1', workoutId: 'off-gym-strength-a', userId: 'demo-maya', text: 'Did this with Jonas. Brutal and simple.', createdAt: daysAgo(1, 9) },
    { id: 'c-2', workoutId: 'cw-maya-free', userId: 'demo-priya', text: 'Swings are getting easier!', createdAt: daysAgo(4, 19) },
    { id: 'c-3', sessionId: 's-1', userId: 'demo-maya', text: 'Those squats were moving!', createdAt: daysAgo(1, 10) },
    { id: 'c-4', sessionId: 's-3', userId: 'demo-maya', text: 'Nice one Priya!', createdAt: daysAgo(0, 12) },
  ]

  const kudos = {
    's-1': ['demo-maya', 'demo-priya', 'demo-sam'],
    's-3': ['demo-maya'],
    's-5': ['demo-jonas', 'demo-priya'],
  }

  const enrollments = {
    'demo-priya': { programId: 'prog-full-body-burner', startedAt: daysAgo(8), done: ['0-0', '0-1'] },
  }

  const likes = {
    'off-gym-strength-a': ['demo-maya', 'demo-jonas'],
    'off-sweat-starter': ['demo-priya', 'demo-maya'],
    'cw-maya-premium': ['demo-priya'],
    'cw-maya-free': ['demo-priya', 'demo-sam'],
  }

  return { version: 3, currentUserId: null, users, workouts, sessions, comments, likes, kudos, enrollments, coaching, assignments, progress: {} }
}
