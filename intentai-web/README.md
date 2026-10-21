# IntentAI web (TypeScript)

The TypeScript React app for IntentAI / Singlish Daily: React 18, TypeScript, Vite 7, React Router 7, CSS Modules,
Vitest + Testing Library, Playwright + axe. It reimplements the Figma screens of the older `web/` app with validated
device-local stores, and adds **Nearby Explorer** (a map of Singapore places, stories, collections, Save / Check in, with check-ins as stamps in Moments).

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
(defaults to the bundled `/earth-online/sg/lite.html`); `VITE_ROUTER=hash` — hash URLs for a static host without SPA
rewrites (e.g. `VITE_ROUTER=hash npx vite build --base ./` for a click-through preview).

## Nearby Explorer

Today's **Near you** card opens Explore (location off or on). Explore is a full-screen map (like a maps app): Back,
search and the area chip on top, category chips under them, one column of map buttons on the right (3D, My location,
zoom, recenter), and a sheet of places at the bottom (peek, half, full = the List view; a side panel on wide screens).
The Nearby pages hide the app's tab bar. The sheet starts with the local phrases for the place picked on the phrase
settings, which Today's card names. Each place has a picture from the EARTH ONLINE 3D model
(`public/nearby/thumbs/`, listed in `src/data/explore/thumbs.json`; remake them with `node scripts/explore/thumbs.cjs
<dir>` then `python3 scripts/explore/thumbs-pack.py <dir>`); places without a model show the 3D area around them. Inside Nearby: **Explore · Collections · Saved**; the five bottom
tabs are unchanged.

| Route | Screen |
| --- | --- |
| `/nearby` | Explore: 2D map, 3D view or list + synchronized list. Query: `view=3d` / `view=list`, `category`, `q`, `area`, `radius`, `sort`, `sel`, `info=1` (the selected place's details unfolded in the sheet; Back folds them) (never a position) |
| `/nearby/location` | Choose an area, or use your location (explained first) |
| `/nearby/place/:placeKey` | Place detail (`curated:sg-…`) |
| `/nearby/collections`, `/nearby/collections/:id` | Collection progress, list/map, filters |
| `/nearby/saved` | Saved / Checked in (`?tab=visited`), backup and restore (JSON) |
| `/nearby/places` | The nine phrase settings ("Phrases for a setting", Figma 11:1571) |
| `/nearby/phrases` | The heads-up phrase screen (Figma 11:1414), formerly `/nearby` |

**Scope (team decision, 20 Oct 2026):** Singapore only, built on the **EARTH ONLINE (City Brush) Singapore dataset**;
no Google Maps / Places APIs. "Directions" is a plain `google.com/maps/dir/?api=1&destination=<lat,lng>` link with no
origin — no API call and no position leaves the app. Malaysia and live restaurant search from the PRD are out of scope.

### Data (`src/data/explore/`, see its [README](src/data/explore/README.md))

- `places.sg.json` — 142 published places: 121 landmarks/sites from the EARTH ONLINE dataset (names in English and
  Chinese, intro cards, positions of the 3D models) merged with researched entries whose fun facts carry source links
  (43 places have source-linked facts; the others say "No sourced fun facts yet").
- `collections.json` — "Singapore collection · 100 places" (a note says it is a draft). It stays a draft (`status: starter`) until a team
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
- **3D view** (Explore **Map · 3D · List**, and **Map · 3D** on a place): `src/features/nearby/components/View3D.tsx`
  embeds `public/earth-online/sg/lite.html` in an iframe, created only when the user picks 3D and removed when they leave
  it (that frees its memory). It opens on the selected place (its landmark card, as a small peek) or else the area,
  location or Marina Bay; drag to orbit, pinch to zoom, tap a landmark for its intro card; a card of another catalogue
  place shows "Open place →". Full screen covers the app (Esc leaves). First load ≤ 19 MB (page 5.3 MB, three.js
  0.6 MB, dataset 12.7 MB; cached afterwards). Everything is on our origin: three.js r128 is in `vendor/` (MIT), no web
  fonts, no CDN. The address carries the point in the hash (`#at=…&card=…`), which is never sent to a server.
- **The lite 3D page** is the City Brush Singapore page with only what Nearby uses: roads, buildings, landmarks, the
  real sun and sky, weather and sound — none of them set by the viewer: time of day plays by itself from Singapore's
  time now (the page's usual speed), weather is Auto, sound stays off, the language is the app's (English), the font is
  the app's Inter (bundled), labels have no emoji. The only things to do are to look around and to switch 2D / 3D. Each
  landmark opens with its own camera (`SGLite.frame`): fitted to the model's size and shape — long bridges side-on,
  towers lower and closer, flat places higher — with a few hand-set overrides (`LITE_VIEW` in
  `scripts/earth-online-lite.py`). Only Singapore is built: Johor / Batam terrain (land-cover code 5) is sunk under the
  sea, foreign roads and building tiles are skipped, and the 2D ground picture is masked to Singapore
  (`scripts/explore/sg-only-ground.py`, run by the sync script). Driving, flying,
  navigation and the big route map, traffic, races, multiplayer, admin, ads/signs, aircraft, port, fireworks and the
  city switch are not in it. For phones it loads only the area around the point: 2 km tiles of roads / buildings /
  trees within ~2.2 km of the view are built and the ones out of reach are freed as you move; the view stays within
  2.5 km of the point; far roads and building tiles are dropped right after decoding; landmark models, campus sites and
  labels only within ~2.8 km; landmark normals/colours are released from memory once on the GPU; 2048 px ground texture
  (the near ground is still drawn sharp), pixel ratio ≤ 1.5 and a 1024 px shadow map. Measured in headless Chromium
  (software WebGL, 390 × 844) after 60 s at Marina Bay: JS heap 105 MB vs 365 MB for the full page (which had built 14
  of its 784 tiles and keeps growing), renderer process 1.1–1.2 GB vs 2.2 GB, GPU process 0.42 GB vs 0.76 GB.
- Rebuild it with `node scripts/sync-earth-online.mjs <earth_online checkout>` (python3): it builds the page from the
  checkout's `src/` without the unused modules (`LITE_SKIP`), applies `scripts/earth-online-lite.py` (every edit is
  asserted, so a changed upstream fails loudly) and copies `site/sgdata/`. The page talks to Nearby with postMessage:
  out `ready` and `card` (landmark key only); in `show {at, card}` from the parent window only.
- Location: one `getCurrentPosition` (10 s timeout, 60 s max age) after the explanation is accepted; no watch. States:
  manual, requesting, active, denied, unavailable, timeout, unsupported; worse than 500 m = "Approximate location";
  outside Singapore = manual browsing with a note. The position stays in memory (`src/features/nearby/location.ts`),
  never in storage, URLs, exports or logs. Turning location off or deleting data invalidates pending callbacks.
- Personal state: `intentai:v1:explore-personal` (`explorePersonalStore` in `src/data/stores.ts`): saved / visited flags,
  self-reported visit dates, preferred area, the time the location explanation was accepted, seen milestones.
  "Delete all my data" clears it, stops location and cancels Undo.
- **Check in (打卡):** the "visited" flag above, shown as Check in on the place page and on the selected place in
  Explore; a collection is the checklist ("x of 100 checked in", To do / Checked in filter). Moments shows every
  check-in as a stamp under **My places** (`src/pages/MomentsPage/PlaceStamps`), newest first, plus the collection's
  progress. It reads the same store, so a check-in or its Undo shows there at once. Self-reported: no position is
  stored with it.

### Maintenance scripts (`scripts/explore/`)

One-time import tools, kept for reproducibility: `extract-earth-online.cjs` (dump the dataset from the City Brush page,
headless), `build-roads.py` (road layers), `assemble-catalogue.py` (merge dataset + research into the catalogue — it
overwrites `places.sg.json`, so after editors start editing that file, apply dataset updates by hand instead).

## Deployment-root migration and rollback

Production (`cde-5311.vercel.app`) currently builds `web/` (React 19, `singlish-v2-state` in localStorage). Moving it to
this app:

1. **Preview first.** Create a preview deployment of this branch with Root Directory `intentai-web` (framework Vite,
   `npm ci`, `npm run build`, output `dist`; `vercel.json` here sets the same). Check: deep links such as
   `/nearby/place/curated:sg-merlion-park` reload; `/earth-online/sg/lite.html#card=merlion` serves the 3D page
   (static files win over the SPA rewrite); Map · 3D on a place loads it on a phone; onboarding, Today, Ask, Community, Moments, My Space work.
2. **Data migration** runs once at startup (`src/data/migration/legacyMigration.ts`, called in `main.tsx`): it copies
   `singlish-v2-state` (or the older `singlish-v1-learned` / `singlish-v1-saved`) into the `intentai:v1:*` stores,
   never overwrites a key that already exists, maps legacy phrase ids (`can` → `can-or-not`), forces location off,
   keeps anything it cannot convert in `intentai:v1:migration-recovery`, leaves the legacy keys untouched, and writes
   `intentai:v1:migration` last (an interrupted run resumes from `intentai:v1:migration-pending`). Test it on a copy of
   real browser data (export localStorage from a test profile), not by clearing someone's storage.
3. **Before switching**, record the current production deployment ID, its Root Directory (`web`) and settings
   (Vercel → Project → Deployments / Settings → General), and confirm who may change the project.
4. **Switch:** set Root Directory to `intentai-web`, redeploy, keep the same domain. Verify on production: the routes
   above, an existing visitor's progress (open the site in a browser that used the old app), the 3D view.
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
  smoke and overflow checks. `e2e/nearby3d.spec.ts` boots the real 3D page (software WebGL, about 4 minutes): only the
  time bar and cards on screen, the place's card, a link back from another card, nearby-only loading, no other host
  contacted, axe around it, iframe removed on leaving.
