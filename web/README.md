# IntentAI — Singlish Daily (React)

Interactive React + Vite implementation of all **seven pages and 19 main screens** in the Week 7 Figma file. The original 390 × 844 layouts, wording, colors, typography and local artwork replace the previous dashboard redesign.

[Complete page-by-page coverage and screenshots](docs/FIGMA-COVERAGE.md)

## Run

Requires Node.js 22.12+.

```sh
cd web
npm ci
npm run dev
```

```sh
npm run build
npm run preview
```

## Deployment

Vercel project `cde-5311` serves [cde-5311.vercel.app](https://cde-5311.vercel.app/). Root directory: `web`; framework: Vite; install: `npm ci`; build: `npm run build`; output: `dist`. No environment variables are needed for the local prototype. The same source is in Wsamme/CDE-5311 and CDE5311-Aug2026/team-1. Automatic Git deployments currently require correcting Vercel's commit-author Git account linkage; authenticated CLI deployment works.

## Behaviour

New visitors enter the five-screen onboarding flow. Existing learning/saved-expression data is migrated from the original prototype. All five profile switches and location start off. Profile fields, switches, learning progress, lookups, anonymous questions, locally entered answers, reports and AI notice decisions persist on the device. Deletion, withdrawal and AI decisions offer Undo. Delete all data clears personalised state.

The Ask, Community, Moments, Nearby and My Space screens now follow their actual Figma designs. The app includes source labels, context selection, input/report/feedback actions, question status, location selection, profile edit/delete, notice details/edit/confirm/reject and quiz scoring. Speech playback and dictation are browser features with fallbacks.

The application remains a **local prototype**: no real AI service, server community, calendar sync, live venue lookup or remote notifications are connected. Sample streak, confirmations, calendar event and map come from the supplied design. See coverage for precise limitations. The SwiftUI app is unchanged and still implements the earlier Home prototype.

## Tests

```sh
npx playwright install chromium
npm test
```

`PLAYWRIGHT_CHROMIUM_PATH` selects an existing Chromium binary. `PLAYWRIGHT_BASE_URL` tests a running preview or deployed site. Nine tests exercise all 19 screens and seven pages, artwork loading, runtime errors, reference dimensions, persistence, onboarding, settings and interaction flows, plus viewport overflow.

For visual review, `?screen=ask` (and the other screen names listed in the test) opens a specific state. `&reference=1` displays sample reference values for screenshot comparison; ordinary usage uses actual local values.
