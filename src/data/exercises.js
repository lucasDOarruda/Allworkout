// Exercise library. `muscles[0]` is the primary muscle; the rest are secondary.
// Video links point to a YouTube search so they never go stale.

const yt = (name) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(name + ' exercise form')}`

export const FRONT_MUSCLES = ['Shoulders', 'Chest', 'Biceps', 'Forearms', 'Abs', 'Obliques', 'Quads', 'Adductors']
export const BACK_MUSCLES = ['Traps & Neck', 'Triceps', 'Lats', 'Lower back', 'Abductors', 'Glutes', 'Hamstrings', 'Calves']
export const MUSCLES = [...FRONT_MUSCLES, ...BACK_MUSCLES, 'Cardio']
export const EQUIPMENT = ['Barbell', 'Dumbbell', 'Kettlebell', 'Machine', 'Functional', 'Bodyweight']

const raw = [
  // ---------- Barbell ----------
  ['back-squat', 'Back Squat', 'Barbell', ['Quads', 'Glutes', 'Adductors'], ['Bar on upper traps, brace your core', 'Sit between your hips, knees track over toes', 'Drive up through mid-foot, chest proud']],
  ['front-squat', 'Front Squat', 'Barbell', ['Quads', 'Abs'], ['Elbows high, bar on front delts', 'Stay upright as you descend', 'Push knees out at the bottom']],
  ['deadlift', 'Deadlift', 'Barbell', ['Hamstrings', 'Glutes', 'Lower back', 'Forearms'], ['Bar over mid-foot, shins close', 'Flat back, take the slack out of the bar', 'Push the floor away, hips and shoulders rise together']],
  ['hip-thrust', 'Hip Thrust', 'Barbell', ['Glutes', 'Hamstrings'], ['Upper back on bench, bar on hip crease', 'Tuck chin, ribs down', 'Lock out with glutes, not lower back']],
  ['bench-press', 'Bench Press', 'Barbell', ['Chest', 'Triceps', 'Shoulders'], ['Shoulder blades pinched, feet planted', 'Lower to lower chest, elbows ~45°', 'Press up and slightly back']],
  ['overhead-press', 'Overhead Press', 'Barbell', ['Shoulders', 'Triceps'], ['Bar on front delts, glutes tight', 'Move your head back, press straight up', 'Head through at lockout']],
  ['barbell-row', 'Barbell Row', 'Barbell', ['Lats', 'Traps & Neck', 'Biceps'], ['Hinge to ~45°, flat back', 'Pull bar to lower ribs', 'Squeeze shoulder blades, lower slowly']],
  ['barbell-shrug', 'Barbell Shrug', 'Barbell', ['Traps & Neck', 'Forearms'], ['Stand tall, arms long', 'Shoulders straight up to ears', 'Pause, then lower slowly. No rolling']],
  // ---------- Dumbbell ----------
  ['romanian-deadlift', 'Romanian Deadlift', 'Dumbbell', ['Hamstrings', 'Glutes', 'Lower back'], ['Soft knees, push hips back', 'Weights slide down your thighs', 'Feel the hamstring stretch, then drive hips forward']],
  ['walking-lunge', 'Walking Lunge', 'Dumbbell', ['Quads', 'Glutes'], ['Long step, torso upright', 'Back knee kisses the floor', 'Drive through the front heel']],
  ['bulgarian-split-squat', 'Bulgarian Split Squat', 'Dumbbell', ['Quads', 'Glutes', 'Adductors'], ['Rear foot on a bench', 'Drop straight down, front knee stable', 'Keep weight in the front foot']],
  ['incline-db-press', 'Incline Dumbbell Press', 'Dumbbell', ['Chest', 'Shoulders', 'Triceps'], ['Bench at 30°', 'Lower to upper chest', 'Press up and together']],
  ['lateral-raise', 'Lateral Raise', 'Dumbbell', ['Shoulders'], ['Slight bend in elbows', 'Lead with elbows to shoulder height', 'Lower slowly']],
  ['db-curl', 'Dumbbell Curl', 'Dumbbell', ['Biceps', 'Forearms'], ['Elbows pinned to your sides', 'Curl and twist pinky up', 'Lower slowly, no swinging']],
  ['hammer-curl', 'Hammer Curl', 'Dumbbell', ['Biceps', 'Forearms'], ['Thumbs up grip', 'Elbows stay still', 'Squeeze at the top']],
  ['skullcrusher', 'Dumbbell Skullcrusher', 'Dumbbell', ['Triceps'], ['Arms vertical over shoulders', 'Bend only at the elbows', 'Lower beside your head, press back up']],
  ['farmer-carry', 'Farmer Carry', 'Dumbbell', ['Forearms', 'Traps & Neck', 'Abs'], ['Heavy weights at your sides', 'Tall posture, shoulders packed', 'Short, quick steps']],
  ['wrist-curl', 'Wrist Curl', 'Dumbbell', ['Forearms'], ['Forearms on your thighs, palms up', 'Curl only at the wrist', 'Full range, slow lowering']],
  // ---------- Machine ----------
  ['leg-press', 'Leg Press', 'Machine', ['Quads', 'Glutes'], ['Feet shoulder-width, mid-platform', 'Lower until hips start to curl', 'Do not lock knees hard at the top']],
  ['lat-pulldown', 'Lat Pulldown', 'Machine', ['Lats', 'Biceps'], ['Thighs locked under pads', 'Pull bar to upper chest', 'Lead with elbows, control the return']],
  ['seated-cable-row', 'Seated Cable Row', 'Machine', ['Lats', 'Traps & Neck', 'Biceps'], ['Sit tall, slight knee bend', 'Pull handle to your belly', 'Do not rock your torso']],
  ['tricep-pushdown', 'Tricep Pushdown', 'Machine', ['Triceps'], ['Elbows tucked at your sides', 'Push down until arms are straight', 'Only your forearms move']],
  ['hamstring-curl', 'Hamstring Curl', 'Machine', ['Hamstrings', 'Calves'], ['Pad just above your heels', 'Curl all the way', 'Slow on the way back']],
  ['adductor-machine', 'Adductor Machine', 'Machine', ['Adductors'], ['Sit tall, pads on inner knees', 'Squeeze legs together', 'Control the opening']],
  ['abductor-machine', 'Abductor Machine', 'Machine', ['Abductors', 'Glutes'], ['Sit tall, pads on outer knees', 'Push knees apart', 'Pause, then return slowly']],
  ['standing-calf-raise', 'Standing Calf Raise', 'Machine', ['Calves'], ['Balls of feet on the edge', 'Rise as high as you can', 'Deep stretch at the bottom']],
  ['face-pull', 'Face Pull', 'Machine', ['Shoulders', 'Traps & Neck'], ['Rope at face height', 'Pull to your forehead, elbows high', 'Rotate hands back at the end']],
  // ---------- Kettlebell ----------
  ['russian-swing', 'Russian Swing', 'Kettlebell', ['Glutes', 'Hamstrings', 'Lower back', 'Cardio'], ['Hike the bell back like a football snap', 'Snap hips forward, arms are ropes', 'Bell floats to chest height, plank at the top']],
  ['american-swing', 'American Swing', 'Kettlebell', ['Glutes', 'Shoulders', 'Hamstrings', 'Cardio'], ['Same hip snap as a Russian swing', 'Guide the bell overhead, bottom to the ceiling', 'Ribs down, do not overarch']],
  ['goblet-squat', 'Goblet Squat', 'Kettlebell', ['Quads', 'Glutes', 'Adductors'], ['Hold the bell at your chest by the horns', 'Elbows inside knees at the bottom', 'Stand tall and squeeze glutes at the top']],
  ['front-rack-squat', 'Front Rack Squat', 'Kettlebell', ['Quads', 'Abs', 'Obliques'], ['Bell in the rack, wrist straight', 'Stay tall, do not lean to the bell side', 'Drive up through the whole foot']],
  ['kb-clean', 'Kettlebell Clean', 'Kettlebell', ['Glutes', 'Forearms', 'Shoulders'], ['Hike, then drive hips', 'Keep the bell close, zip up the jacket', 'Soft catch in the rack, wrist straight']],
  ['kb-press', 'Kettlebell Press', 'Kettlebell', ['Shoulders', 'Triceps'], ['Start in the rack, glutes tight', 'Press up and slightly out', 'Bicep by your ear at lockout']],
  ['swing-clean-push-press', 'Swing Clean Push Press', 'Kettlebell', ['Shoulders', 'Glutes', 'Quads', 'Cardio'], ['One swing, then clean to the rack', 'Dip at the knees and drive the bell up', 'Lock out, return to the rack, then the swing']],
  ['gunslinger', 'Gunslinger', 'Kettlebell', ['Obliques', 'Shoulders', 'Forearms'], ['Bell hangs between your legs', 'Drive the hips, pull the bell to your hip holster', 'Rotate and punch it to the rack, then reverse']],
  ['kb-snatch', 'Kettlebell Snatch', 'Kettlebell', ['Shoulders', 'Glutes', 'Cardio'], ['Hike and drive hips hard', 'Punch through as the bell rises', 'Lock out overhead, no bell flop']],
  ['turkish-get-up', 'Turkish Get-Up', 'Kettlebell', ['Shoulders', 'Abs', 'Obliques'], ['Eyes on the bell the whole time', 'Roll to elbow, then hand', 'Move slow and controlled through each step']],
  ['kb-row', 'Kettlebell Row', 'Kettlebell', ['Lats', 'Biceps'], ['Hinge with a flat back', 'Pull elbow to your hip', 'Pause and lower with control']],
  ['kb-halo', 'Kettlebell Halo', 'Kettlebell', ['Shoulders', 'Traps & Neck'], ['Hold bell upside down by the horns', 'Circle close around your head', 'Ribs down, do not arch']],
  ['kb-windmill', 'Kettlebell Windmill', 'Kettlebell', ['Obliques', 'Shoulders', 'Hamstrings'], ['Bell locked out overhead', 'Push hip out, slide hand down leg', 'Eyes on the bell']],
  ['kb-deadlift', 'Kettlebell Deadlift', 'Kettlebell', ['Hamstrings', 'Glutes', 'Lower back'], ['Bell between your feet', 'Hips back, flat back', 'Stand tall and squeeze glutes']],
  // ---------- HYROX stations and running ----------
  ['run', 'Run', 'Bodyweight', ['Cardio', 'Quads', 'Calves'], ['Relaxed shoulders, quick light steps', 'Hold a pace you could keep talking at for easy runs', 'After a station, settle your breathing in the first 200 m']],
  ['ski-erg', 'SkiErg', 'Machine', ['Cardio', 'Lats', 'Triceps', 'Abs'], ['Reach tall, then drive the handles down with your lats', 'Hinge at the hips as your hands pass your knees', 'Long, powerful pulls beat fast short ones']],
  ['row-erg', 'Rowing (erg)', 'Machine', ['Cardio', 'Lats', 'Quads', 'Hamstrings'], ['Legs, then body, then arms on the drive', 'Arms, body, then legs on the way back', 'Damper around 5–6; aim for 24–30 strokes a minute']],
  ['sled-push', 'Sled Push', 'Functional', ['Quads', 'Glutes', 'Calves', 'Shoulders'], ['Hands on the poles, arms locked or bent', 'Lean in low, back flat', 'Short, driving steps through the balls of your feet']],
  ['sled-pull', 'Sled Pull', 'Functional', ['Lats', 'Biceps', 'Hamstrings', 'Forearms'], ['Sit back low with feet braced', 'Pull hand over hand, rope close to your body', 'Use your legs: step back and lean as you pull']],
  ['burpee-broad-jump', 'Burpee Broad Jump', 'Bodyweight', ['Cardio', 'Quads', 'Glutes', 'Chest'], ['Chest to the floor, then jump your feet in', 'Jump forward with both feet together', 'Find a steady rhythm you can hold for the whole distance']],
  ['sandbag-lunge', 'Sandbag Lunge', 'Functional', ['Quads', 'Glutes', 'Abs'], ['Sandbag on your shoulders behind your neck', 'Back knee touches the floor each step', 'Stand tall between lunges, don’t rush the knee touch']],
  ['wall-ball', 'Wall Ball', 'Functional', ['Quads', 'Shoulders', 'Glutes', 'Cardio'], ['Squat below parallel with the ball at your chest', 'Drive up and throw in one motion to the target', 'Catch and drop straight into the next squat']],
  // ---------- Bodyweight ----------
  ['air-squat', 'Air Squat', 'Bodyweight', ['Quads', 'Glutes'], ['Arms forward for balance', 'Hips below knees if mobility allows', 'Full stand at the top']],
  ['jump-squat', 'Jump Squat', 'Bodyweight', ['Quads', 'Glutes', 'Cardio'], ['Quarter-to-half squat load', 'Explode up, arms swing', 'Land soft and go straight into the next rep']],
  ['glute-bridge', 'Glute Bridge', 'Bodyweight', ['Glutes', 'Hamstrings'], ['Feet flat, close to your hips', 'Press through heels', 'Squeeze glutes for one second at the top']],
  ['push-up', 'Push-Up', 'Bodyweight', ['Chest', 'Triceps', 'Shoulders'], ['Hands under shoulders, body in a plank', 'Chest to fist height', 'Elbows back at 45°, not flared']],
  ['dip', 'Dip', 'Bodyweight', ['Triceps', 'Chest'], ['Shoulders down, chest up', 'Lower until upper arm is parallel', 'Lock out at the top']],
  ['pike-push-up', 'Pike Push-Up', 'Bodyweight', ['Shoulders', 'Triceps'], ['Hips high, inverted V', 'Head travels in front of hands', 'Press back to the V']],
  ['pull-up', 'Pull-Up', 'Bodyweight', ['Lats', 'Biceps', 'Forearms'], ['Dead hang, shoulders engaged', 'Pull chest toward the bar', 'Lower all the way under control']],
  ['chin-up', 'Chin-Up', 'Bodyweight', ['Biceps', 'Lats'], ['Palms facing you, shoulder-width', 'Chin over the bar', 'Full hang between reps']],
  ['inverted-row', 'Inverted Row', 'Bodyweight', ['Lats', 'Traps & Neck', 'Biceps'], ['Body straight under a bar or table', 'Pull chest to the bar', 'Squeeze glutes so hips stay up']],
  ['plank', 'Plank', 'Bodyweight', ['Abs', 'Shoulders'], ['Elbows under shoulders', 'Squeeze glutes, ribs down', 'Breathe, do not hold your breath']],
  ['side-plank', 'Side Plank', 'Bodyweight', ['Obliques', 'Abductors'], ['Elbow under shoulder', 'Hips high, body in a line', 'Switch sides halfway']],
  ['hollow-hold', 'Hollow Hold', 'Bodyweight', ['Abs'], ['Lower back pressed into the floor', 'Arms and legs long', 'Raise legs higher if your back lifts']],
  ['russian-twist', 'Russian Twist', 'Bodyweight', ['Obliques', 'Abs'], ['Lean back, chest up', 'Rotate shoulders, not just arms', 'Feet down for easier, up for harder']],
  ['hanging-knee-raise', 'Hanging Knee Raise', 'Bodyweight', ['Abs', 'Forearms'], ['Dead hang, shoulders active', 'Curl knees to chest', 'No swinging, lower slowly']],
  ['superman', 'Superman', 'Bodyweight', ['Lower back', 'Glutes'], ['Lie face down, arms long', 'Lift arms, chest and legs together', 'Hold two seconds, lower slowly']],
  ['bird-dog', 'Bird Dog', 'Bodyweight', ['Lower back', 'Abs', 'Glutes'], ['Hands under shoulders, knees under hips', 'Reach opposite arm and leg long', 'Keep hips level, no rotation']],
  ['copenhagen-plank', 'Copenhagen Plank', 'Bodyweight', ['Adductors', 'Obliques'], ['Top leg on a bench, side plank position', 'Lift hips, bottom leg hangs or lifts', 'Short holds, build up slowly']],
  ['lateral-band-walk', 'Lateral Band Walk', 'Bodyweight', ['Abductors', 'Glutes'], ['Band above knees, quarter squat', 'Step sideways, keep tension', 'Toes forward, do not let knees cave']],
  ['side-lying-leg-raise', 'Side-Lying Leg Raise', 'Bodyweight', ['Abductors'], ['Lie on your side, body straight', 'Lift the top leg, toes slightly down', 'Lower slowly']],
  ['calf-raise', 'Calf Raise', 'Bodyweight', ['Calves'], ['Stand on a step edge', 'Rise high on your toes', 'Slow stretch at the bottom']],
  ['burpee', 'Burpee', 'Bodyweight', ['Cardio', 'Chest', 'Quads'], ['Hands down, jump feet back', 'Chest to floor', 'Jump feet in and leap up with a clap']],
  ['mountain-climber', 'Mountain Climber', 'Bodyweight', ['Cardio', 'Abs'], ['Strong plank, hands under shoulders', 'Drive knees to chest fast', 'Hips stay level']],
  ['jumping-jack', 'Jumping Jack', 'Bodyweight', ['Cardio', 'Calves', 'Shoulders'], ['Light on your toes', 'Arms overhead as feet go wide', 'Keep a steady rhythm']],
  ['high-knees', 'High Knees', 'Bodyweight', ['Cardio', 'Quads'], ['Run on the spot', 'Knees to hip height', 'Pump your arms']],
  ['jump-rope', 'Jump Rope', 'Bodyweight', ['Cardio', 'Calves'], ['Small hops on the balls of your feet', 'Turn the rope from the wrists', 'Elbows close to your sides']],
]

export const EXERCISES = raw.map(([id, name, equipment, muscles, cues]) => ({
  id,
  name,
  equipment,
  muscles,
  muscle: muscles[0],
  cues,
  video: yt(name),
}))

export const exerciseById = Object.fromEntries(EXERCISES.map((e) => [e.id, e]))

export const exercisesFor = (muscle) => EXERCISES.filter((e) => e.muscles.includes(muscle))
