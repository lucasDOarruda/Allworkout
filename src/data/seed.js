// Starting data for a new browser: no members and no activity. Official workouts and
// programs come from data/workouts.js and data/programs.js; everything else is created
// by real members.
export function buildSeed() {
  return {
    version: 3,
    currentUserId: null,
    users: {},
    workouts: [],
    sessions: [],
    comments: [],
    likes: {},
    kudos: {},
    enrollments: {},
    coaching: [],
    assignments: [],
    progress: {},
  }
}
