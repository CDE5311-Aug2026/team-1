> **Done and live (29 Oct 2026).** This file records how the atlas work was done. For the current state, read `docs/HANDOFF.md`.

# Handoff: atlas tour routes (29 Oct 2026, ~11:40)

Paste this into a new Claude Code session opened in `~/Documents/GitHub/CDE-5311-team1`:

> Read docs/atlas-handoff/HANDOFF.md and docs/MERGE-TEAM1-V3.md, then finish the atlas tour-routes work described
> there. Reply in Chinese and English, line by line. Commit/push only when I ask; deploy with `vercel deploy --prod`
> only when I ask.

## Where things are

- Repo folder: `~/Documents/GitHub/CDE-5311-team1` (a git worktree), branch `merge/team1-v3`, pushed to
  `Wsamme/CDE-5311`. Last commit `7acf1ac` is live on https://cde-5311.vercel.app (deployed with the Vercel CLI from
  this folder; git-triggered deploys are blocked because the commit email isn't on the Vercel account).
- App: `intentai-web/`. Dev server: `npx vite --port 5181` in `intentai-web/`.
- Tests: `NODE_OPTIONS=--no-experimental-webstorage npx vitest run`; e2e:
  `npm run build && PW_CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx playwright test --grep-invert nearby3d`.
  At `7acf1ac`: 953 unit and 122 e2e pass.
- Owner rules: no invented facts (sources kept); reply in Chinese and English; don't push to the team repo
  (CDE5311-Aug2026/team-1) without asking.

## The task

The team released "singapore-atlas" (CDE5311-Aug2026/team-1 → Releases → singapore-atlas; two byte-split zip parts,
join with `cat part1 part2 > atlas.zip`). It holds 171 places (Chinese text), 184 MRT/LRT stations (102 with linked
places), 186 themed collections, 5 editor routes and a route engine. Owner decisions:
1. Translate the Chinese text to English (keep the Chinese as the source).
2. Add the new places to Nearby, enrich the shared ones, build **Routes** in Nearby: the 5 editor routes on our
   map with numbered stops, plus "make a route from an MRT station" using the atlas's engine.
3. Do NOT use the atlas photos: 170 of 171 are "reference_only" (no reuse licence). Use the app's own picture chain.

## Done (uncommitted, in this folder)

- `intentai-web/src/data/atlas/atlas.zh.json` — the atlas data.
- `intentai-web/src/data/atlas/placeKeys.json` — atlas id → Nearby key. 32 are places we already have, 139 are new
  (`curated:sg-<atlas id>`). Matching: name similarity ≥ 0.55 within 200 m, Nagore Dargah linked by hand,
  Singapore Chinese Cultural Centre kept separate.
- `intentai-web/scripts/explore/import-atlas.py` — adds the new places to `src/data/explore/places.sg.json`
  (researched entries with the atlas's own source links), fills missing hours/access notes on shared places,
  updates `stats.json`. Needs `src/data/atlas/atlas.en.json` first. Re-runnable.
- `intentai-web/scripts/validate-explore.mjs` — fact minimum lowered from 40 to 20 words (atlas facts are short
  sourced one-liners).
- This folder: `places-{1,2,3}.zh.json` (57 places each) and `other.zh.json` (routes, station themes, collection
  names) — the translation inputs; `en_c*.json` are partial translation outputs if a translator stopped midway;
  `route-engine.js` is the atlas's engine to port.

## Still to do

1. **Translate — DONE (11:50).** `src/data/atlas/atlas.en.json` is built (171 places, 5 routes, 184 station
   themes, 186 collection names; one shared theme mapping). The per-batch outputs are in this folder
   (`places-{1,2,3}.en.json`, `other.en.json`). Original instructions, kept for reference: translate `places-1/2/3.zh.json` and `other.zh.json` to English (rules: faithful, plain, keep caveats,
   proper names/dishes as locals write them, numbers and #unit numbers exact). Output per place
   `{id, en: {same keys, collections: [...]}}`. Then build `src/data/atlas/atlas.en.json` with the shape
   `{ places: { [atlasId]: {...en fields} }, routes: { [routeId]: {title, subtitle, duration, note} },
   stations: { [stationId]: { theme } }, collections: { [zhName]: enName } }`.
2. **Import places — DONE (12:00).** 131 added, 27 shared places enriched, 8 skipped (7 facts with only a home-page
   source, 1 without coordinates); catalogue now 301 published, `npm run validate:explore` clean (Sisters' Islands
   added to the offshore list). Count tests updated to 301 / 303. The photo fetch for new places was started
   (`node scripts/explore/place-photos.mjs`); if interrupted, rerun it and shrink new photos. Original step:
   `python3 scripts/explore/import-atlas.py`, then `npm run validate:explore`. Update tests and
   e2e that count 173 places (Home "173 places to explore", carousel 175 cards = 2 stories + places, etc.).
   Run the place-photo script for the new places: `node scripts/explore/place-photos.mjs`, then shrink new photos
   (`sips -Z 560 -s format jpeg -s formatOptions 72`).
3. **Routes UI** (may be partly written if the session stopped mid-way: check `git status` for
   `src/features/nearby/routes/`, `src/pages/NearbyPage/Routes*`, `src/data/atlas/atlas.ts`):
   - `src/data/atlas/atlas.ts`: types, `atlasPlace(id)`, `atlasText(id, field)` (English, else Chinese),
     `atlasRoutes`, `atlasStations` (with place_ids), `placeKeyOf`, `atlasIdOfPlaceKey`.
   - Port `route-engine.js` to `src/features/nearby/routes/engine.ts` with tests (closures, booking, ferry/taxi,
     walking legs ≤ 3.5 km, category variety, time budget). English reason strings.
   - `/nearby/routes`: the 5 editor routes as cards; "Make a route from an MRT station" (station search, time
     budget 1–6 h, walking/transit, theme, date) → generated route, with excluded places and reasons.
   - `/nearby/routes/:id` (and generated routes via query params): CityMap with numbered stops and a dashed line
     (add a small `path` prop to CityMap; label it "order suggestion, not road routing"), stats, note, stop list
     (picture via `placePicture`, visit minutes, hours, warnings), stop → Nearby place page, Google Maps walking
     links (plain links), Check in per stop with progress.
   - Entry points: a "Routes" chip beside Collections / Saved in Explore's sheet; "On routes: …" on place pages.
4. Test at iPhone size in WebKit (Playwright `webkit` + `devices['iPhone 14']`, viewport 390×664), run all
   suites, then ask the owner before committing and deploying.
