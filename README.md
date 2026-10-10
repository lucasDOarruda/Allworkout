# All Workout

A community training app: a Strava-style feed with kudos and training partners, coaches and clients, guided EMOM / AMRAP / Tabata / circuit timers, multi-week programs, progress tracking, and free public health calculators.

Built with React 19 and Vite. Purple and white, with a dark mode.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

The app currently stores everything in the browser (localStorage) and opens with demo data. The API lives in a separate repo (`Allworkoutbackend`).

## What's inside

- **Landing page** (`#/welcome`) with public **Health tools** (`#/tools`): energy and macros, a food builder, carb cycling, measures beyond BMI, and 30 linked sources.
- **Home**: feed (Following / Partners / Coaching), your week, weekly leaderboard.
- **Explore**: workouts, body-map exercise library, programs, coaches.
- **Start** (centre button): quick timer, today's plan, coach assignments.
- **Plan**: multi-week programs and assigned workouts.
- **You**: progress (volume chart, PRs, badges), activities, settings.
- **Roles**: client, coach (publish workouts, manage clients) and admin (`#/admin`, open without login for now).

Demo accounts are on the sign-in screen.

## Credits

Photos from [Unsplash](https://unsplash.com) (Unsplash License). Food values: USDA FoodData Central. Built by [yadata.com.au](https://yadata.com.au).

The health tools are education, not medical advice.
