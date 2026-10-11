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

## Trainers

Everyone joins as a member. Personal trainers send an application (qualification, ABN, date of birth, first aid, insurance, certificate photo) from `#/apply`, and an admin approves it under Admin → Trainer approvals. Only approved trainers get coach tools (publish, sell, clients). Firestore rules stop anyone making themselves a coach.

## Credits

Photos from [Unsplash](https://unsplash.com) (Unsplash License). Food values: USDA FoodData Central. Built by [yadata.com.au](https://yadata.com.au).

The health tools are education, not medical advice.
