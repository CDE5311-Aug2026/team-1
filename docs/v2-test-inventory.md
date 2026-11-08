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
| `pages/NearbyPage/Explorer.test.tsx`, `Nearby3D.test.tsx`, `Routes.test.tsx` | S3/S4 | retain | Only the place detail page is redesigned |
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
| `explore.spec.ts:166–180` | retain or rewrite | Place Save behaviour on the new place page |
| `nearby.spec.ts`, `nearby3d.spec.ts`, `today-setup.spec.ts` | retain | |
| `usertest.spec.ts` | retain + I2 pilot checks | B1, B8 |

The suites and browsers are not configured as Playwright projects. I1 runs Chromium and WebKit separately, as the previous round did: `E2E_PORT=4340 npx playwright test` and `E2E_PORT=4341 npx playwright test --browser=webkit`.
