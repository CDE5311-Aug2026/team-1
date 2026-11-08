# FindSG Redesign v2 · Tourism 2040: build plan (rev 2)

Status: rev 2, after Codex cycle 1 (REJECT, 12 findings; reconciled in the validation log at the end). Base: `main` @ 764be10. Work branch: `redesign/v2`. Owner decisions D1–D6 are needed before Phase 1 starts.

## Sources (priority order when they disagree)

1. **Wireframes**: canvas page "Redesign v2 · Tourism 2040" (26 boards). Exported to `../design/v2-src/*.dc.html`, rendered as `../design/v2-png/*.png`, photos in `../design/v2-src/_blob/` (licences unknown, so the photos are not shipped). Boards 24 and 25 are the spec for categories and the map.
2. **Category research doc** `MahZDuhJSsrV46en9HAe8r` (rev 21): 147 sourced places, each with status and pin quality. Coordinates are re-derived through OneMap Search.
3. Repo `CLAUDE.md` rules. Where the wireframes and the research doc disagree, the wireframes win: they set the palette (Attractions `#e8862a`/`#9a4a0c`/`#f6e7d8`, Wellness `#3a8f5c`/`#236b43`/`#dde8df`, Leisure `#b8336f`/`#a02b60`/`#efdce1`, Cruise `#1d4f91`/`#1d4f91`/`#d9e0e6`) and the short labels.

## Contracts (fixed before any screen work)

**C1 Tourism category: a new type next to the old one, not a replacement.**
- `src/data/tourism.ts` adds `TourismCategory = 'att'|'wel'|'lei'|'cru'`, `TOURISM_INFO` (label, STB long name, glyph, fill/ink/tint) and `tourismOf(place)`.
- `CuratedPlace` gets an optional `tourism?: { category: TourismCategory; subtype?: TourismSubtype }`. The validator makes it required for every published place.
- The legacy `category` union, `CATEGORY_INFO`, Nearby ranking and `mapSearch.ts:107` stay unchanged.
- Consumers that switch to tourism categories: the new Home, Search, Place detail, Passport collection, Hunt chips, RegionMap and onboarding. Consumers that stay on the legacy category: Nearby Explore/Collections/Routes, CityMap pin CSS, View3D and Moments.

**C2 Preferences.**
- The profile gets a new `tourismRanking: TourismCategory[]` (ordered, 1–4) beside the existing `topics`.
- Culture preferences (`prefsFromRanking`, `profile.ts:287`) still come from the old `topics`, which onboarding no longer asks for. Existing profiles keep their value. New profiles get the default value the code already uses for missing topics.
- Migration is idempotent. A missing `tourismRanking` is derived once from `topics` (landmark→att, culture→att, nature→wel, food→att, de-duplicated, in rank order) and never overwrites one that already exists. Damaged values are repaired to `[]`. `done`, `topics` and the other fields are never touched.
- Tests cover old, partly migrated and damaged records.
- `AbTestPage/prepare.ts:39` is updated to seed both fields.

**C3 Places and identity.**
- **R0 reconciliation** comes first. The research inventory is exported to `data/explore/research/tourism2040.csv`, a reviewable input in the repo, with one row each: name, category, subtype, status, source URL, pin quality.
- A script matches each row to existing records by normalised name, plus distance once geocoded. A matched row enriches the existing record: it adds `tourism`, and the id stays as it is. Only unmatched rows become new `curated:sg-<slug>` records. No existing id is renamed or removed, so saved places and collections still resolve.
- Every existing published record (382 published of 385) gets `tourism` by a `kind` + `category` rule table in `scripts/tourism-map.mjs`. The output is reviewed by hand, and rows the rules can't decide are listed for the owner.
- **Coordinates for new records:** taken from OneMap Search, with the result row stored as `coordinates.source` (OneMap URL, query, date) and the pin quality kept: building, street, area point or approx. The 150 m flag compares the OneMap hit against the existing record's coordinates; new records have nothing to compare against, so a non-building match is flagged for review. Nothing is filled in to satisfy the validator. A row with no trustworthy coordinate stays out.
- **Lifecycle:** a new `operatingStatus: 'open'|'new'|'planned'|'seasonal'` field.
  - `planned` and unconfirmed (`verify`) rows are `editorialStatus: 'draft'`. They are not published, not counted, not stampable, and never listed as if open.
  - Decision D3 covers whether planned places show as "coming soon".
  - New records also carry the review fields `CuratedPlace` requires: `reviewedAt`, `reviewedBy: 'tourism2040-import'` and `provenance`.
- **URA index:** `scripts/ura/build-ura.py` is re-run to rebuild `src/data/ura/placeAreas.json`, using the metre projection (`features/nearby/map/projection.ts:17`). Offshore places (Sentosa, Kusu, St John's, Ubin, Sisters') resolve to the nearest planning area and are marked `offshore: true` in the index. Both geography schemas are kept and checked in `ura.test.ts`: Nearby `regionId`/`areaId`, and URA `placeAreas`.
- `stats.json` and `scripts/validate-explore.mjs` are updated. The validator rules: `tourism` is required on published places, the source URL is required, and the CSV is consistent with the catalogue.

**C4 Stamps.**
- "Stamp here" keeps today's self-reported check-in (`features/nearby/actions.ts:81`) as the record.
- When location is available, the button shows the distance. When the fix is accurate to within 100 m and the user is inside the place radius, it adds the label "within range".
- A stamp is never stored or shown as "verified". Old visits are untouched. Denied, unavailable and out-of-range states keep the stamp possible, matching today's remote play, and say plainly that the stamp is self-reported. Stamping twice is a no-op that shows the original date.
- Decision D4 covers whether to go stricter.

**C5 Together/solo mode.**
- A new `huntModeStore` (key `hunt-mode`, holding `{mode:'together'|'solo', region?: RegionId}`), registered in `deleteAllData()` and in storage accounting (`data/profile/storage.ts`).
- "Hunting" counts and leaderboards stay sample data with an "Example" label, as `Board.tsx` already does. No live multi-user data, and no location sharing. The "location is shared…" line from board 03 is cut, or reworded to say nothing is shared (see D5).

**C6 Shared UI (F1).**
- New components: `CategoryChips` (URL `?cat=`), `CategoryBadge`, `CategoryGlyph`, `ScreenHeader` (avatar · title · settings), `RegionMap` (C7).
- Tab bar: a floating pill holding Home/Hunt/Passport, plus a round Search button.
- Tokens are added to `styles/tokens.css`.
- The onboarding pickers used by `MySpacePage/v3/FieldEditor.tsx:7` move to `components/ProfileEditors/`, owned by F1, with their interface frozen.

**C7 Map division (RegionMap).**
- The 5 URA regions are drawn as SVG paths, built at build time from `data/ura/areas.json` rings by `scripts/ura/region-paths.mjs` and merged per region. They are projected into the 346×228 viewBox from board 25.
- Pins are projected from lat/lng. Counts are derived from the data, never typed.
- Pin sizes: 12 px for the chosen category in the home region, 10 px for the same category elsewhere, 7 px at 25 % opacity when filtered out.
- Shading: `mix(colour, land, 0.1 + 0.4·n/max)` when filtered; neutral with no filter.
- Each category has a glyph as well as a colour. Region chips with counts sit under the map. The component has unit tests.

## Board → route → state matrix

| Board | Route / state | Built | Adapted / left out |
|---|---|---|---|
| 00 Welcome A, 01 Welcome B | `/onboarding` step 0 | One variant (see D2) | Other kept in the canvas |
| 02 What to explore | step 1 | Rank 4 categories, live feed preview, Reset | Photos come from existing licensed places |
| 03 Hunt with others + region | step 2 (new) | Together/solo + RegionMap + region card | Hunter counts are examples; location line per C5 |
| 04 Review, stamp passport | `/onboarding/result` | Summary + stamp animation (reduced-motion safe) | – |
| 05 Home A, 11 Home B | `/` | Chips, leaderboard card (A), Challenges carousel, Picked for you | Leaderboard is an example; "picked" = ranking by `tourismRanking` + distance |
| 06 Assistant sheet | sheet | Restyle | Help text updated to the new tabs |
| 07 Search | `/search` | Query, chips, results grouped by category, empty state, Cancel, recent searches (local only) | Index extended to challenges/volumes; no "hunters" results |
| 08, 12 Place detail | `/nearby/place/:placeKey` | Hero, badge, Directions (Google/Apple deep link as today), hours only if sourced, fact tiles only from `quickFacts`, story, related challenge, Save, Stamp here (C4) | Sample video/captions dropped unless the place already has a sourced clip; history from `description` only |
| 09 Challenge detail | `/hunt/challenge/:id` | See D1 | – |
| 10 Hunt archive | `/hunt` | Continue card + archive list, chips | Shelf, book tabs and `#story/` hash navigation kept working (study clue access) |
| 13, 14, 15 Passport | `/my-space` | Passport card, Journal carousel, My collection by category, leaderboard section (A) | Leaderboard is an example; MRZ line built from real fields only |
| 16, 17 Settings | `/my-space/settings` | Restyle | – |
| 18 Motion, 19 Text size | `/my-space/settings/motion`, `/my-space/settings/text-size` (new) | Separate screens on the existing stores | – |
| 20 Privacy | `/my-space/privacy` | Restyle, text checked against what the app really stores | – |
| 21 Terms, 22 Photo credits | `/my-space/licences`, `/my-space/credits` (new) | Credits split out of `LicencesPage` | – |
| 23 Send feedback | sheet tab | Restyle, category + text | Screenshot attachment: see D6 |
| 24, 25 | reference only | – | – |

Moments leaves the tab bar. `/moments` stays routable (Journal links and e2e). Its Journal component moves into Passport.

## Phases and ownership

| Step | Mode | Files (exclusive) | Why |
|---|---|---|---|
| P0 Baseline | Inline | – | Branch, run the green baseline (tsc, vitest, build, e2e Chromium + WebKit with `--project` added to `playwright.config.ts`), and list every test/fixture the matrix touches. |
| R0 + D-data | Subagent, then a main-session review | `data/explore/**`, `scripts/{tourism-map,geocode-onemap,validate-explore}.mjs`, `scripts/ura/*`, `src/data/ura/placeAreas.json`, `src/data/tourism.ts` (types only) | Data contract C3. Merged and validated before any worktree branches. |
| F1 Foundation | Inline, in parallel with R0 | Owner files: `stores.ts`, `domain.ts` (type addition only), `routes.ts`, `App.tsx` (placeholder pages that compile), AppShell, TabBar, `styles/*`, `components/{Category*,ScreenHeader,ProfileEditors}/**`, `profile.ts` migration (C2), `prepare.ts`, `huntModeStore`, deletion + storage accounting | Everything imports these |
| F2 RegionMap | Inline | `components/RegionMap/**`, `scripts/ura/region-paths.mjs` | Shared by S1, S2, S7 |
| Gate G1 | – | – | tsc + vitest + build green, foundation merged, interfaces frozen |
| S1 Onboarding | Worktree | `pages/OnboardingPage/**` (except `ProfileEditors`) | – |
| S2 Home + S5 Challenge | Worktree | `pages/TodayPage/**`, `pages/ChallengePage/**`, `data/hunt/challenges.ts` (new) | Discovery 3D code is kept or retired per D-keep |
| S3 Search + S4 Place | Worktree | `pages/SearchPage/**`, `pages/NearbyPage/PlaceDetailPage.tsx`, `features/nearby/card/PlaceV2*` (new) | – |
| S6 Hunt | Worktree | `pages/HuntPage/{HuntPage,HuntHome}.tsx`, `notebook/Bookshelf*` | Embeds Board through its current props, which are frozen |
| S7 Passport | Worktree | `pages/MySpacePage/MySpacePage.tsx`, `v3/MySpace*`, `pages/HuntPage/Board.tsx` (view variant prop only), `pages/MomentsPage/Journal/**` (made embeddable) | The only owner of Board and Journal |
| S8 + S9 Help + Settings | Worktree | `components/HelpCenter/**`, `MySpacePage/{Settings,Privacy,Licences,Credits,Motion,TextSize}Page.tsx`, `v3/Booklet*` | – |
| I1 Integration | Inline | everything | Merge, update the tests from the P0 inventory, add regressions (C2 migration, C3 ids resolve, C4 stamp states, C5 deletion), e2e Chromium + WebKit, axe, build, screenshots |
| I2 Study pilot checks | Inline | – | Pilot codes (T0x) only: version A redirects to UI1 and back, version B, Outram place access, both remote study routes, `/t4` clue reachable from the new Hunt screen, restart, tester/version identity kept, shared storage readable by UI1. UI1 itself is not edited. |
| R1 Review | Inline | – | code-reviewer agent + Codex pass on the diff, then PR to team-1 `main` (see D-base) |

Sequence: `P0 → {R0, F1} → F2 → G1 → {S1, S2+S5, S3+S4, S6, S7, S8+S9} → I1 → I2 → R1`.

Worktrees: every agent runs `tsc -b` over the whole project, so one agent's unfinished code would break the others' checks. Each worktree links `node_modules` back with a junction.

Each agent brief contains:
- its boards (PNG + `.dc.html`);
- the C1–C7 contracts and the frozen interfaces;
- reuse of existing data;
- checks: `npx tsc -b`, page-scoped vitest, and **one** screenshot script (`../scripts/route-shot.mjs`, Playwright at 390×844 against `vite` on the agent's own port), with no e2e suite;
- a report: files changed, stores added, content adapted or left out, example data labelled.

## Acceptance

- Every row of the matrix renders at 390×844. A side-by-side image is saved in `docs/screenshots/v2/`.
- No Landmark/Culture/Food/Nature labels on the switched screens. Category colour always comes with its glyph.
- `validate:explore` passes. Every published place has `tourism` and a source. No existing id is lost (test).
- tsc, the full vitest suite, build, e2e Chromium + WebKit and axe are all green. The I2 pilot checklist passes.

## Owner decisions (answered)

- **D-base = `main`** (8 Nov 2026).
- **D-keep = keep the 3D map; restyle it only (8 Nov 2026).** The Home 3D map (`MapCard3D`, `MapCardEarth`, `three/*`, `CoverFlow3D`, `LevelDeck`, the drill-down levels and URL params in `DiscoveryHome`) is kept, and its logic and geometry are not changed. `three/*` is not edited.
  - Allowed: visual restyling of the DOM chrome, meaning the card frame, region/area badges, toolbar and place pins, using the v2 tokens.
  - Added: the 4 tourism categories on the map. Pins get category colour + glyph (DOM overlay classes in `MapCard3D.module.css` and the `MapCardEarth` pin props). A `CategoryChips` row filters the map, dimming non-matching pins and filtering deck place items. Badges show per-category counts.
  - Home = the wireframe Home (board 05/11) sections arranged around this kept map. Owner: S2.
  - `TodayPage.test`/`home.spec` drill-down assertions are kept; only the new category assertions are added.

- **D1 = labelled demo**, built on the existing story routes. Join and timer are kept locally; counts are labelled Example.
- **D2 = Welcome B.**
- **D3 = planned places shown faded as "coming soon"**, never counted or stampable.
- **D4 = self-reported stamp + distance hint** (C4/B7).
- **D5 = cut the board-03 location-sharing line.**
- **D6 = feedback stays text only.**

## Owner decisions (original list, now all answered)

- ~~D-base~~ (answered): build on `main` (default branch, newest) or on `merge/team1-v3` (which repo CLAUDE.md names as the working branch)? The two have diverged by 16 and 8 commits; the 8 are Hunt-book tour and camera check-in.
- **D-keep:** the 3D Home drill-down (Three.js map + cover-flow): retire it, or keep it behind a "Map" entry from Home or Search?
- **D1 Challenge detail:** a labelled demo built on today's two story routes, or a real feature with its own challenge data, join/progress store and timer?
- **D2 Welcome:** A (lion passport) or B (real places)?
- **D3:** show planned places (Thermae 2030, Founders' Memorial) as faded "coming soon", or hide them?
- **D4 Stamp rule:** self-reported with a distance hint (C4), or require being in range?
- **D5:** Is cutting the board-03 location-sharing line acceptable?
- **D6 Feedback screenshot attachment:** leave it out, or add it (a server handler change plus a privacy-text change)?

## Rev 3 amendments (binding: they override anything above that conflicts)

**A1 Onboarding completion (F1).**
- `finishOnboarding()` (`profile.ts:353`) is split.
  - The new `finishTourismOnboarding({ranking, mode, region})` writes `tourismRanking` and `huntModeStore`, sets `onboarding.done`, and stamps the passport through the existing check-in/stamp path. It never touches `topics` or the culture prefs.
  - The legacy `finishOnboarding()` stays unchanged for `/t4` and the old flows.
- `prepare.ts` calls the legacy function as it does today (so `/t4` behaves byte-for-byte the same), then sets `tourismRanking` to the full order ['att','wel','lei','cru'].
- Tests cover fresh onboarding, redoing onboarding, an existing profile, and `/t4`.

**A2 Migration persistence (F1).**
- `tourismRanking` is validated as an array of unique known ids; anything else fails validation and goes to repair.
- Order inside the profile store's `repair`: first the existing legacy-topic repair (`profile.ts:145`), then tourism derivation, and only when the field is *absent*. An explicit `[]` is kept.
- `persistentStore` gets an opt-in `persistRepaired` flag. When on, a repaired value is written back once, so derivation happens one time and survives reload. That flag is used only by the profile store.
- Tests: an absent field, `[]`, duplicates, unknown ids, malformed values, and a reload after repair.

**A3 Reconciliation crosswalk (R0).**
- The match script only *proposes*. Each row gets an outcome in `research/crosswalk.csv`: `match:<id>`, `child-of:<id>`, `new`, or `ambiguous`.
- `ambiguous` rows (for example, the whole of Fort Canning Park vs the record "Fort Canning Park: Fort Gate & Fort Canning Centre") never become records. They go to the owner in the R0 report, and a "whole park" row stays mapped to the existing record.
- Aliases are kept in the crosswalk.
- Tests: slug collisions are rejected; every crosswalk `match` and `child-of` id exists; every saved-place fixture still resolves.

**A4 URA index schema (R0).**
- `placeAreas.json` keeps `placeId → areaCode` string values, so the reader is unchanged.
- Offshore places go in a separate `src/data/ura/offshore.json` (`placeId[]`), read by a new `isOffshore()` in `ura.ts`. R0 owns `ura.ts`, `areas.json`, `placeAreas.json`, `offshore.json` and `build-ura.py`, and regenerates `areas.json` with no diff unless a diff is justified.
- Tests: offshore area lookup, region counts, and the unchanged Discovery grouping.

**A5 Import schema and quarantine (R0).**
- A new catalogue record must meet the *unchanged* validator in full: legacy `category`/`kind`/`regionId`/`areaId`; `summary` written by us from the cited source; a sourced fact or award; and a `SourceReference` in the existing shape (`domain.ts:20`), with OneMap as the coordinate source (URL + retrieval date).
- Rows that can't meet this go in `research/quarantine.csv` with the reason. They are not added to the catalogue, and the validator is never weakened. The research CSV is the full import schema: all of the fields above plus the evidence URL for each fact.
- R0 also owns the complete `src/data/tourism.ts` (types, `TOURISM_INFO`, `tourismOf`) and the `CuratedPlace` type change in `src/features/nearby/domain.ts`.

**A6 Tests are owned by the phase that changes the behaviour.**
- P0 writes `docs/v2-test-inventory.md`: every unit and e2e test marked retain, rewrite or replace, with an owner phase. It includes `TabBar.test.tsx:8`, `TodayPage.test.tsx:48–262`, `e2e/admin.spec.ts:29`, `nearby-links.spec.ts:21`, `smoke.spec.ts:96–111`, `onboarding.spec.ts`, `explore.spec.ts:166–180` and `home.spec.ts`.
- F1 updates the TabBar and shell tests within F1.
- G1 requires the unit suite to be green, apart from tests marked for later screen phases. Those are listed by name and skipped with an issue tag; the screen phase removes the skip.
- e2e specs are updated in I1.

**A7 Shared MySpace primitives (F1).**
- `v3/MySpace.module.css`, `v3/Booklet*` and `v3/FieldEditor.tsx` belong to F1. F1 restyles them to the new tokens and freezes their class names and props.
- S7 and S8/S9 only add new module files (`Passport.module.css`, `Settings.module.css`). Neither edits the shared ones. Any further change to them goes through the main session between phases.

**A8 Editors and review flow (F1 builds them, S1/S9 use them).**
- `components/ProfileEditors/` gains a `TourismRanker` (rank 1–4, with Reset) and a `HuntModeEditor` (together/solo + RegionMap).
- Both work in a sheet: changes are local until Save; Cancel discards them. Save writes through the stores, so Home, Hunt and Passport re-render from the same store.
- Onboarding review (board 04) rows open the same editors with `returnTo=/onboarding/result`. Settings rows (boards 16–17) open them in place.
- Legacy field editors stay for the remaining fields.

**A9 Board 08/12 sections.**

| Section | Data source | When no data |
|---|---|---|
| Nearby places | existing proximity ranking over the catalogue | section hidden |
| Route choices (walk/bus/MRT) | Directions deep link only | the three choices are dropped |
| Weekend activity / events | events data that exists today | section hidden |
| Next stop | related challenge's next stop | link hidden |
| Video / captions | an existing sourced clip only | dropped |
| History | `description` | section hidden |
| Fact tiles | `quickFacts` only | fewer tiles |
| Hours | sourced hours only | chip hidden |

- No wireframe copy is shipped as content.
- Acceptance includes screenshots of the states: missing photo (category tint), missing description, no challenge, no nearby places.

**A10 Persistent key inventory.**

| Key | Owner | Validate / repair | Deletion + accounting | Export | Cleared by `/restart` and `/t4` |
|---|---|---|---|---|---|
| `hunt-mode` | F1 | known mode, known region | yes, "Hunt" area | yes | yes |
| `search-recent` (max 8, local only) | F1 store, S3 uses it | string[] | yes, "Search history" area | yes | yes |
| challenge progress (only if D1 = real) | S5 | per D1 | yes | yes | yes |
| profile `tourismRanking` | F1 | A2 | rides along with the profile | yes | yes |

- I2 checks that tester and version identity survive `/restart` and `/t4`.

## Rev 4 amendments (after Codex cycle 3; binding)

**B1 Study identity.** `/t4` keeps the participant code and the version. `/restart` clears the participant code and keeps only the phone's version (via `/?v=`), as `stores.ts:322` does today. I2 checks exactly these outcomes, plus the UI1 redirect. This replaces the last line of A10.

**B2 Migration order.** The profile store's repair is rebuilt in three steps:
1. normalise legacy topics **without** the final validation;
2. derive `tourismRanking` (only when absent) and repair it;
3. validate the complete result once.

Tests check that every unrelated field (answers, `stampedOn`, `base`) survives this for profiles with current topics and for profiles from before topics existed, including after a reload.

**B3 Welcome seal.** Onboarding only sets `profile.stampedOn`, as `profile.ts:356` does now. It creates no place visit, no collection milestone and no challenge progress. A test asserts that onboarding creates zero visits.

**B4 Crosswalk semantics.**
- `ambiguous` rows change nothing until the owner rules on them. The A3 line about mapping the "whole park" is withdrawn: Fort Canning Park as a whole is `ambiguous`.
- `child-of:<id>` creates a separate destination record. It has its own id, coordinates and sources, plus a `parentId` field, and inherits nothing from the parent.
- No coordinates, hours, description or check-in eligibility move between a whole site and a narrower record without explicit evidence.

**B5 Ownership gaps.**
- F2's RegionMap interface (`<RegionMap places filter region onRegion />`) is frozen before F1's editors, and F1 builds `HuntModeEditor` after F2. New order: `P0 → {R0, F1a (tokens, stores, routes, shell, chips)} → F2 → F1b (editors, completion function) → G1`.
- F1 owns `data/expressions.ts` (the tab entries) and `pages/HuntPage/Hunt.module.css`, which it freezes. S6 and S7 add their own module files.
- S3 owns a new `data/search/index.ts`. It wraps `Discovery/mapSearch.ts` without editing it, and adds challenge and volume entries.

**B6 Variants and copy.**
- **Together mode** shows the leaderboard card, the "hunting" counts and the Passport leaderboard. **Solo mode** hides all three. Challenges show in both modes, but in solo they are listed without the "joined" social line. Board 11 omits challenges; this is a deliberate adaptation, kept so solo users can still find them.
- **Copy adaptations:** no "daily AI picks" (use "Picked for you" ranked by your categories and distance); no public presence, no live hunter updates (counts labelled Example); no on-site-only stamping wording; no Dynamic Type claim. Text size is described as "scales the app's text". The existing root scale (`profile.ts:175`) stays, and headings scale with it.
- **Screenshots required:** both modes; a fresh, empty Passport; the largest text size.

**B7 Proximity eligibility.**
- "Within range" shows only when all of these hold:
  - the pin quality is `building`, or it is an existing curated pin;
  - the location fix is ≤100 m accuracy and <60 s old;
  - the distance is ≤150 m (one fixed radius, because places have no boundary).
- Street, area-point and approx pins never show range. They show only "about X km" from the area point, or no distance at all.
- States: locating…, stale, unavailable or denied, out of range. Stamping stays allowed in every state (C4).
- If D4 makes proximity mandatory, places with unsuitable pins are exempt, and the screen says so.

**B8 Study comprehension.**
- I2 also checks, on both remote study routes:
  - the remote-mode label is visible;
  - the "real places, fictional characters" disclosure is still shown;
  - the final remote and clue state is reached.
- No challenge rule or proximity rule may gate the remote story engine (`#story/`). A test asserts the story opens with location denied.

| Codex cycle 3 finding | Resolution |
|---|---|
| 1 restart identity | B1 |
| 2 migration order | B2 |
| 3 welcome seal | B3 |
| 4 crosswalk | B4 |
| 5 ownership / F1 to F2 dependency | B5 |
| 6 variants / copy | B6 |
| 7 place radius | B7 |
| 8 study comprehension | B8 |

Codex outcome: three cycles, each ending REJECT (12 → 10 → 8 findings). Every finding is reconciled above. Under the 3-cycle limit, the decision now sits with the owner.

## Validation log

| Codex cycle 1 finding | Resolution |
|---|---|
| 1 Category contract contradiction | C1: a separate type, legacy kept, consumers listed |
| 2 Topic migration | C2 |
| 3 Duplicates / ids | C3 R0 reconciliation, ids never renamed |
| 4 URA index ownership | C3, owned by R0 |
| 5 Provenance / eligibility | C3 lifecycle, CSV input, draft for planned |
| 6 Challenge data | D1 |
| 7 Stamp rule | C4 + D4 |
| 8 Board coverage | Matrix |
| 9 Shared dependencies | ProfileEditors → F1; Board + Journal → S7 only |
| 10 Sequencing / screenshot contradiction | P0/R0/G1 gates, compiling placeholders, one screenshot script |
| 11 Study protection | C2 `prepare.ts`; I2 pilot checklist; Hunt hash navigation kept |
| 12 Tests / stores lifecycle | P0 inventory, I1 regressions, C5 deletion/accounting, Playwright projects |

| Codex cycle 2 finding | Resolution |
|---|---|
| 1 finishOnboarding overwrites legacy topics | A1 |
| 2 Migration not persisted | A2 |
| 3 Name matching duplicates places | A3 crosswalk |
| 4 offshore breaks the index reader | A4 |
| 5 Import incomplete for the validator | A5 quarantine |
| 6 G1 vs test ownership | A6 |
| 7 MySpace style overlap; tourism.ts owner | A7, A5 |
| 8 Editors unspecified | A8 |
| 9 Board 12 sections | A9 |
| 10 Persistence inventory | A10 |
