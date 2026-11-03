# v3 merge map: ZIP prototype × live app × Nearby

- **Date:** 29 Oct 2026 · branch `feature/v3-prototype` (from `integration/v2-nearby`)
- **Prototype:** `IntentAI-Claude-handoff.zip` (local copy and git history: `~/Documents/GitHub/intentai-prototype`). Static
  HTML/JS; answers are hard-coded samples.
- **Live app:** `intentai-web/` (what cde-5311.vercel.app serves) + this branch's Ask from cards, linked questions and tips.

## Rules (from the owner, 29 Oct)

1. **Interaction follows the ZIP prototype** for Ask, Community and Moments: its screens, entry points, sheets and order of
   steps win over the live app and over Figma.
2. **The whole UI moves to the Intent v3 Figma** (`Intent v3.fig`): Onboarding (O1–O8), Home (map + carousel), place
   cards (Album Rail, food / monument / festival / history), My Space (S1–S4), and the look of Ask, Community and
   Moments. **Only Nearby stays as it is.** Where Figma and the ZIP differ on Ask, Community or Moments, the ZIP's
   interaction wins (rule 1).
3. **Nearby keeps its own interaction** (map, 2D/3D, sheet, place page, check-in). It is merged as data and entry points,
   not restyled into the prototype's screens.
4. Everything the prototype shows as a sample is backed by real app data where the app has it; where it doesn't, it is
   labelled **Sample** (no invented answers, people or numbers — PRD v3 §2).
5. Work in small steps the owner can check locally (`npm run dev`), one sub-page at a time.

## Sub-pages

| Prototype sub-page | Prototype interaction (kept) | Live data / feature plugged in | Nearby link |
|---|---|---|---|
| **Ask · home** (`welcome`) | One title, two image cards (Learn culture / Understand the meaning) with float, tilt and press; each opens a sheet of examples or "ask my own"; free composer; History + ⋯ settings in the header | Culture examples = real areas with cards (`SUBJECTS`); meaning examples = the phrases the explainer knows (chope, can or not, paiseh, sabo) | Culture examples name Nearby areas |
| **Ask · intent** | "Behind the words": literal / what they might mean / still unclear; Add context (where, who, topic); Help me reply (+ softer); Ask a local; save insight; follow-ups | Phrase explainer (`answer.ts`), context presets; Ask a local carries `lookupId` (slice 2) | — |
| **Ask · culture** | Answer paper with photo, source pill, follow-up chips, Ask a local | Ask from cards (`cards.ts`): card sentences, key numbers, source card, recommendations, local tip | Place chips open Nearby (`?sel=` / area) |
| **Ask · context** | Attach a card (+), "Using your attached card", view source, remove | Attach = an opened card or a place's cards; answer bound to that card | Attach from a Nearby place |
| **Ask · general** | Free question, reply suggestions, follow-ups | No LLM: routed to cards or phrases; otherwise an honest "can't answer from your cards" + Ask a local | — |
| **History / settings** | Search, Today / Yesterday / 7 days groups, reopen, new chat; reduce motion; about | New `askThreads` store (question, kind, context, card/phrase ids, follow-ups) | — |
| **Community · locals map** (`/community/map`, Figma C5) | Filter pills (All / Answered / Waiting / Needs a local), Local switch, map with question pins (photo + status ring) and people pins, + Ask, carousel synced with pins | Questions (own + example), people who share a profile (area only; examples marked) | **Uses Nearby's map** (`CityMap`, read-only); pin a place when asking a local |
| **Community** | Two photo doors (Ask a local, Answer as a local + switch), 3-step strip, My questions with 4-dot progress, map card, privacy line, notifications | `questionsStore` (statuses, links), `tipsStore`, Answer as a local = `settings.local` | Map card opens Nearby with question pins (later); place names from areas |
| **Moments** | Passport (stamps, ink, pages), Collected masonry + filters, Recap, Snap (sample), rank | Stamps = Nearby check-ins; ink = opened cards ÷ place cards; `x / 100` = `sg-100`; Collected = opened cards, tips, saved Ask insights, phrases | Stamp → place in Nearby |
| **Home** | Figma 1: map with Parallax Carousel of places, "N of 4 opened", occasion banner, Near you | Today's content (cards, holidays), Nearby places + check-ins | The map **is** Nearby's map; tapping a place opens Nearby |
| **Place page** | Figma 2/7: Album Rail of 4 sleeves (food, monument, festival, history), Check in, Open card | Place's cards via `cultureLinks`; check-in = Nearby `visited` | Same place key as Nearby |
| **Card pages** | Figma 3–6 / 8–11: food (photo carousel, try it nearby, local tip), monument (video, key numbers, then-and-now), festival (next date, remind me), history (timeline, collect stamp) | Articles + videos + tips; only sourced content | "See it on the Nearby map" |
| **Onboarding** | Figma O1–O8: Treasure Hunt welcome, six questions with live previews, passport stamped | Replaces today's onboarding (topics → `culturePrefs`, home base → Nearby area) | Home base sets Nearby's search point |
| **My Space** | Figma S1–S4: what the app knows (eye = private), switches, settings, privacy & data | Live settings, delete all data, export | Nearby radius / home base |
| Nearby | (unchanged) | — | — |

## Steps

1. **Ask home** — the two image cards with motion, example sheets backed by real data. Done.
2. **Ask answer pages** (intent, culture, context, general) in the prototype layout. Done.
3. **Ask History + settings.** ← next
4. Community.
5. Moments.
6. Shared shell: bottom navigation, header buttons and the rounded-shape system on every page.
7. Onboarding O1–O8.
8. Home (map + carousel) and the place page (Album Rail).
9. Card pages (food, monument, festival, history).
10. My Space S1–S4.

Content the Figma shows but the repo doesn't have (Berlin Wall Fragments, bak kwa, Chinatown history, 4 cards per
place) needs sourced articles first (PRD v3 §8); until then those slots show what exists, or **Sample**.

## Motion and effects (React Bits)

Components from [React Bits](https://reactbits.dev) live in `intentai-web/src/components/reactbits/` with their licence
(MIT + Commons Clause) and a note of every change. Only components that need `motion` (or nothing) are used, to keep
one animation library. Every effect turns off with reduced motion; text is never hidden from screen readers.

| Page | Component | Where | Status |
|---|---|---|---|
| Ask | BlurText | home title, answer headings | Done |
| Ask | CountUp | key numbers that are plain numbers (years, counts) | Done |
| Ask | ClickSpark | spark when an answer is saved to Moments | Done |
| Ask | Magnet | the send button, once there is text | Done |
| Ask | (motion) | home cards rise in turn; answers rise in | Done |
| Community | AnimatedList-style stagger (motion) | My questions | Planned (step 4) |
| Community | ClickSpark | when a local's answer is added to a card | Planned (step 4) |
| Moments | Stack | Recap: swipe right = knew it, left = again | Planned (step 5) |
| Moments | BounceCards | a stamp's 4 cards fan out (M2) | Planned (step 5) |
| Moments | ClickSpark | "Collect stamp" (Figma: spark burst) | Planned (step 5) |
| Moments | CountUp | rank progress, ink % | Planned (step 5) |
| Home / cards | CircularText | video poster ring (Figma 4/5) | Planned (steps 8–9) |
| Onboarding | BlurText / RotatingText | Treasure Hunt welcome, question titles | Planned (step 7) |
