# FindSG user study: how to run it and how to act on the results

> **11 Nov 2026, `redesign/v2`:** the A/B study code is removed. The app has no start screen or version choice and opens only the current version; `/ui1`, the `/test` desk and `/api/abtest` are gone. This page describes the study as it was run before that change.

Updated 3 Nov 2026. For facilitators, for co-developers, and for any Claude or other agent picking up the work.

| What | Where |
| --- | --- |
| Live app | https://cde-5311.vercel.app |
| Study desk (facilitator) | https://cde-5311.vercel.app/test (tabs: Phones, Session, Results) |
| Usage dashboard | https://cde-5311.vercel.app/admin (time per screen, labelled by tester code and version, e.g. `P03-A`) |
| Version A = UI1 | Frozen build of PR #6 (commit `6fc0d8c`), served at `/ui1`. https://github.com/CDE5311-Aug2026/team-1/pull/6 |
| Version B = UI2 | The current app (branch `merge/team1-v3`) |
| Study design (source) | [`docs/user-study/FindSG_Study_Hypotheses.docx`](user-study/FindSG_Study_Hypotheses.docx) (research team only), [`docs/user-study/FindSG_User_Questionnaire.docx`](user-study/FindSG_User_Questionnaire.docx) (paper copy of what the desk asks) |
| Code | `intentai-web/src/pages/AbTestPage/` (desk), `intentai-web/server/abtest/handler.ts` (server), `intentai-web/api/abtest.ts` (Vercel function) |

All files are in this repository. Nothing is too large for GitHub (the largest is 6.7 MB), so nothing lives on Google Drive.

Results are saved on the server (Redis on Vercel), not only on the phone. Reading them needs the admin password; ask the team member who set it in Vercel (this is a group project, with no single owner). Never write the password into the repo, a chat or a screenshot.

---

## 1. What the study tests

Each participant tries both versions on two phones, then compares them.

| | Claim | Measured by | Target |
| --- | --- | --- | --- |
| H1 | First-time users find place information and return to a saved clue on their own | T2 and T4 outcomes, reported separately | 80% independent in each UI (built-in help is fine) |
| H2 | The instructions let users finish a remote story stop on their own | T3 outcome plus its two end-state checks | 80% independent in each UI |
| H3 | Users understand that remote progress means remote play, and that the place is real but the characters are fictional | Quick responses Q11 and Q12 | 80% get both right in each UI |
| H4 | Places and stories feel interesting and teach something | Ratings 8, 9, 10 (separately) | Median 4 or more |
| H5 | UI2 is easier and clearer than UI1 | Paired UI2 − UI1 on ratings 1–4, plus the ease and clarity preferences | Positive median difference on each item, and more B than A preferences |

"80%" means 80% of everyone offered the task, rounded up (10 people → 8). The desk labels each result **Target met**, **Below target** or **Inconclusive** (too few answers, or a missing end-state check).

The tasks, read aloud by the facilitator:

| Task | Script | Notes |
| --- | --- | --- |
| T1 Get started | "Open the app and set it up so it shows places you like." | Not scored against a hypothesis |
| T2 Place access | "Find information about a place in Outram you would like to visit." | Check: a place's information page is open |
| T3 Remote stop | "Without going there, play the first stop of the story *Book* until you receive its clue." | Route X = Kampong Gelam, *The Last Edition*; route Y = Telok Ayer, *Letters to the Shore*. Checks: remote mode, every stage done and clue received |
| T4 Clue retrieval | "Earlier you saved a clue called *Credit Line 1 · Those Who Worked and Watched*. Find it and show it to me." | First open `/t4` on that phone (loads the same prepared profile for everyone). Checks: profile loaded, clue shown |

Order is balanced automatically: participant 1 = A first with route X, 2 = B first with X, 3 = A first with Y, 4 = B first with Y, then repeat. Each participant plays one route per version.

Researcher key for the comprehension checks: Q11 = "Remote play progress", Q12 = "The place is real; the characters are fictional". Give the answers only after both versions.

---

## 2. Running a session

Equipment: two phones (left = A, right = B) and one laptop or tablet for the desk. Use a fresh browser profile per phone; the desk should not be on a participant phone.

**Before the first participant**
1. Desk: open `/test` → **Phones**. It shows the links for each phone.
2. Left phone: open `https://cde-5311.vercel.app/?v=A`. Right phone: `https://cde-5311.vercel.app/?v=B`.
3. Do one dry run with **Start a pilot**. Pilot sessions get codes T01, T02… and are left out of the results unless you tick "Include pilot sessions".

**Each participant**
1. Desk → **Session** → **Start session**. The desk gives the code (P01, P02…), which version comes first and which route.
2. On both phones, type that code on the start screen and pick the phone's version. Never use a real name.
3. Read the tasks for the first version from the desk. Tap one outcome per task and tick the Yes/No checks:
   - **Independent**: done without you. Built-in help (the lion, Help Center) still counts as independent.
   - **Assisted**: you helped with navigation or a puzzle answer.
   - **Incomplete**, **Skipped**, or **Technical** (the app or phone failed).
4. Before T4, open `/t4` on that phone. It clears the phone, keeps the tester code, and loads the prepared profile.
5. **Hand over**: the participant fills the 15 ratings and 12 quick responses for that version on the desk.
6. Repeat 3–5 for the second version.
7. **Compare**: 7 preferences, "use again", "improve first", optional comment. **Finish**.
8. Give the Q11/Q12 answers. Restart both phones with `/restart` (keeps the phone's version, wipes the participant's data).

Every step saves to the server; the desk shows "saved to the server at hh:mm:ss". If it shows an error, do not continue: check the connection and press the step again.

---

## 3. Reading the results

Desk → **Results** (asks for the admin password once per browser session).

- One section per hypothesis with its label, counts and n/N.
- Preferences, task outcome table, ratings table and quick-response tallies per version.
- **Order check**: the same results split by which UI came first and by route. If one order or route wins by a lot, say so; the sample is small.
- **Participants** list with **CSV** export (one row per participant, every answer). Keep the CSV out of the repo: it is research data.
- `/admin` shows how long each screen was open and which buttons were pressed, labelled `<code>-A` / `<code>-B`. Use it to explain *why* a task failed (where people got stuck), not as a score.

Report small-sample differences as what happened with these participants, not as a population result. Keep N/A, ties and missing answers visible.

---

## 4. Turning results into changes (for co-developers)

Work only from real participant data. Pilot sessions (T-codes) are for checking the setup.

For each finding that misses a target, write one line in the PR description:
`Hypothesis · task or question · evidence (n/N, quotes, /admin screens) · change · owner · before/after screenshots · retest result`.
Fix blockers and misunderstandings first.

Where to look in the code (UI2 only; UI1 is the frozen baseline and must not change):

| Weak result | Likely area | Code |
| --- | --- | --- |
| T1 slow or assisted | Onboarding | `intentai-web/src/pages/OnboardingPage/` |
| T2 (H1) | Home map, search, place card | `src/pages/TodayPage/` (Home), `src/components/Discovery/` (map toolbar and search), `src/features/nearby/card/` (place card) |
| T3 (H2), ratings 3–5, Q3 | Hunt: book, "Play remotely", puzzles, hints, rules card | `src/pages/HuntPage/`, `src/findsg/app/` (game engine in `src/findsg/app/game/`) |
| T4 (H1) | Finding saved clues (book → Clues tab, Passport) | `src/findsg/app/`, `src/pages/HuntPage/` |
| Q11 (H3) | How remote progress is labelled (REMOTE / ON SITE badges, record page) | `src/findsg/app/` |
| Q12 (H3), rating 12 | "Real place, fictional characters" wording on stories and place files | story data in `src/findsg/*.json`, `src/findsg/app/data.js` |
| Ratings 8–10 (H4), Q2, Q5 | Place facts and story content | `src/data/explore/places.sg.json` (every fact needs a source), `src/findsg/` |
| Q6, Q7 (what helps decide / trust) | Place card details, sources, "checked on" dates | `src/features/nearby/card/` |
| Help needed often | Help Center and lion guide | `src/components/HelpCenter/`, `src/data/help/` |

Then retest the same tasks with **new** participants (not the same people).

### Things the pilot (T01, 2 Nov) already showed

These come from Claude's own pilot run, not from participants. Check whether real participants hit them too before acting.
- UI1: the remote option only appears at check-in ("Play remotely"); the ON SITE badge looks tappable but is not.
- Both UIs: after `/t4` the Hunt rules card appears again, and it says "walk to the real place", without mentioning remote play.
- UI2: one tap on an Outram search result did nothing; the second tap worked. Possibly the test tool, not the app.
- The combination-lock wheels need a slow swipe; the hidden keyboard controls also work.
Screenshots: [`docs/user-study/pilot-T01/`](user-study/pilot-T01/).

---

## 5. Changing the study itself

- **Questions, tasks, scripts, targets**: `intentai-web/src/pages/AbTestPage/abTest.ts` (`HYPOTHESES`, `TASKS`, `ROUTES`, `T4_CLUE`, `ITEMS`, `QUICK`, `PREFS`). The server accepts only the shapes it knows: update `server/abtest/handler.ts` (`cleanResponse`) for new keys.
- If you change what a question means, raise `FORM` in `abTest.ts`. Results then count only the new form (older answers stay stored and show as "earlier form").
- Keep the desk in step with `docs/user-study/FindSG_User_Questionnaire.docx`; that paper copy is the backup if the desk fails.
- Freeze the criteria after the pilot and before the main sessions.
- **UI1 (`intentai-web/public/ui1/`) is generated.** Never edit it by hand. Rebuild with `intentai-web/scripts/build-ui1.sh`, which checks out `6fc0d8c`, applies `scripts/ui1.patch` (router base, usage label `-A`, redirect back to `/?v=A`) and builds into `public/ui1`. `vercel.json` has the `/ui1` rewrites.
- Tests: `abTest.test.ts`, `AbTestPage.test.tsx`, `server/abtest/handler.test.ts`, `pages/MySpacePage/RestartTest.test.tsx`.

### API

| Call | Who | Does |
| --- | --- | --- |
| `POST /api/abtest {type:"start"}` / `{type:"start", pilot:true}` | desk | New participant code (P / T), order and route |
| `POST /api/abtest {type:"save", response}` | desk | Saves the latest state (append-only list; newest per code wins). 204 = written |
| `GET /api/abtest` | results, header `x-admin-password` | All participants |
| `DELETE /api/abtest?code=P03` | results, password | Removes one participant (kept as a removal entry) |
| `POST /api/track` | both apps | Usage events for `/admin` |

Server settings (Vercel env, never committed): `ADMIN_PASSWORD`, and Redis via `KV_REST_API_URL` + `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_*`, or `REDIS_URL`). Without Redis locally, the dev server keeps answers in memory and the local admin password is `intentai-local`.
