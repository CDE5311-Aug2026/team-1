# v2 test inventory (plan A6)

Every test that the redesign touches, with its owner phase and what happens to it.

- **retain:** must still pass unchanged.
- **rewrite:** same intent, new assertions.
- **replace:** the old behaviour is gone and new tests cover the board.

## Unit tests (vitest)

| Test | Owner | Action | Note |
|---|---|---|---|
| `components/TabBar/TabBar.test.tsx` | F1 | rewritten ✔ | 3 tabs + Search |
| `components/AppShell/AppShell.test.tsx` | F1 | rewritten ✔ | Moments → Passport current; Search current |
| `App.routing.test.tsx` | F1 | rewritten ✔ (tab list) | Its "Explore Singapore" Home heading assertion is S2's to keep or rewrite |
| `data/expressions.test.ts`, `usage/names.test.ts` | F1 | rewritten ✔ | New routes are named |
| `data/profile/*.test.ts` | F1 | retain + new `tourismProfile.test.ts` ✔ | C2/A1/B2/B3 |
| `components/Category/*`, `ProfileEditors/*`, `RegionMap/*` | F1/F2 | new ✔ | |
| `data/ura/ura.test.ts`, `features/nearby/catalogue.test.ts` | R0 | extend | Ids kept, offshore, tourism required |
| `pages/OnboardingPage/Onboarding.test.tsx`, `quiz.test.ts` | S1 | replace (Onboarding), retain (quiz) | Old Landmark/Culture/Food/Nature labels go |
| `pages/TodayPage/TodayPage.test.tsx` | S2 | retain drill-down + add v2 sections | 3D map logic is untouched (D-keep) |
| `components/Discovery/*.test.ts` | S2 | retain | Discovery logic is not changed |
| `pages/NearbyPage/Nearby3D.test.tsx`, `Routes.test.tsx` | S3/S4, N1 | retain (explorer parts removed by N1) | Only the place detail page is redesigned |
| `features/nearby/card/PlaceStoryCard.test.tsx` | S4 | retain or replace if the card is swapped | |
| `pages/HuntPage/*.test.tsx` | S6 | rewrite (desk/shelf); retain HuntStop and howToPlay | `#story/` hash navigation must still work (B8) |
| `pages/MySpacePage/MySpacePage.test.tsx`, `MySpaceExtras.test.tsx` | S7 | rewrite | Passport |
| `pages/MySpacePage/RestartTest.test.tsx` | — | retain | B1 identity contract |
| `pages/MySpacePage/Notice*.test.tsx` | — | retain | No board |
| `pages/MomentsPage/*.test.tsx` | S7 | retain | Journal is embedded in Passport, Moments route stays |
| `components/HelpCenter/*` | S8 | retain + update copy | |

## e2e (playwright), all owned by I1

| Spec | Action | Note |
|---|---|---|
| `smoke.spec.ts` | retain | Loops over all paths, so the new routes are included automatically; :96–111 clicks Moments → rewrite to Passport/journal |
| `a11y.spec.ts` | retain | Axe on every v2 screen |
| `home.spec.ts` | retain drill-down + add chips/category pins | D-keep |
| `onboarding.spec.ts` | replace | New 3-step flow |
| `my-space.spec.ts` | rewrite | Passport + Settings sub-pages |
| `moments.spec.ts` | retain | Route stays |
| `admin.spec.ts:29`, `nearby-links.spec.ts:21` | rewrite | Navigate via Passport instead of the Moments tab |
| `nearby.spec.ts` | rewritten (N1) | Privacy › Location → Home's Near you; old `/nearby` links → Home; plus the kept-page tests moved from `explore.spec.ts` |
| `nearby3d.spec.ts`, `today-setup.spec.ts` | retain | `nearby3d` tests the place page's 3D, a kept page |
| `usertest.spec.ts` | retain + I2 pilot checks | B1, B8 |

The suites and browsers are not configured as Playwright projects. I1 runs Chromium and WebKit separately, as the previous round did: `E2E_PORT=4340 npx playwright test` and `E2E_PORT=4341 npx playwright test --browser=webkit`.

## Removed with the v1 Nearby explorer (N1, owner decision 8 Nov 2026)

`/nearby` (ExplorePage) and `/nearby/location` (LocationPage) now redirect to Home, and the Nearby radius setting is gone.

| Test | What went | What covers the kept behaviour now |
|---|---|---|
| `pages/NearbyPage/Explorer.test.tsx` | whole file (explorer map/list, sheet, search, areas, picks, location page) | `App.routing.test.tsx` (redirects), `PlaceV2.test.tsx` (Back → Home) |
| `pages/NearbyPage/Nearby3D.test.tsx` | `Explore in 3D` block (8 tests) | `Place detail in 3D` block kept |
| `pages/NearbyPage/Routes.test.tsx` | "Explore links to Routes" | the place page's "On routes" test kept |
| `pages/MySpacePage/MySpaceExtras.test.tsx` | the Nearby radius slider test | "Settings has no Nearby radius"; an old prefs record with `radiusM` still repairs |
| `pages/MySpacePage/SettingsPage.test.tsx` | the slider assertion | asserts no slider |
| `usage/names.test.ts` | `Nearby` page name | the two retired paths are untracked |
| `e2e/explore.spec.ts` | whole file (explorer journeys, sheet drag, clusters, 320 px, Back, phone status bar) | its three kept-page tests (deep links / not found, another tab's Save, storage unavailable) moved to `nearby.spec.ts` |
| `e2e/nearby.spec.ts` | explorer "Use my location" test | Privacy › Location → Near you, position not stored |
| `e2e/nearby-links.spec.ts` | Back from a place → explorer, explorer Back → Home | Back from a place → Home; old explorer links → Home |
| `e2e/usertest.spec.ts` | opened `/nearby` and tapped Editor's picks | opens Saved and taps Checked in |
| `e2e/a11y.spec.ts`, `smoke.spec.ts` | `/nearby`, `/nearby/location` in `e2e/routes.ts` (now listed as redirects) | |

New: `App.routing.test.tsx` (`/nearby`, `/nearby?…`, `/nearby/location` → Home), `MySpacePage.test.tsx` (Privacy › Location → Near you, asks once; All places → Home), `PlaceV2.test.tsx` (Back fallback is Home).
