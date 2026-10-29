# IntentAI handoff (29 Oct 2026: story walks, OneMap, place cards)

Paste this into a new Claude Code session opened in `~/Documents/GitHub/CDE-5311-team1`:

> Read docs/HANDOFF.md, then docs/MERGE-TEAM1-V3.md. Continue IntentAI from where it stands. Reply to me in Chinese and
> English, line by line. No invented data. Commit, push and deploy only when I ask. Don't push to the team repo
> (CDE5311-Aug2026/team-1) without asking.

## 1. Where things are

| What | Where |
| --- | --- |
| Working folder | `~/Documents/GitHub/CDE-5311-team1` (a git worktree). App in `intentai-web/`. |
| Branch | `merge/team1-v3`, pushed to `origin` = `Wsamme/CDE-5311` (the owner's repo). `3a687d8` adds story walks, OneMap and place cards. |
| Team repo | `CDE5311-Aug2026/team-1`. Changes for the team go there as a PR, only when the owner asks. |
| Live site | https://cde-5311.vercel.app = `3a687d8` (deployed 29 Oct; story walks, OneMap tiles, place cards and story Route buttons checked live in WebKit at iPhone size). |
| Deploy | From the worktree root: `vercel deploy --prod --yes` (Vercel project `wsammes-projects/cde-5311`, Root Directory `intentai-web`). Git-triggered deploys are **blocked**: the commit email isn't on the Vercel account, so always use the CLI. |
| Other worktrees | `~/Documents/GitHub/CDE-5311-pr5` (PR #5, for comparing), `~/Documents/GitHub/CDE-5311` (older tree). |
| 3D city | `Wsamme/EARTH_ONLINE`; the app bundles `intentai-web/public/earth-online/sg/lite.html` (`npm run sync:earth-online -- <checkout>`). |

## 2. How to work

- Dev server: `cd intentai-web && npx vite --port 5181`.
- Unit tests: `NODE_OPTIONS=--no-experimental-webstorage npx vitest run`. Now **1013 pass**. (`Explorer.test.tsx` › “a submitted search…” can time out at 5 s in a busy full run; it passes alone.)
- e2e: `npm run build && PW_CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx playwright test --grep-invert nearby3d`. Now **127 pass**; `e2e/nearby3d.spec.ts` alone also passes. (`nearby3d` is left out of the usual run; `Nearby3D.test.tsx` can be order-flaky in a full run.)
- Catalogue check: `npm run validate:explore`. A fact needs 20+ words and a deep-link source (a home page is refused).
- iPhone check: Playwright WebKit with `devices['iPhone 14']`, viewport 390×664. Import Playwright from
  `intentai-web/node_modules/playwright/index.mjs` when the script lives outside the app.
- Test seed in localStorage: `intentai:v1:tester = {"name":"P01"}` and
  `intentai:v1:onboarding = {"done":true,"duration":"3 months – 1 year","topics":["Food"]}`. An invalid duration sends you
  back to onboarding.
- Stack: React 18, TypeScript, Vite 7, React Router 7, CSS Modules, motion/react, Vitest, Playwright + axe. Paths come only
  from `src/routes.ts`.

### Owner rules

- **No invented data.** Every fact, date, hour and position needs a source, or it is left out. Estimates are labelled.
- **Do not use the Singapore Culture Atlas photos.** 170 of 171 are "reference only" with no reuse licence.
- Reply in **Chinese and simple English, line by line**.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## 3. What the app has now

The base is Team 1's `main` plus our v3 work. The merge decisions are in `docs/MERGE-TEAM1-V3.md`.

- **Home** (Team 1's design):
  - Holiday card.
  - Map on **our own Singapore map** (`components/HomeMap/CityHomeMap.tsx` → `features/nearby/map/CityMap`), with clusters and a 3D button.
  - Carousel of **305 cards**: Team 1's 5 (2 story places and 3 Nearby places), then every published place, nearest to NUS UTown first.
  - "304 places to explore" chip.
  - Carousel memory limits: only cards within 4 of the centre load a photo (`PHOTO_WINDOW`), and only cards near the centre get the parallax transform. Both limits stop iPhone Safari crashes; keep them if you change the carousel.
- **Place stories** (Team 1):
  - `/place/chinatown/*` and `/place/berlin-wall-fragments/*`, with food, monument, festival and history cards.
  - Each card has an "X in Nearby" button and a "3D" button (`components/story/StoryNearby.tsx`, `TARGETS`):
    - Chinatown food → Lim Chee Guan; monument → Thian Hock Keng; festival → Pagoda Street; history → the Chinatown area.
    - Berlin food → The Spread; the other Berlin cards → Berlin Wall Fragments.
- **Nearby** (`features/nearby/`, `pages/NearbyPage/`):
  - **304 published places** in `src/data/explore/places.sg.json`, all with English text.
  - 2D map and 3D view, sheet, search, filters, Save / Check in.
  - **Routes**: `/nearby/routes` shows **3 story walks** (ours), the 5 editor routes from the atlas, and "make a route from an MRT station" (the atlas's engine, ported to `features/nearby/routes/engine.ts`).
    - Story walks live in `src/data/routes/teamRoutes.ts`: Chinatown story walk (Telok Ayer → Lim Chee Guan), Chinatown food walk (Maxwell → Lim Chee Guan), Kent Ridge (The Spread → NUS Museum → Lee Kong Chian museum → Berlin Wall).
    - Stops are Nearby places. Atlas places take the atlas's visit time; other visit times are our estimates, shown as "≈ … (estimate)". Hours and closing days come from each place's sourced details; each walk lists the pages behind its note.
    - Story cards have a "Route" button to their walk (`storyRoute()` in `StoryNearby.tsx`); a walk links back to its story.
  - Route detail has numbered stops on the map; stops a few metres apart are nudged apart (`spread()` in `map/projection.ts`) so each pin stays tappable.
  - Place pages show "On routes: …" (story walks and atlas routes).
  - **2D map detail**: zoomed in (from `TILES_FROM`), OneMap's basemap (Singapore Land Authority) fades in over our ground picture: street names, house numbers, MRT exits. Tiles load from `onemap.gov.sg` (plain images, no user data); offline, the ground picture stays. OneMap's terms require its logo and "OneMap © contributors | Singapore Land Authority" on the map (`OneMapCredit` / `MapCredits` in `CityMap.tsx`). The e2e "no outside requests" checks allow only these tile images.
  - **Place cards**: every place page opens as a story card (`features/nearby/card/PlaceStoryCard.tsx`): kicker, heading, Chinese name, photo. Each further part (clip, three sourced numbers, then and now, text, "Look for", sources) shows only when `src/data/explore/placeCards.ts` has it for the place. Pilot cards: Thian Hock Keng (Team 1's), Sri Mariamman and Masjid Jamae (both with then and now), NUS Museum, Lee Kong Chian museum, Pagoda Street; Lim Chee Guan, The Spread and the Wall link to Team 1's cards. Card photos are in `public/nearby/cards/`, credited in Settings › Terms & licences.
- **Place pictures**: card photo → Wikimedia Commons photo (`public/nearby/photos`, credits in `src/data/explore/photos.json`) → 3D thumbnail → 2D map crop (`placePicture()` in `src/data/home/nearbyCards.ts`). To fetch photos for new places, run `node scripts/explore/place-photos.mjs`.
- **Ask**: answers from your cards, attachments, and both cards fully visible on iPhone.
- **Community**: the card kit has 200 members (photo portraits plus our cartoon avatars), 200 questions, 954 replies and 41 notifications, all marked as demo content in Settings › Terms & licences.
- **Moments**: passport stamps (including Team 1's story stamps) and Snap & recognise (Figma M3).
- **My Space**: "You as a local", memory controls and the PR #5 extras.
- **Settings**: "Redo onboarding". Onboarding itself has an exit (✕).

### Atlas data (done)

- Source: the team's "singapore-atlas" release.
- Files: `src/data/atlas/atlas.zh.json` (source), `atlas.en.json` (English translation), `placeKeys.json` (atlas id → Nearby key), `atlas.ts`, `atlasRoutes.ts`.
- Import: `python3 intentai-web/scripts/explore/import-atlas.py` (re-runnable; it replaces earlier atlas imports).
- `docs/atlas-handoff/` keeps the translation batches and the original `route-engine.js`.

### Places added by hand on 29 Oct (sourced)

| Place | Key | Sources |
| --- | --- | --- |
| Berlin Wall Fragments | `curated:sg-berlin-wall-fragments-utown` | the-wall-net.org; Team 1's coordinates. Hidden on Home (`STORY_TWINS` in `src/data/homePlaces.ts`) because Team 1's story card is the same spot. |
| Lim Chee Guan (New Bridge Road) | `curated:sg-lim-chee-guan-new-bridge-road` | chinatown.sg (history, address, hours); OneMap (059429) |
| The Spread | `curated:sg-the-spread-nus` | thespread.sg (hours, address, shuttle stop); NUSSU The Ridge (dishes); OneMap (119245) |

## 4. Recent commits (newest first, all live)

- `3a687d8` Story walks, OneMap street-level map, place cards template and pilot.
- `670fa0d` Three new Nearby places; story cards open them.
- `64da931` Home crash fix on iPhone: parallax only near the centre.
- `0fd3156` Story cards: "in Nearby" and "3D" buttons.
- `e4cdf31` Atlas tour routes and 131 new places.
- `7acf1ac` My Space PR #5 extras.
- `0c61353` Home on our map with 3D; Ask fits on iPhone; Moments Snap.
- `33502a7` iPhone crash after onboarding fixed; onboarding exit and redo.
- `800a068` Community card kit.

## 5. Next (the owner's stated direction)

1. **A main line for the demo.** The owner said the app lacks one clear demo story. Proposed: make the "scene" (a shared Singapore moment, e.g. queueing for bak kwa before Lunar New Year) the unit: understand (story card) → go (map, route) → do (a check-in with a small spoken task) → talk (Community questions attached to the scene). Fewer, deeper scenes; the 304 places become the toolbox behind them. Next step agreed in principle: a one-page demo storyboard before changing Home and Community. Missing parts: the "do" task and Community-to-scene links.
2. **Place cards in batches, scene first.** The template is in; each place needs research (≈10–15 min). Tian Tian and Ann Chin have only the template: the MICHELIN Guide site is blank to fetch tools, and other pages disagree on Tian Tian's founding year (1986 or 1987). 120 places have no sourced facts at all.
3. **Real iPhone check.** The Home crash fix and the OneMap map were checked in WebKit at iPhone size, not on a device. Ask the owner to confirm on their phone.
4. **Open items:**
   - The Google Drive folder the owner shared (`1xTEHbmaHgWhlnE5hbnMtooxxMX_6ejxr`) couldn't be opened: it isn't public, and the Drive connector wasn't authorised.
   - The Tembusu and NUS alumni pages are JS-rendered and return empty to fetch tools.
   - OneMap search failed for 138596, 117600 and "Tembusu College".

## 6. Dev servers that may still be running

- :5181 serves this worktree.
- :5182 serves PR #5.
- :5179 serves the old tree.
- :8767 serves the prototype.
- :5173 is the owner's own.

Stop any you don't need.
