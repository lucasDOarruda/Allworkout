# All Workout

A community training app: a Strava-style feed with kudos and training partners, coaches and clients, guided EMOM / AMRAP / Tabata / circuit timers, multi-week programs, progress tracking, and free public health calculators.

Built with React 19 and Vite. Purple and white, with a dark mode.

**Live:** https://lucasdoarruda.github.io/Allworkout/

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

Every push to `master` builds and publishes the site to GitHub Pages (`.github/workflows/deploy.yml`). In the repo's Settings → Pages, Source must be **GitHub Actions**.

The app currently stores everything in the browser (localStorage) and opens with demo data. The API lives in a separate repo (`Allworkoutbackend`).

## What's inside

- **Landing page** (`#/welcome`) with public **Health tools** (`#/tools`): energy and macros, a food builder, carb cycling, measures beyond BMI, and 30 linked sources.
- **Home**: feed (Following / Partners / Coaching), your week, weekly leaderboard.
- **Explore**: workouts, body-map exercise library, programs, coaches.
- **Start** (centre button): quick timer, today's plan, coach assignments.
- **Plan**: multi-week programs and assigned workouts.
- **You**: progress (volume chart, PRs, badges), activities, settings.
- **Roles**: client, coach (publish workouts, manage clients) and admin. The admin dashboard is at `/admin` and needs Google sign-in with the admin account (UID in `src/lib/access.js`).
- **Live site**: sign-in is Google only. Demo and device-only accounts appear in local development only.

Demo accounts are on the sign-in screen.

## Server functions and email (Vercel)

`api/` holds Vercel serverless functions. They're the only code that sees secrets.

| Endpoint | What it does |
|---|---|
| `GET /api/geo` | Approximate city, region and country from Vercel's IP lookup (no IP stored) |
| `POST /api/contact` | Landing page contact form: saves to Firestore `contactMessages`, emails the admin |
| `POST /api/notify` | Needs a Firebase sign-in token. Welcome email + admin alert on sign-up, trainer application alerts, approval emails |

Set these in Vercel → Project → Settings → Environment Variables (never with a `VITE_` prefix, and never in git):

| Variable | Needed | Value |
|---|---|---|
| `RESEND_API_KEY` | yes | Resend API key (mark it Sensitive) |
| `EMAIL_FROM` | no | Sender on a domain verified in Resend. Default `All Workout by Yadata <noreply@yadata.com.au>` |
| `NOTIFY_TO` | no | Where admin alerts go. Default `contact@yadata.com.au` |

Locally, `npm run dev` doesn't run these functions: the contact form and emails only work on the live site.

## Health tools

- Calculations live in `src/lib/healthCalc.js` (no React) and are tested: `npm run test:health`. Macros are whole grams that reconcile with the calorie target (protein 4, carbs 4, fat 9 kcal/g).
- Sources are in `src/data/healthEvidence.js`, each with organisation, date, evidence strength and the date its link was checked. Add new ones at the end so citation numbers stay stable.
- The guided walkthrough, results extras and shareable snapshot are in `src/views/health/Guided.jsx`. Answers and the current step are saved in local storage.
- No calorie targets in pregnancy, breastfeeding or under 18, and nothing changes by menstrual cycle phase.
- All tests: `npm test`.

## Camera form check

`src/formcoach/` checks squat, deadlift, lunge, swing and wall ball form live in the browser. A pose model (MediaPipe Pose Landmarker lite, `@mediapipe/tasks-vision` pinned to 1.0.1) finds 33 body points per frame; plain JavaScript rules turn the skeleton green or red. No video leaves the device.

| File | Job |
|---|---|
| `poseMath.js` | Landmark map, skeleton lines, angle and lean helpers |
| `metrics.js` | 33 points → knee/hip angle, torso lean, depth, wrist offset, heel lift, knee width, rear-knee gap |
| `exercises.js` | One object per exercise: camera view, rep signal, thresholds, live and after-rep checks with voice cues |
| `repEngine.js` | Smoothing, rep phases (ready → down → rising → judged), faults and verdict |
| `FormCoach.jsx` | Camera, model, overlay, voice cues, counter, setup screen, debug numbers |

- Add an exercise: add one object to `exercises.js` (list the app exercise ids it covers in `apps`).
- Thresholds are starting points from the developer guide; tune them on real clips.
- Tests: `npm run test:formcoach` (synthetic rep sequences, no camera needed).
- The model is in `public/models/`; the WebAssembly files are copied from `node_modules` by the `mediapipe-wasm` plugin in `vite.config.js`, so they always match the installed package version.
- The CSP allows `'wasm-unsafe-eval'`, and `vercel.json` allows `camera=(self)`.

Members reach it from the Start sheet (“Check my form”), Explore → Exercises, any exercise’s detail sheet, or the opt-in “Camera form check” switch on a workout.

## Trainers

Everyone joins as a member. Personal trainers send an application (qualification, ABN, date of birth, first aid, insurance, certificate photo) from `#/apply`, and an admin approves it under Admin → Trainer approvals. Only approved trainers get coach tools (publish, sell, clients). Firestore rules stop anyone making themselves a coach.

## Credits

Photos from [Unsplash](https://unsplash.com) (Unsplash License). Food values: USDA FoodData Central. Built by [yadata.com.au](https://yadata.com.au).

The health tools are education, not medical advice.
