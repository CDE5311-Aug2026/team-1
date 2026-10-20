# Nearby Explorer catalogue (Singapore)

Owned editorial data for Nearby. Validate after every edit: `npm run validate:explore`.

## Where the entries come from

| `provenance` | Count | What it means |
| --- | --- | --- |
| `earth-online` | 99 | A landmark or site of the **EARTH ONLINE · City Brush Singapore dataset** (github.com/Wsamme/earth_online): position of its 3D model, English/Chinese names, intro card (`description`, `quickFacts`). The intro cards are **not linked to sources**, so the app shows them as "From the EARTH ONLINE Singapore dataset" and shows no fun facts for these places. |
| `earth-online+researched` | 22 | The same dataset place, plus researched fun facts with source links. |
| `researched` | 21 | Places not modelled in the dataset (food centres, nature reserves, neighbourhoods), researched with source links. The 3D view pins their point. |

Research (20 Oct 2026): facts were written by research agents from pages they opened (Roots.gov.sg / NHB, NParks, NEA,
URA, operators, Wikipedia), 40–80 words each, original wording, disputed claims left out. 14 places then had an
**independent agent source check** (claims re-checked against each cited page, copying and unsupported claims fixed);
the rest carry a writer-only check. Every entry's `reviewedBy` says which. **None has team editor sign-off yet** — that
is the remaining content gate, and the reason the collection stays a draft.

Things an editor should look at first (from the checks): coordinates for Old Airport Road Food Centre and Koon Seng Road
come from a hobby travel site; MacRitchie's point is from a URA map embed; a few monument dates rest on Wikipedia only;
Jewel's and the Botanic Gardens' dataset points are 500 m from the researched points (the dataset point is used, it
matches the 3D model).

## Files

- `places.sg.json` — `CuratedPlace[]` (see `src/features/nearby/domain.ts`). `editorialStatus: published` entries are
  shown; drafts stay in the file. Ids are stable (`curated:sg-<slug>`): never reuse or rename one that may be saved on a
  device — retire it instead.
- `collections.json` — membership in editorial order. Progress = visited published members / published members.
  `status: starter` shows "Singapore collection (draft) · N places"; `published` is allowed only with exactly 100
  distinct published members that a team editor has signed off (the validator enforces this).
- `areas.json` — regions (URA planning regions) and area centres (Wikipedia coordinates; four areas use a central
  landmark where the area article has none: Chinatown (de.wikipedia), Kampong Glam (Sultan Mosque), Katong (Joo Chiat
  Road), Orchard (Orchard Road)).
- `roads-major.json`, `roads-minor.json` — 2D road layers from the dataset's `sg_roads` (© OpenStreetMap contributors,
  ODbL), simplified (4 m / 3 m), in the dataset's metric frame.
- `outlines.json` — Natural Earth 1:10m Singapore outline (public domain), for the in-Singapore check.
- `stats.json` — published-place count used by Today (must match; the validator checks).

## Editorial rules (summary of PRD §10)

One entry per real place (no duplicate entrances or renamed copies); public access only (offices, homes and closed
sites are marked `viewFromOutside` and kept out of the collection); 0–3 facts of 40–80 words, each with a specific
source page (not a home page) and a checked date; no unsupported superlatives, "locals recommend", prices or opening
hours without a dated source; no photos without a recorded licence. Language tips (`languageTip.context`) use the nine
Singapore phrase settings and are written by the IntentAI team.
