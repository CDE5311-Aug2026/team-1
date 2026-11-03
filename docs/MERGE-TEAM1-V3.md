# Merge: Team 1 main + v3 work (29 Oct 2026)

Base: `team1/main` (b3fa9f4, Home redo + place stories). Merged in: the v3 work from `Wsamme/CDE-5311`
`feature/v3-prototype` (Ask, Community, Moments, My Space, Onboarding, Nearby links, memory). Branch:
`merge/team1-v3` (merge staged, not committed).

## Decisions (owner, 29 Oct)

| Area | Result |
| --- | --- |
| Home | Team 1's Home (header, greeting, holiday card, Leaflet map, map search, carousel, motion). The carousel now lists every published Nearby place after Team 1's five (2 story places + 3), nearest to the home base first. Places without story cards open in Nearby ("Nearby" button, was "Cards soon"). Mouse drag added. The "places to explore" chip shows the real count. |
| Place / card pages | One `/place/:placeId` route: story places (chinatown, berlin-wall-fragments) open Team 1's story pages; `sg-chinatown` redirects to `/place/chinatown`; other areas open the v3 Album Rail page; unknown ids get Team 1's not-found page. `/card/thian-hock-keng` → `/place/chinatown/monument`, `/card/lunar-new-year` → `/place/chinatown/festival`; other cards keep `/card/:id`. (`src/pages/PlaceStory/PlaceRoute.tsx`) |
| Tab bar | Team 1's tab bar (filled icons, 58px). Shown on Nearby pages too (owner request). |
| Ask, Community | v3 (ours). |
| Moments, My Space, Onboarding | v3 (ours). Team 1's "Place stories" stamp row is in Moments under My Places (`MomentsPage/PlaceStamps/StoryStamps.tsx`). A story check-in or stamp also counts as a stamp for its area (Chinatown, Clementi for the Berlin Wall). |
| Kept from base | `components/SourceLine` (Ask still uses it; Team 1 moved theirs to `components/story`). |

## Also in this merge

- "You as a local" (Community map avatar, and My Space › You as a local): native language and where you grew up follow
  onboarding's Language and From until the user sets their own; the map area defaults to Home base.
- Place photos: `scripts/explore/place-photos.mjs` fetches openly licensed Wikipedia/Commons photos (CC0, PD, CC BY,
  CC BY-SA only) into `public/nearby/photos/`, credits in `src/data/explore/photos.json` and Settings › Terms &
  licences. 82 of 173 places have one; the rest use the 3D view. Rerun after adding places.

## Tests

928 unit tests, 121 e2e (nearby3d not run; `Nearby3D.test.tsx` is order-flaky in the full run, passes alone, also before
the merge). Tests changed: Home card counts (5 → 175), "Cards soon" → "Nearby", tab bar box `[20, 758, 350, 58]`,
`Back to Home`, `/place/sg-chinatown` → story redirect.
