// Form-check rules, one object per exercise. Plain JavaScript (no React).
// Thresholds come from the Camera Form Coach developer guide. They're starting points to tune
// on real clips, not validated standards.
//
//   view      'side' or 'front': where the camera should be
//   needs     which joints must be visible: 'side', 'sideHands' (deadlifts) or 'both' (lunges)
//   signal    the metric that drops as the rep goes down
//   start     below this the rep begins
//   end       above this the lifter is coming back up; after settleMs it's judged
//   mustReach a rep that never gets below this is a twitch and is ignored
//   key       optional: "key position hit" (skeleton turns green mid-rep)
//   live      faults checked every frame during the rep (skeleton turns red at once)
//   afterRep  faults checked once the rep is finished (rep → {bottom, top, min, max, samples})
//   apps      exercise ids in the app's library that use these rules
// Each fault has an id, a short label for the summary and a spoken cue under eight words.

const depth = { id: 'depth', label: 'depth', cue: 'Go deeper – hips below knees', when: (r) => r.bottom.depth < 0 }
const stand = (min = 165) => ({ id: 'stand', label: 'lockout', cue: 'Stand all the way up', when: (r) => r.top.kneeAngle <= min })

export const FORM_EXERCISES = [
  {
    id: 'squat',
    name: 'Squat',
    view: 'side',
    needs: 'side',
    apps: ['air-squat', 'back-squat', 'goblet-squat'],
    signal: 'kneeAngle',
    start: 150,
    end: 160,
    mustReach: 130,
    settleMs: 300,
    key: (m) => m.depth >= 0,
    live: [
      { id: 'chest', label: 'chest', cue: 'Chest up', when: (m) => m.torsoLean > 50 },
      { id: 'heels', label: 'heels', cue: 'Keep your heels down', when: (m) => m.heelLift > 0.06, experimental: true },
    ],
    afterRep: [depth, stand(165)],
  },
  {
    id: 'front-squat',
    name: 'Front squat',
    view: 'side',
    needs: 'side',
    apps: ['front-squat', 'front-rack-squat'],
    signal: 'kneeAngle',
    start: 150,
    end: 160,
    mustReach: 130,
    settleMs: 300,
    key: (m) => m.depth >= 0,
    live: [
      { id: 'chest', label: 'chest', cue: 'Elbows up, chest tall', when: (m) => m.torsoLean > 35 },
      { id: 'heels', label: 'heels', cue: 'Keep your heels down', when: (m) => m.heelLift > 0.06, experimental: true },
    ],
    afterRep: [depth, stand(165)],
  },
  {
    id: 'wall-ball',
    name: 'Wall ball',
    view: 'side',
    needs: 'side',
    apps: ['wall-ball'],
    signal: 'kneeAngle',
    start: 150,
    end: 160,
    mustReach: 130,
    settleMs: 200,
    key: (m) => m.depth >= 0,
    live: [{ id: 'chest', label: 'chest', cue: 'Chest up', when: (m) => m.torsoLean > 45 }],
    afterRep: [depth, { id: 'hips', label: 'hip drive', cue: 'Drive your hips through', when: (r) => r.max.hipAngle <= 165 }],
  },
  {
    id: 'squat-knees',
    name: 'Squat (knees check, from the front)',
    view: 'front',
    needs: 'both',
    apps: [],
    signal: 'kneeAngle',
    start: 150,
    end: 160,
    mustReach: 130,
    settleMs: 300,
    live: [{ id: 'knees', label: 'knees caving', cue: 'Push your knees out', when: (m) => m.kneeRatio < 0.75 && m.kneeAngle < 140 }],
    afterRep: [depth],
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    view: 'side',
    needs: 'sideHands',
    apps: ['deadlift', 'kb-deadlift'],
    signal: 'hipAngle',
    start: 145,
    end: 160,
    mustReach: 110,
    settleMs: 300,
    live: [{ id: 'close', label: 'bar away', cue: 'Keep the bar close', when: (m) => m.hipAngle < 150 && m.wristOffset > 0.3 }],
    afterRep: [
      {
        id: 'hips-up',
        label: 'hips shot up',
        cue: 'Hips shot up – push the floor away',
        // Once the knees have opened 20° off the floor, the hips must have opened at least 8°
        when: (r) => {
          const lift = r.samples.slice(r.bottomIndex).find((m) => m.kneeAngle >= r.bottom.kneeAngle + 20)
          return !!lift && lift.hipAngle - r.bottom.hipAngle < 8
        },
      },
      { id: 'lockout', label: 'lockout', cue: 'Finish tall – squeeze your glutes', when: (r) => r.top.hipAngle <= 168 || r.top.kneeAngle <= 160 },
    ],
  },
  {
    id: 'rdl',
    name: 'Romanian deadlift',
    view: 'side',
    needs: 'sideHands',
    apps: ['romanian-deadlift'],
    signal: 'hipAngle',
    start: 150,
    end: 160,
    mustReach: 125,
    settleMs: 300,
    live: [
      { id: 'squatting', label: 'too much knee', cue: 'Push your hips back, less knee', when: (m) => m.kneeAngle < 135 },
      { id: 'close', label: 'weight away', cue: 'Keep the weight close', when: (m) => m.hipAngle < 150 && m.wristOffset > 0.3 },
    ],
    afterRep: [
      { id: 'hinge', label: 'hinge depth', cue: 'Hinge further – feel the hamstrings', when: (r) => r.bottom.hipAngle >= 120 },
      { id: 'lockout', label: 'lockout', cue: 'Stand tall at the top', when: (r) => r.top.hipAngle <= 165 },
    ],
  },
  {
    id: 'lunge',
    name: 'Lunge',
    view: 'side',
    needs: 'both',
    apps: ['walking-lunge', 'sandbag-lunge', 'bulgarian-split-squat'],
    signal: 'lowerKnee',
    start: 150,
    end: 160,
    mustReach: 120,
    settleMs: 250,
    live: [{ id: 'chest', label: 'chest', cue: 'Stay tall', when: (m) => m.torsoLean > 30 }],
    afterRep: [
      { id: 'depth', label: 'depth', cue: 'Go lower – front knee to 90', when: (r) => r.bottom.frontKnee >= 105 },
      { id: 'back-knee', label: 'back knee', cue: 'Back knee to the floor', when: (r) => r.bottom.rearKneeGap > 0.15 },
    ],
  },
  {
    id: 'kb-swing',
    name: 'Kettlebell swing',
    view: 'side',
    needs: 'side',
    apps: ['russian-swing', 'american-swing'],
    signal: 'hipAngle',
    start: 150,
    end: 160,
    mustReach: 130,
    settleMs: 150,
    live: [],
    afterRep: [
      { id: 'squatting', label: 'squatting', cue: 'Hinge, don’t squat', when: (r) => r.min.kneeAngle <= 120 },
      { id: 'lockout', label: 'lockout', cue: 'Snap your hips – stand tall', when: (r) => r.max.hipAngle <= 170 },
    ],
  },
]

export const formExerciseById = Object.fromEntries(FORM_EXERCISES.map((e) => [e.id, e]))

// The form check for an exercise in the app's library, if there is one
export const formCheckFor = (appExerciseId) => FORM_EXERCISES.find((e) => e.apps.includes(appExerciseId)) || null

// Not checked by camera (see the guide): runs, rowing, sleds, SkiErg and burpee broad jumps
export const CAMERA_SETUP = {
  side: 'Stand side-on to the camera',
  front: 'Face the camera',
}
