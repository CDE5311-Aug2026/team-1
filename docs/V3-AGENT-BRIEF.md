# v3 build brief (shared by everyone working on a v3 page)

Read first: `docs/V3-MERGE-MAP.md` (rules, sub-page table), `docs/PRD-ASK-COMMUNITY-MOMENTS.md` (data model, honesty
rules), `docs/figma-v3/README.md` + the PNGs (rendered Figma frames) + `docs/figma-v3/frames-text.txt` (every frame's
exact text and the designer's KEY INTERACTION / NOTE text).

The ZIP prototype (newest, 29 Oct 01:55) is at `~/Documents/GitHub/intentai-prototype/IntentAI-Claude-handoff/`:
`CLAUDE-HANDOFF.txt` (owner decisions), `prototype/app.js` (+ `community-explore.js`, `community-social.js`), its CSS
files (load order in `app.html`), screenshots `prototype/*.png` (Community-v3-*.png are the newest Community), assets in
`prototype/assets/`. Serve it with `python3 -m http.server 8767 --bind 127.0.0.1` from `prototype/` (already running
on 8767) to click through: `http://127.0.0.1:8767/app.html?view=community` etc.

App: `~/Documents/GitHub/CDE-5311/intentai-web` (React 18, TypeScript, Vite, CSS Modules, Vitest). Branch
`feature/v3-prototype`. Dev server already running at `http://localhost:5179`.

## Rules (owner decisions, in priority order)

1. **Interaction**: for Ask, Community and Moments the ZIP prototype wins; for Home, place and card pages, Onboarding and
   My Space the Figma frames win. **Nearby (`src/features/nearby`, `src/pages/NearbyPage`) is not changed.**
2. **Look**: Intent v3 — warm grey paper `#edebe5`, accent `#e4671f` / dark `#a3400a`, soft `#fff2eb`, Inter, the
   lion logo/mascot, real photos, stroke SVG icons from the prototype/Figma assets (never emoji or text glyphs as icons).
   Shape system: cards 24px, controls 16px, compact 10–12px, composer 20 / inner 14, sheets 28; add
   `corner-shape: superellipse(1.5)` under `@supports`. Must not look generic: use the motion components (below).
3. **No invented data** (owner's standing rule): every fact, date, number, place, opening hour comes from the repo's
   sourced content (`src/data/culture.ts`, `src/data/articles/*`, `src/data/explore/*.json`, `src/data/videos.ts`,
   `src/data/articleImages.ts`, holidays in `src/data/holiday.ts`) or is left out. Figma/ZIP content that the repo lacks
   (Berlin Wall Fragments, bak kwa, Lim Chee Guan, The Spread, Chinatown 1822 history, Mei's tip…) is **not** copied
   as fact. Seeded people/replies/questions are allowed only as clearly separate example content: mark them with
   `sample: true` in data and show a small "Example" tag once per item card (the ZIP removed such labels, but the
   owner's no-fake-data rule wins until the owner decides otherwise — note it in your report). No fake counts
   ("12 replies", "94% match", "38 locals") unless computed from real local data.
4. **Accessibility**: real buttons/links, labels, focus visible, contrast AA (the brand orange `#e4671f` on white is an
   accepted exception), reduced motion respected (`prefers-reduced-motion` and `html.reduce-motion`), 44px targets
   where possible, no horizontal scroll at 320 / 390 / 1440 px.
5. **Text**: English UI, short, plain; no "AI" claims (nothing calls a model).

## Shared code you may use (read-only for you)

- Stores: `src/data/stores.ts` (`questionsStore`, `tipsStore`, `insightsStore`, `openedCardsStore`, `lookupsStore`,
  `explorePersonalStore` (Nearby saved/visited = check-ins), `culturePrefsStore`, `profileStore`, `settingsStore`,
  `onboardingStore`…), `usePersistentStore` (`src/data/persistentStore.ts`), types in `src/data/domain.ts`.
- Culture cards: `src/pages/AskPage/cards.ts` (`SUBJECTS` = areas with cards, `cardById`, `subjectOfCard`, `topicInfo`,
  `keyNumberOf`, `askFromCards`), `src/data/cultureLinks.ts` (card ↔ Nearby place), `ARTICLE_IMAGES`, `ARTICLE_VIDEOS`.
- Community rules: `src/data/localAnswer.ts` (answer → tip / phrase, `progressOf`, `markSeen`).
- Nearby data: `src/features/nearby/catalogue.ts` (places), `src/data/explore/collections.json` (`sg-100`), map component
  `src/features/nearby/map/CityMap.tsx` (reuse as-is, don't edit).
- Routes: `src/routes.ts` — `paths.place(key)`, `paths.card(id)`, `paths.mySpaceSettings`, `paths.mySpacePrivacy`,
  `paths.nearbyPlace(key)`, `paths.question(id)` etc. Placeholder pages exist for the new routes.
- Motion: `motion` 12 is installed. React Bits components already in `src/components/reactbits/` (BlurText with `as`,
  CountUp, ClickSpark, Magnet). You may add more React Bits components that need only `motion` or nothing (source:
  `gh api repos/DavidHDev/react-bits/contents/src/ts-default/<Category>/<Name>`), copied into
  `src/components/reactbits/` with a line in its README. Make them respect reduced motion.
- Shell: `AppShell` (header area + bottom `TabBar`), `Dialog` (native modal), `showToast` (`src/hooks/useToast`).

## Do not edit (owned by the integrator)

`src/data/stores.ts`, `src/data/domain.ts`, `src/routes.ts`, `src/App.tsx`, `src/components/AppShell/*`,
`src/components/TabBar/*`, `src/styles/*`, `src/test/setup.ts`, `package.json`, anything under `src/features/nearby`,
`src/pages/NearbyPage`, `src/pages/AskPage`, and other teams' folders. If you need a new persistent store, create it in
your own data file with `createPersistentStore` (unique `key`), and list in your report the one line the integrator
must add to `deleteAllData()`. If you need a shared change, describe it in your report instead of making it.

## Checking your work

- `cd intentai-web && npx tsc -b` (errors in other people's in-progress folders may appear — ignore those, fix yours),
  `NODE_OPTIONS=--no-experimental-webstorage npx vitest run src/pages/<YourPage>` (Node 25 needs that flag).
- Update or replace your pages' tests so they describe the new behaviour; keep data rules unit-tested.
- **Do not run Playwright / `npm run e2e` / `npm run build`** (they share a port and the integrator runs them at the end).
- Visual check with headless Chrome against the dev server: see `docs/v3-shot.mjs` (copy it into `intentai-web/`, run
  `node v3-shot.tmp.mjs <url-path> <out.png>`, delete the copy). Compare with the Figma PNG / ZIP screenshot.
- Report: what you built per frame, which data each part uses, what you left out and why (missing content), new
  stores and the `deleteAllData` lines, shared changes you need, test results.

## Update (integrator, after start)

- **Reduce motion** is one app setting: `reduceMotionStore` in `src/data/stores.ts`, applied in `App.tsx` via
  `<MotionConfig reducedMotion={…}>` and `html.reduce-motion` (global CSS stops CSS animations). In motion components
  use `useReducedMotionConfig()` from `motion/react` (not `useReducedMotion()`). My Space settings should read/write
  `reduceMotionStore` (don't create another flag).
- Bottom tab "Today" is now labelled **Home** (route `/` unchanged).
- **Photo credits**: the four Figma photos (Thian Hock Keng `f5d56`, bak kwa `5142c`, Chinatown street `c15ab`, Berlin
  Wall `3327d`) are CC BY-SA. Credits are in `src/assets/v3/credits.ts` (`V3_PHOTO_CREDITS`); wherever you show one,
  show its credit on the page or link to a credits list. Repo card photos already carry credits in `ARTICLE_IMAGES`.
