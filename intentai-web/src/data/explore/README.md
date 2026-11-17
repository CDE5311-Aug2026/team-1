# Nearby Explorer catalogue (Singapore)

Owned editorial data for Nearby. Validate after every edit: `npm run validate:explore`.

## Where the entries come from

| `provenance` | Count | What it means |
| --- | --- | --- |
| `earth-online` | 99 | A landmark or site of the **EARTH ONLINE · City Brush Singapore dataset** (github.com/Wsamme/earth_online): position of its 3D model, English/Chinese names, intro card (`description`, `quickFacts`). The intro cards are **not linked to sources**, so the app shows them as "From the EARTH ONLINE Singapore dataset" and shows no fun facts for these places. |
| `earth-online+researched` | 22 | The same dataset place, plus researched fun facts with source links. |
| `researched` | 52 | Places not modelled in the dataset (food centres, nature reserves, neighbourhoods; since 21 Oct also 20 Michelin-listed hawker stalls and Chinese restaurants, and since 22 Oct 10 Korean restaurants, for Editor's picks), researched with source links. The 3D view pins their point. |

Research (20 Oct 2026): facts were written by research agents from pages they opened (Roots.gov.sg / NHB, NParks, NEA,
URA, operators, Wikipedia), 40–80 words each, original wording, disputed claims left out. 14 places then had an
**independent agent source check** (claims re-checked against each cited page, copying and unsupported claims fixed);
the rest carry a writer-only check. Every entry's `reviewedBy` says which. **None has team editor sign-off yet** — that
is the remaining content gate, and the reason the collection stays a draft.

Things an editor should look at first (from the checks): coordinates for Old Airport Road Food Centre and Koon Seng Road
come from a hobby travel site; MacRitchie's point is from a URA map embed; a few monument dates rest on Wikipedia only;
Jewel's and the Botanic Gardens' dataset points are 500 m from the researched points (the dataset point is used, it
matches the 3D model).

## Editor's picks (21 Oct 2026)

Short lists (`kind: "picks"` in `collections.json`, 10 places each, opened from Explore's list button):
`sg-michelin-hawkers` (Bib Gourmand stalls), `sg-chinese-restaurants` (8 one-star, 1 Bib Gourmand, 1 Selected) and
`sg-hawker-centres` (the nine researched centres plus Chinatown Complex). All awards are from the **2026 MICHELIN
Guide Singapore** (Bib Gourmand list 28 Jul 2026, full selection 4 Aug 2026); each entry's `recognition.source` is its
guide.michelin.com page, opened on 21 Oct 2026 (two re-opened independently). Awards change every year: re-check them
when the next guide is out. Coordinates come from the map on each guide page (OpenStreetMap refused automated access),
not cross-checked; Chinatown Complex uses the point of a stall inside it. Chinese names come from the guide's Chinese
pages. Putien (Kitchener Road) is "Selected" (no star or Bib) — swap it out if the list should be starred / Bib only.

`sg-korean-restaurants` (22 Oct 2026): the 2026 guide has only three Korean restaurants — Meta (two stars; the guide
files it under "Innovative"), Nae:um (one star) and Na Oh (Selected, from the guide's full 2026 list article). The other
seven come from dated editorial picks, each named in its `recognition`: Tatler Best Restaurants Spotlight 2026 (Cote,
Gu:um), Korea's 2025 Outstanding Korean Restaurant designation (MAFRA and the Korean Food Promotion Institute, via The
Korea Times: Seoul Restaurant, Um Yong Baek; Nae:um was the third), Time Out Singapore's 50 Best (Feb 2025; Anju,
matched by its description — the page lists no names in text) and Tatler's best Korean BBQ list (Nov 2025; Chang,
O.BBa). Re-check first: coordinates for those seven come from Tatler map links, Pearl, Burpple and Wanderlog, not
Michelin; Cote's phone is the COMO hotel's number; Meta's hours and Um Yong Baek's hours and phone are left out because
the sources disagree. No source gave Chinese names; 엄용백 (Um Yong Baek) is from MiddleClass.sg.

## Tourism 2040 categories and import (Redesign v2, 8 Nov 2026)

New optional fields on `CuratedPlace` (types in `src/data/tourism.ts`; rules in `scripts/validate-explore.mjs`):

| Field | Values | Rule |
| --- | --- | --- |
| `tourism` | `{ category: att \| wel \| lei \| cru, subtype?: attraction \| precinct \| hotel \| terminal \| marina \| island \| spa \| nature \| venue \| festival }` | Required on every published place. The legacy `category` stays as it is for Nearby, Moments and the 3D view. |
| `operatingStatus` | `open \| new \| planned \| seasonal` (absent = open) | `planned` places are always drafts. Set only where a source gives the status. |
| `pinQuality` | `building \| street \| area \| approx` (absent = an older curated pin) | Only `building` (and older pins) may ever show “within range”. |
| `parentId` | an existing place id | A narrower place inside another (a spa in a resort, a venue in a garden). It is its own record and inherits nothing. |

How every existing record got `tourism` (`node scripts/tourism-map.mjs --apply`): a rule table over `kind` + `category`
(museums, worship, monuments, heritage, food → Attractions; districts, quays, hawker centres → precincts; hotels and
resorts → hotels; parks, reserves, gardens, beaches → Wellness/nature; stadiums, theatres, concert halls → Leisure
venues; ferries, marinas → Cruise). The rules leave a few records open; each was decided by reading it, and those
decisions are listed with their reason in `HAND` in the script. Places the research doc matched take the doc's
category instead (Gardens by the Bay → Attractions, Sisters' Islands and Pulau Ubin → Cruise islands).

The import (`research/`):

- `tourism2040-doc.md` — the research inventory (Claude Doc rev 21, exported 8 Nov 2026): 147 rows with type,
  status, area, pin quality and the source links. It is the cited source list.
- `tourism2040.csv` — one row per doc row, the full import schema: tourism category/subtype, doc status, pin, area,
  source URLs, the OneMap query and hit (`node scripts/geocode-onemap.mjs`, cache in `onemap-cache.json`), and for
  admitted rows the record name, slug, legacy kind/category, our one-sentence summary and the fact with its pages.
  Facts were written in our own words from the cited pages, opened on 8 Nov 2026.
- `crosswalk.csv` — the identity decision per row: `match:<id>` (adds `tourism`, and `operatingStatus` only when
  sourced; the id and every other field stay), `child-of:<id>` (a separate record with `parentId`), `new`, or
  `ambiguous` (changes nothing until the owner rules). `node scripts/tourism-map.mjs --crosswalk` only *proposes*
  (normalised name, aliases, OneMap distance); the outcomes were reviewed by hand against each existing record.
- `quarantine.csv` — `new`/`child-of` rows that cannot meet the unchanged validator, with the reason (no sourced fact,
  no trustworthy OneMap coordinate, a dated event rather than a place). Nothing is filled in to admit them.
- `baseline-ids-ddc8e4e.json` — every place id before the import; `catalogue.test.ts` checks none is lost.

New records (`node scripts/tourism-map.mjs --import`) are `provenance: researched`, `reviewedBy: tourism2040-import`,
with OneMap coordinates (the query URL as `coordinates.source`), the nearest legacy area, and drafts for planned or
unconfirmed rows. They have no team editor sign-off yet. Their legacy `category` is a best fit for the old screens
(spas, hotels, terminals, precincts → landmark; venues and the lifestyle cluster → culture; Mandai parks → nature). Matched records keep their coordinates; OneMap hits more than
150 m away are listed by the geocode script for review and never applied. Run order: `--crosswalk` → review →
`geocode-onemap.mjs` → `--import` → `--apply` → `python scripts/ura/build-ura.py` (planning areas, offshore list) →
`npm run validate:explore`.

## Files

- `places.sg.json` — `CuratedPlace[]` (see `src/features/nearby/domain.ts`). `editorialStatus: published` entries are
  shown; drafts stay in the file. Ids are stable (`curated:sg-<slug>`): never reuse or rename one that may be saved on a
  device — retire it instead.
- `collections.json` — membership in editorial order. Progress = visited published members / published members.
  `status: starter` shows "Singapore collection · N places" with a "Draft" note; `published` is allowed only with exactly 100
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
Singapore phrase settings and are written by the FindSG team.
