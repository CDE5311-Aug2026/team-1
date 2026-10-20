# IntentAI web (TypeScript)

The TypeScript React app for IntentAI / Singlish Daily: React 18, TypeScript, Vite 7, React Router 7, CSS Modules,
Vitest + Testing Library, Playwright + axe. It reimplements the Figma screens of the older `web/` app with validated
device-local stores, and adds **Nearby Explorer** (a map of Singapore places, stories, collections, Save / Visited).

> Production today still serves `../web` (see [Deployment](#deployment-root-migration-and-rollback)). This app goes
> live only after the deployment-root change below.

## Run it

```sh
cd intentai-web
npm ci
npm run dev          # http://localhost:5173
npm test             # unit + integration (Vitest, jsdom)
npm run validate:explore   # Nearby catalogue checks
npm run build        # tsc -b && vite build → dist/
npm run e2e          # Playwright: builds, serves dist on :4321, runs e2e/
```

Playwright needs a Chromium. If the bundled revision is not installed (some CI images), point it at one:
`PW_CHROMIUM_PATH=/path/to/chrome npm run e2e`.

No environment variables are required. Optional: `VITE_EARTH_ONLINE_SG_URL` — where the 3D Singapore page is served
(defaults to the bundled `/earth-online/sg/index.html`).

## Nearby Explorer

Today → **Nearby** opens Explore (location off or on). Inside Nearby: **Explore · Collections · Saved**; the five bottom
tabs are unchanged.

| Route | Screen |
| --- | --- |
| `/nearby` | Explore: 2D map + synchronized list. Query: `view=list`, `category`, `q`, `area`, `radius`, `sort`, `sel` (never a position) |
| `/nearby/location` | Choose an area, or use your location (explained first) |
| `/nearby/place/:placeKey` | Place detail (`curated:sg-…`) |
| `/nearby/collections`, `/nearby/collections/:id` | Collection progress, list/map, filters |
| `/nearby/saved` | Saved / Visited, backup and restore (JSON) |
| `/nearby/places` | The nine phrase settings ("Phrases for a setting", Figma 11:1571) |
| `/nearby/phrases` | The heads-up phrase screen (Figma 11:1414), formerly `/nearby` |

**Scope (team decision, 20 Oct 2026):** Singapore only, built on the **EARTH ONLINE (City Brush) Singapore dataset**;
no Google Maps / Places APIs. "Directions" is a plain `google.com/maps/dir/?api=1&destination=<lat,lng>` link with no
origin — no API call and no position leaves the app. Malaysia and live restaurant search from the PRD are out of scope.

### Data (`src/data/explore/`, see its [README](src/data/explore/README.md))

- `places.sg.json` — 142 published places: 121 landmarks/sites from the EARTH ONLINE dataset (names in English and
  Chinese, intro cards, positions of the 3D models) merged with researched entries whose fun facts carry source links
  (43 places have source-linked facts; the others say "No sourced fun facts yet").
- `collections.json` — "Singapore collection (draft) · 100 places". It stays a draft (`status: starter`) until a team
  editor signs it off; the validator refuses a `published` claim without 100 signed-off members.
- `areas.json` — 21 areas in the five URA regions, centres from Wikipedia.
- `roads-major.json`, `roads-minor.json` — simplified road layers from the dataset's `sg_roads` (OpenStreetMap).
- `outlines.json` — Singapore outline (Natural Earth, public domain), used to tell whether a fix is in Singapore.
- `stats.json` — the published-place count Today shows (kept in step by the validator).

### Map, 3D and privacy

- `src/features/nearby/map/CityMap.tsx` draws the dataset's ground image (`src/assets/nearby/sg-ground.webp`) and roads
  in the dataset's own metric frame (x = (lng − 103.845)·111290.5, y = (lat − 1.315)·110574), with pan / wheel / pinch /
  keyboard zoom, recenter, clustering (the selected pin is never clustered), radius overlay and a "you" dot only for a
  precise fix. No map tiles or third-party services are requested.
- "View in 3D" opens `public/earth-online/sg/index.html` (a copy of the City Brush Singapore page, ~21 MB with data)
  in a new tab. `scripts/sync-earth-online.mjs <earth_online/site>` refreshes the copy; it adds a doctype/charset, hides
  the five-city switch and appends `scripts/earth-online-bridge.js`, which handles `?card=<landmark key>` (opens that
  intro card and flies to it) and `?at=<lat>,<lng>` (marks the point on the big map and flies there).
- Location: one `getCurrentPosition` (10 s timeout, 60 s max age) after the explanation is accepted; no watch. States:
  manual, requesting, active, denied, unavailable, timeout, unsupported; worse than 500 m = "Approximate location";
  outside Singapore = manual browsing with a note. The position stays in memory (`src/features/nearby/location.ts`),
  never in storage, URLs, exports or logs. Turning location off or deleting data invalidates pending callbacks.
- Personal state: `intentai:v1:explore-personal` (`explorePersonalStore` in `src/data/stores.ts`): saved / visited flags,
  self-reported visit dates, preferred area, the time the location explanation was accepted, seen milestones.
  "Delete all my data" clears it, stops location and cancels Undo.

### Maintenance scripts (`scripts/explore/`)

One-time import tools, kept for reproducibility: `extract-earth-online.cjs` (dump the dataset from the City Brush page,
headless), `build-roads.py` (road layers), `assemble-catalogue.py` (merge dataset + research into the catalogue — it
overwrites `places.sg.json`, so after editors start editing that file, apply dataset updates by hand instead).

## Deployment-root migration and rollback

Production (`cde-5311.vercel.app`) currently builds `web/` (React 19, `singlish-v2-state` in localStorage). Moving it to
this app:

1. **Preview first.** Create a preview deployment of this branch with Root Directory `intentai-web` (framework Vite,
   `npm ci`, `npm run build`, output `dist`; `vercel.json` here sets the same). Check: deep links such as
   `/nearby/place/curated:sg-merlion-park` reload; `/earth-online/sg/index.html?card=merlion` serves the 3D page
   (static files win over the SPA rewrite); onboarding, Today, Ask, Community, Moments, My Space work.
2. **Data migration** runs once at startup (`src/data/migration/legacyMigration.ts`, called in `main.tsx`): it copies
   `singlish-v2-state` (or the older `singlish-v1-learned` / `singlish-v1-saved`) into the `intentai:v1:*` stores,
   never overwrites a key that already exists, maps legacy phrase ids (`can` → `can-or-not`), forces location off,
   keeps anything it cannot convert in `intentai:v1:migration-recovery`, leaves the legacy keys untouched, and writes
   `intentai:v1:migration` last (an interrupted run resumes from `intentai:v1:migration-pending`). Test it on a copy of
   real browser data (export localStorage from a test profile), not by clearing someone's storage.
3. **Before switching**, record the current production deployment ID, its Root Directory (`web`) and settings
   (Vercel → Project → Deployments / Settings → General), and confirm who may change the project.
4. **Switch:** set Root Directory to `intentai-web`, redeploy, keep the same domain. Verify on production: the routes
   above, an existing visitor's progress (open the site in a browser that used the old app), the 3D link.
5. **Rollback:** promote the recorded previous deployment (Vercel → Deployments → … → Promote / Instant Rollback) and set
   Root Directory back to `web`. Nothing is lost: the old app still reads `singlish-v2-state`, which the migration never
   changes. Do not delete `web/` or the legacy keys in this release.

## Tests

- Unit/integration (`npm test`): stores, migration fixtures (populated, partial/corrupt, existing new-app user,
  interrupted, repeat), Nearby personal state (Save/Visited independence, Undo, dates, import/export), catalogue
  validation and collection progress, location states and late callbacks, map projection/clustering, pages.
- E2E (`npm run e2e`): Figma geometry (heads-up screen moved to `/nearby/phrases`, see the comment in
  `e2e/nearby.spec.ts`), Nearby journeys in `e2e/explore.spec.ts` (principal journey, no search while panning,
  clusters/keyboard, deep links and the bundled 3D page, multi-tab, unavailable storage, widths), axe on every route,
  smoke and overflow checks.
