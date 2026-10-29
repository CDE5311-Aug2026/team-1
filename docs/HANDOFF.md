# IntentAI handoff (29 Oct 2026)

For the next working session on **IntentAI** (the web app in `intentai-web/`) and its **Nearby** map.
Read this first, then `intentai-web/README.md` (how to run, routes, Nearby details) and `docs/NEARBY-EXPLORER-PRD.md`.

## 1. Where things are

| What | Where |
|---|---|
| Team repo (course org) | `CDE5311-Aug2026/team-1`; `main` = merge of PR #3 (`1de6546`), reviewed and merged by teammate sy-hong |
| Owner's repo (same code) | `Wsamme/CDE-5311` (remote `mine` in older clones); working branch **`integration/v2-nearby`**, head `a39ee70` (= team-1 main content) |
| Other branches | `feature/intentai-web`, `feature/intentai-web-v2` (teammate's v2 culture content), `feature/nearby-explorer`, `cursor/intentai-storyboard-loop-e5ee` (older `web/` storyboard prototype; has a chat-style Ask) |
| App | `intentai-web/`: React 18, TypeScript, Vite 7, React Router 7, CSS Modules, Vitest, Playwright + axe |
| Old app | `web/` (React 19 prototype from Figma); `SinglishDaily/` (SwiftUI prototype) |
| Live demo | https://cde-5311.vercel.app (see "Deployment" in `intentai-web/README.md` for which folder it builds) |
| Vercel | team `team_pTkmvMFjBMfu19BmnYdZrIOR`, project `prj_yc2OvrmFeKO5suNg4ecMQkgeaJyB`; earlier deploys used gitSource `Wsamme/CDE-5311`, ref `integration/v2-nearby` |
| 3D city (EARTH ONLINE / City Brush) | `Wsamme/EARTH_ONLINE` (`main` = v39 release; `wip-greater-bay` = paused Dongguan–Shenzhen–HK work). The app bundles a phone-friendly Singapore 3D page at `intentai-web/public/earth-online/sg/lite.html` (rebuild: `npm run sync:earth-online -- <EARTH_ONLINE checkout>`) |

## 2. How to work

- `cd intentai-web && npm ci && npm run dev`; `npm test`; `npm run build`; `npm run e2e`
  (if Playwright has no Chromium: `PW_CHROMIUM_PATH=/path/to/chrome npm run e2e`).
- Paths only from `src/routes.ts` (`paths`, `patterns`), never string literals. Device-local stores in `src/data/stores.ts`
  (validated, migrated). One card radius 20 px (`src/styles/tokens.css`). Bottom tabs: Home(Today) · Ask · Community · Moments · My Space.
- Rules the owner set: **no invented data** (every fact, height, date, position has a source or is left out; estimates are
  labelled); no real brand logos; replies to the owner in **Chinese and simple English, line by line**.
- Git: commit messages end with the Co-Authored-By / Claude-Session lines; push to the owner's repo; changes for the team go
  as a PR to `CDE5311-Aug2026/team-1` (the owner asks a teammate to merge). Don't push to the team repo without asking.

## 3. What the app has today (built and tested)

**Today** — three Singlish expressions a day; culture cards from `src/data/culture.ts` + `src/data/articles/*` (categories
foods, monuments, holidays = festivals, unesco, ich, history; each `Article` has `facts`, `deeper`, `sources`, `checkedOn`);
videos on cards (`src/data/videos.ts`, official Roots.sg-embedded ones only); the **Nearby map tile** (`components/NearbyMapCard`).

**Nearby Explorer** (`src/features/nearby/`, `pages/NearbyPage/`) — Singapore only:
- 173 curated places (`src/data/explore/places.sg.json`, keys `curated:sg-…`), areas (`areas.json`), outlines, 5 collections
  (`sg-100`, `sg-michelin-hawkers`, `sg-chinese-restaurants`, `sg-hawker-centres`, `sg-korean-restaurants`), validated by
  `npm run validate:explore`.
- 2D map (`CityMap`, glide animation on every jump, `JUMP_RADIUS_M` 350) and 3D view (`View3D` → `lite.html`; postMessage
  `show / you / pins / insets / zoom` in, `ready / card / pick / view` out); 2D and 3D keep the same view; `?sel=` opens on a place.
- Sheet (peek / half / full list), search, categories, area, radius, sort; place detail; Save / Check in (打卡) with Undo
  (`personal.ts`); backup / restore JSON.
- **Article ↔ place links** already exist: `src/data/cultureLinks.ts` (`ARTICLE_LINKS`: article id → places / areas / lists
  the text names, or a stall that serves the dish). This is the backbone for the new designs below.

**Ask** (`pages/AskPage/`) — a **Singlish phrase explainer**: pick a setting (group chat, office, hawker centre, MRT, home),
canned answers in `answer.ts` (no backend, no LLM), voice input, hand-off to Community. Nearby → Ask passes `AskHandoff`.

**Community** (`pages/CommunityPage/`) — "My questions / Answer as a local" segment, question page, withdraw with Undo,
"Ask a local" dialog. `Question` = `{id, text, context, detail, status: 'Pending'|'Answered', answer?}` in `data/domain.ts`.

**Moments** (`pages/MomentsPage/`) — Singlish passport (`data/collection.ts`), Today's three, topics, practise dialog,
**PlaceStamps** (check-ins from Nearby shown as stamps).

**Analytics** — `api/track.ts`, `api/stats.ts`, `/admin` dashboard (kept out of `paths`).

Recent commits (newest first): culture-card videos; one card radius; Today map tile; Explore opens on `sel` + glide;
Korean restaurants list (10, sourced); tap list row → map jumps; 2D/3D same view.

## 4. New design direction (boards from the owner, `docs/design-boards/`)

Three boards make one loop — **cards → Ask → Ask a local → answers flow back to cards → passport of places**:

- `ask-board.png` (A1–A5) — Ask answers **from your cards** for one place ("Asking about Berlin Wall Fragments · 3 cards");
  topic auto-switch Food / Monument / Festival; answer with big key numbers, the **source card** (Open; article + video length),
  a **verified local tip**, "Recommended for you — because you opened …"; off-topic → pick a topic or "Ask a local"
  ("near here" rewritten as "near UTown"); footnote "Answers come from your cards. AI can still make mistakes."
- `community-board.png` (C1–C5) — two doors (Ask a local / Answer as a local); question status Posted → Seen → Answered →
  Added; a local's answer sticks to the card ("+1 local tip", "Cited in Ask"); posting shows a reach circle on a mini map with
  auto topic; answering shows "their card already says" and a coverage ring (entry, dress, etiquette, timing); a
  desaturated status map (Answered / Waiting / Needs a local).
- `moments-board.png` (M1–M5) — passport of places: one stamp per place, ink fills as its 4 cards are opened; tap a stamp →
  its cards fan out (opened in colour, rest locked); **Snap** a photo → "match found" → card + ink; ranks Visitor → Explorer →
  Insider → Local with badges; flip-card recap (swipe right = knew it).

**None of this is implemented yet** (searched every branch of both repos on 28 Oct: no "Answers come from your cards",
"Because you opened", "Verified tip", topic switch, ink, ranks, Snap; the Berlin Wall Fragments / bak kwa / Lim Chee Guan
content does not exist either). Only "Ask a local", the Community tabs, withdraw and PlaceStamps have a basis.

## 5. How our existing work plugs into the new design (proposed plan)

| Design concept | Build it on | New work |
|---|---|---|
| "Card" | `Article` (culture.ts + articles/) with its `sources`, `facts`, video | card ids stable; mark which facts are "key numbers" (only sourced ones) |
| "Place" a card belongs to | Nearby catalogue `curated:sg-…` + areas, joined by `cultureLinks.ts` | reverse index place → cards; a place header chip ("Asking about …") |
| Topic switch Food / Monument / Festival | `CategoryId` foods / monuments / holidays | keyword topic detector (local, testable), placeholder text per topic |
| Ask answers from cards | new `askFromCards(question, place, cards)`: retrieve facts/deeper from that place's cards; answer quotes them and shows the **source card** (Open → article; place → `paths.nearbyPlace` / Explore `?sel=`) | start rule-based (no LLM) like `answer.ts`; if an LLM is added later, ground it on the same card text and keep "AI can make mistakes" |
| "Recommended for you — because you opened X" | opened articles (`stores.ts` progress / collection) + `cultureLinks` | ranking that states its reason |
| Ask a local (prefilled) | `QuestionDialog`, `CommunityHandoff` | carry `placeKey`, `topic`, source card id; rewrite "here" → area name from location / area |
| Status Posted → Seen → Answered → Added | `Question.status` | extend the union + migration in `stores.ts`; "Added" = answer attached to a card |
| Local tip on the card ("+1 local tip", "Verified") | new `tips` store keyed by article id | only real answers from the Community flow (seed tips must be marked "sample") |
| Reach circle / status map | `CityMap` (Nearby map) with a circle layer and status pins | desaturated style; pins coloured by status |
| Passport of places, ink | areas / collections + opened articles per place; PlaceStamps (check-ins) | stamp component with ink % = opened cards / place's cards |
| Snap a moment | — | needs real image recognition; for the demo use a few fixed photos and say so; never show an invented "94 % match" |
| Ranks and badges | check-ins, opened cards, tips | rules + progress rings |
| Flip-card recap | `PractiseDialog` | swipe deck over opened cards |
| 3D | `View3D` / `lite.html` | place card → 3D view of that landmark (already supported via `sel`) |

Suggested order: (1) Ask from cards for the places that already have articles + links (Thian Hock Keng, Sri Mariamman, Sultan
Mosque, chicken rice, laksa …), with source cards and the topic switch; (2) Ask a local carrying place / topic / card, statuses,
answers attached to cards; (3) Moments passport with ink from opened cards + existing check-in stamps; (4) ranks, recap, Snap demo.
New content (e.g. Berlin Wall Fragments at NUS, Chinatown bak kwa) needs sourced articles first.

## 6. Open items carried over

- Videos for the other 13 Today culture cards (lead: Roots.sg-embedded `7xW-GPASieo` for Sultan Mosque; only official, verified ones).
- Re-check the Korean restaurants list data (`collections.json` → `sg-korean-restaurants`).
- Production deploy root (`web/` vs `intentai-web/`): see `intentai-web/README.md` → Deployment.
- The Nearby map tile picture must be regenerated when places change (`scripts/today/map-preview.mjs` + `resize.py`).
