# FindSG Redesign — Category Map Plan & Singapore Location Research

Nov 7, 2026 · @SH

## Summary

The redesign changes FindSG's map from geography-first to category-first. Places are grouped into four colour-coded layers: **Cruise**, **Wellness**, **Leisure Events**, and **Attractions, Precincts & Destination Hotels**. The five regions stay, but only as a filter.

- **Research result:** 147 Singapore locations, refined on 7 Nov 2026: 16 Cruise, 31 Wellness, 28 Leisure Events, and 72 Attractions, Precincts & Destination Hotels (34 attractions, 16 precincts, 22 hotels). 24 opened recently, 14 are planned, 5 are seasonal and 1 still needs confirming.
- **Coordinates:** 111 pins now come from OneMap, Singapore's official map (106 at the building, 5 at street level). 27 are area points for precincts and unbuilt sites, and 9 are still approximate. 47 of the earlier pins moved more than 150 m.
- **Colour system:** four hues tested with a colourblind-safety checker against the app's parchment background. All checks pass (worst colourblind pair ΔE 10.0). Each colour is paired with its own icon shape, so colour is never the only cue.
- **How I read the categories:** this follows the Singapore Tourism Board's industry groupings, which treat "Attractions, Precincts & Destination Hotels" as one category. That gives 4 categories, with attraction, precinct and hotel as sub-types inside the fourth.
- **Not built yet.** Decisions needed from you before the build starts are listed at the end, under Open questions.

## Refinement pass, 7 Nov 2026

The STB [Tourism 2040 page](https://www.stb.gov.sg/about-stb/what-we-do/tourism-2040/) is a valid, official source, but it names no places itself. The places come from its [factsheet](https://isomer-user-content.by.gov.sg/1/ecec4451-5f7f-499c-926a-8436fe27e976/STB%20Tourism%202040%20Factsheet,%202025.pdf) and the [STB chief executive's May 2026 address](https://www.stb.gov.sg/about-stb/media-publications/speeches/speech-by-ms-melissa-ow--chief-executive--singapore-tourism-board--at-the-tourism-industry-conference-2026/). Together they added 15 places and confirmed several dates. Checking every entry also found 10 corrections.

**Corrections**

| Item | What changed | Source |
| --- | --- | --- |
| Six Senses Maxwell | Now [Maxwell Reserve Singapore, Autograph Collection](https://loyaltylobby.com/2020/07/01/ihgs-two-singapore-six-senses-switch-to-marriotts-autograph-collection/). Six Senses left in 2020, so its spa was removed from Wellness. | LoyaltyLobby |
| Remède Spa, St. Regis | Renamed [The St. Regis Spa](https://vogue.sg/st-regis-spa-singapore/) after a redesign; open | Vogue Singapore |
| Malay Heritage Centre | Reopened 25 Apr 2026 after its revamp ([Time Out](https://www.timeout.com/singapore/news/malay-heritage-centre-reopens-april-25-with-revamped-galleries-and-a-9-day-festival-042426)); status changed from verify to new | Time Out |
| IMBA Theatre | Site confirmed: West Lawn beside Bayfront Plaza, 18 Marina Gardens Dr ([Honeycombers](https://thehoneycombers.com/singapore/imba-theatre-gardens-by-the-bay-singapore/)) | Honeycombers |
| NoMad Singapore | Site is the Faber House redevelopment at 230 Orchard Road: 18 storeys, 173 rooms, opening 2027 ([TopHotel](https://tophotel.news/?p=593983)) | TopHotel, OneMap |
| Raffles Sentosa | Address is 4 Bukit Manis Road ([Michelin Guide](https://guide.michelin.com/ca/fr/hotels-stays/singapore/raffles-sentosa-singapore-15377)); pin moved 429 m | Michelin, OneMap |
| Marina Bay Cruise Centre | Expansion completed in 2025; pin moved 558 m to the terminal building | STB address, OneMap |
| Founders' Memorial | Opens 2028; pin set to the published site coordinates ([Wikipedia](https://en.wikipedia.org/wiki/Founders%27_Memorial)) | Wikipedia |
| The Mora Singapore | 20-room TUI hotel in Labrador Nature Reserve, due Sep 2026 ([TUI](https://www.tuigroup.com/en/newsroom/news/asia-welcomes-the-mora-a-bold-new-chapter-of-luxury-begins-in-singapore)). Marked verify until the opening is confirmed. | TUI |
| Universal Studios Singapore | Super Nintendo World confirmed in Jul 2026, still without an opening date ([InterPark](https://interpark.co.uk/latest-news/super-nintendo-world-singapore-confirmed-as-resorts-world-sentosa-expansion-moves-forward/)) | InterPark |

**Added from Tourism 2040 sources (15)**

| Category | Added |
| --- | --- |
| Wellness | [Future Resonance](https://www.factmagazines.com/singapore/spa-wellness/future-resonance-singapore-immersive-wellness-sound-healing) (New Bahru, opened May 2026), Hideaway Bathhouse, Mandai Boardwalk |
| Leisure Events | Marina Bay Sands' 15,000-seat arena (under construction), Downtown MICE Hub (bid call 2027), new Kallang indoor arena, Zouk Singapore |
| Attractions | [Wetlands by the Bay with a teamLab museum](https://www.ttgasia.com/2026/03/11/gardens-by-the-bay-plans-new-five-hectare-wetlands-precinct-with-teamlab-museum/) (from late 2028), WEAVE at Resorts World Sentosa (2025), Porsche Experience Centre (2027), New Bahru |
| Precincts | Dempsey, Changi East Urban District |
| Destination hotels | The Mora Singapore, [Mövenpick Singapore](https://www.edgeprop.sg/property-news/accor-partners-fragrance-group-and-global-premium-hotels-open-three-new-singapore-properties) (808 keys, Hoe Chiang Road) |

Coordinates came from OneMap Search, run on 7 Nov 2026. Each row's source (building, street, area point or approximate) is in the data files and in the Pin column of the tables below.

## Current app audit (cde-5311.vercel.app)

Today FindSG groups everything by geography and topic. None of the four requested categories exists in it yet. Below is what I saw in the live app on 7 Nov 2026 and in its shipped JavaScript.

| Area | What it does today | What it means for the redesign |
| --- | --- | --- |
| Map grouping | Drill-down Singapore → 5 regions (Central, East, North-East, North, West) → planning areas (e.g. Queenstown) → places. Breadcrumb chip shows the level. | The main grouping changes from region to category. Region and planning area stay as filters, not the top level. |
| Place cards | 3D cover-flow cards per region/area with collection progress (e.g. Central 0/278, Queenstown 0/26). Place ids look like `curated:sg-berlin-wall-fragments-utown`. | Keep cover-flow, but the first deck becomes four category cards with counts and progress. |
| Topics | Four topic filters: Landmark (monuments), Culture (history, festivals), Food, Nature. | Topics don't line up with the new categories. They need mapping or retiring (see open questions). |
| Map engine | OneMap base map ("Map data · OneMap"), 3D place models streamed on demand ("first time downloads up to 19 MB"). | OneMap's search API can geocode the new dataset and look up planning areas. |
| Tabs | Home, Moments, Hunt (quests), Passport (stamps). | Passport stamps and Hunt quests can be issued per category. |
| Top banner | Festival card ("Deepavali, long weekend to Mon 9 Nov"). | This becomes the feed for the Leisure Events layer. |
| Other | Six card languages (EN, 中文, MS, த, ID, 한), on-site mode for Kampong Gelam and Telok Ayer, speech, share. | The new category names and sub-types need translations in all six languages. |
| Look | Vintage survey-map parchment, brown chrome, orange selection accent, theme colour #c8a87a. | Category colours must read on parchment. The orange selection accent clashes with one category hue (see colour system). |

## Category framework & colour system

Each place gets exactly one primary category, which sets its colour and icon. It can also carry secondary tags, so the Botanic Gardens can be an Attraction tagged Wellness. Categories follow how the Singapore Tourism Board organises the industry: Cruise, Leisure Events, Attractions and Integrated Resorts, and tourism precincts ([STB experience development](https://www.stb.gov.sg/industries-experience-development)).

| Category | Colour (hex) | Marker shape | Sub-types | Counts as this category when… |
| --- | --- | --- | --- | --- |
| Cruise | Harbour blue #2A6FB8 | Anchor in a circle | Cruise terminal, ferry terminal and pier, marina, river and harbour cruise, island by ferry | You board or arrive by boat, or it's the destination of a scheduled boat |
| Wellness | Jade #3B9A6A | Leaf in a rounded square | Spa, bathhouse, recovery and longevity, wellness resort, mindful nature, active outdoors, farm wellness, wellness attraction | Its main purpose is restoring body or mind |
| Leisure Events | Festival magenta #A4267A | Ticket in a diamond | Event venue, festive light-up, festival | It's a venue for ticketed or public events, or the site of a recurring festival. Each event attaches to its venue with dates. |
| Attractions, Precincts & Destination Hotels | Heritage amber #D06A10 | Attraction: star pin. Precinct: outlined, hatched area. Hotel: key pin. | Attraction, precinct, destination hotel | A ticketed or iconic sight, an STB tourism precinct, or a hotel that's a reason to visit in itself |

**Colour check.** I tested the palette with a colourblind-simulation validator against the cream surface (#F6EEDC), comparing all pairs. It passes the lightness band, chroma floor, normal-vision separation and 3:1 contrast. The worst colourblind pair still separates at ΔE 10.0, above the target of 8.

**Rules that come with it**

- **Selection accent:** the app's orange selection accent sits too close to Heritage amber. Selection becomes a dark ink ring plus a lift shadow instead of an orange fill.
- **Status overlay:** status uses a badge, never a new hue. "New" (opened in the last 18 months) gets a small dot. "Coming soon" gets a dashed marker outline at 60% opacity. "Seasonal" gets a date chip.
- **Icons:** marker shapes differ per category, so the map still reads in greyscale, in print, or for colourblind users. Each legend chip shows both the shape and the colour.
- **Colour follows the category, not the count:** filtering never re-colours the markers that remain.

## Redesigned map & navigation

The home map opens on all four layers together, and the cover-flow deck becomes four category cards. Drilling down goes category → sub-type or precinct → place. Region and planning area move into a filter row.

**Home and grouping**

1. **All-layers map:** colour-coded clusters. Each cluster is a small ring split by category share, with the total in the middle, so you can see that Sentosa is mostly amber with some jade and blue. At zoom 15 and closer, clusters split into individual shaped markers.
2. **Category deck:** four cards replace the region cards. Each shows its colour, icon, count (for example "Wellness · 31") and collection progress. Tapping a card isolates that layer and dims the other three to 20%.
3. **Sub-type chips:** these appear under the map once a category is selected. Examples: Cruise → Terminals, Marinas, Islands. Attractions/Precincts/Hotels → Attractions, Precincts, Hotels.
4. **Precincts:** the 16 precincts draw as hatched amber areas behind the markers at zooms 12–15. Tapping one opens its places across all categories, so Kampong Gelam's on-site mode carries over.
5. **Place detail:** keeps today's story card, 3D model, speech and share. It adds the category badge, status (new, coming soon, seasonal), and the events at that venue.

**Search (the colour-coded search)**

- One search bar covers names, sub-types, areas and event names.
- Results are grouped under four colour-headed sections. Each row shows the shape icon, name, sub-type, area and distance.
- Filter chips: category (multi-select), region, and status (Open now, New, Coming soon, This month).
- Results show on the map and in a list at the same time. A map/list toggle covers accessibility and small screens.

**Leisure Events time layer**

- A segmented control (Now / This month / Upcoming / Past) filters event pins by date. Venues with nothing on fade back.
- The top banner (currently Deepavali) is fed from the same event data. For 7 Nov 2026 it would cycle through Changi Festive Village (from 7 Nov), Deepavali (8 Nov), the PGL Major CS2 tournament (from 25 Nov), and BTS at the National Stadium (17–22 Dec).

**Cruise mode**

- "I'm on a cruise" sets Marina Bay Cruise Centre or HarbourFront as home base. It then shows places reachable in a port-day window, for passengers before or after a cruise. This matters more since Disney Adventure began sailing from Marina Bay on 10 Mar 2026.

**Hunt and Passport**

- Stamps and quests are issued per category, such as a "Spa trail" or "Southern Islands hop". Progress counts per category, replacing per-region counts.

The diagram below shows how the screens nest.

&#91;embedded content: screen hierarchy · home → category → place\]

The four highlighted boxes are the new top level. Search and the filter row reach every layer, and the dashed line marks the filters acting on all four categories.

## Data model, sources & geocoding

Three record types replace today's single place list: places, events (linked to a venue place) and precinct areas. The research dataset already uses the place fields, as GeoJSON and CSV, so the build can load it directly.

| Record | Key fields | Notes |
| --- | --- | --- |
| Place | id (`cru:marina-bay-cruise-centre-singapore`), name, category, subtype, tags\[\], status, opened, lat, lng, planningArea, region, precinctId, address, sourceUrl, lastVerified | `category` sets colour and icon. Region and planning area are looked up from coordinates, not typed in. |
| Event | id, name, venueId, start, end, recurrence, ticketUrl, sourceUrl | Drives the time layer and the top banner. Recurring festivals carry a rule, such as Deepavali yearly by date. |
| Precinct | id, name, polygon (GeoJSON), blurb | Starts from URA planning-area or subzone outlines, then gets trimmed by hand to the tourism precinct boundary. |
| Translation | key, en, zh, ms, ta, id, ko | Covers category names, sub-types and status labels, to match today's six card languages. |

**Sources to load or check against**

- STB Tourist Attractions dataset on data.gov.sg (KML/SHP/GeoJSON, Open Data Licence, last updated 6 Jun 2024). This is the baseline for attractions and gets cross-checked against 2025–26 openings ([dataset](https://data.gov.sg/datasets/d_15a8ecc14700107f2b5696335a697b9c/view)).
- STB's 2026 event and development pipeline: F1, PGL Major, Tennis Open, Christmas Wonderland, Exploria, Skyslides, and the new ships homeporting here ([STB Annex C](https://isomer-user-content.by.gov.sg/1/730cbf27-ea9d-4132-8457-cfd0ecdb18bb/Annex%20C.pdf)).
- STB precinct list ([placemaking](https://WWW.STB.GOV.SG/content/stb/en/about-stb/what-we-do/placemaking.html)) and Visit Singapore neighbourhoods ([neighbourhoods](https://www.visitsingapore.com/see-do-singapore/neighbourhoods)).
- Venue calendars, such as The Kallang's event pages ([The Kallang events](https://heretoplay.thekallang.com.sg/events?page=2)), refreshed weekly for the Leisure Events layer.

**Pipeline**

1. Load the research GeoJSON (147 places, 111 already on OneMap points) and the STB attractions dataset, then merge duplicates by name and distance (under 100 m).
2. Geocode the remaining 36 area and approximate points through OneMap Search with returnGeom=Y. Store the address, postal code and SVY21 coordinates, and flag any match more than 150 m from the research point for review.
3. Look up the planning area and region from the coordinates, so the region filter and the old hierarchy keep working.
4. Join events to venues, compute status from the dates against today, and set `lastVerified`.
5. A weekly check flags events past their end date, and "coming soon" places whose opening date has passed, for review.

## Location research: 147 places across Singapore

The island-wide search, refined on 7 Nov 2026, found 147 places across the four categories. The **Pin** column shows where each coordinate comes from:

- **OneMap:** matched to the building.
- **OneMap street:** a street-level point.
- **Area point:** a precinct or an unbuilt site.
- **Approx:** still to be pinned by hand.

**Status:** new means opened since about mid-2025, planned means announced but not open, seasonal means it happens on set dates, and verify means it still needs confirming. Exact coordinates are in the GeoJSON and CSV files.

### Cruise · 16 places (harbour blue)

| Place | Type | Status | Area | Pin | Note |
| --- | --- | --- | --- | --- | --- |
| Marina Bay Cruise Centre Singapore | Cruise terminal | open | Marina South | OneMap | Expansion completed 2025 (to about 12,000 passengers); Disney Adventure homeport since Mar 2026 |
| Singapore Cruise Centre (HarbourFront) | Cruise & ferry terminal | new | HarbourFront | OneMap | New terminal at 5 HarbourFront Ave; all operations moved here 15 Jul 2026 |
| Tanah Merah Ferry Terminal | Ferry terminal | open | Tanah Merah | OneMap | Regional ferries to Bintan and Batam |
| Marina South Pier | Ferry pier | open | Marina South | OneMap | Ferries to Kusu, St John's and Lazarus |
| Changi Point Ferry Terminal | Ferry pier | open | Changi Village | OneMap | Bumboats to Pulau Ubin |
| West Coast Pier | Ferry pier | open | West Coast | OneMap | Charter boats and launches |
| ONE°15 Marina Sentosa Cove | Marina | open | Sentosa Cove | OneMap | Only marina with customs and immigration; Singapore Yacht Show venue |
| Marina at Keppel Bay | Marina | open | Keppel Bay | OneMap | Mainland yacht charters |
| Republic of Singapore Yacht Club | Marina | open | West Coast | OneMap | Founded 1826 |
| Raffles Marina | Marina | open | Tuas | OneMap | Far-west marina |
| Singapore River Cruise, Clarke Quay jetty | River & harbour cruise | open | Singapore River | OneMap | Bumboat cruises on the river and Marina Bay |
| Kusu Island | Island by ferry | open | Southern Islands | OneMap | Ferry from Marina South Pier |
| St John's & Lazarus Islands | Island by ferry | open | Southern Islands | OneMap | Ferry from Marina South Pier |
| Sisters' Islands Marine Park | Island by ferry | open | Southern Islands | OneMap | Guided intertidal walks |
| Pulau Ubin | Island by ferry | open | North-East islands | OneMap | Bumboat from Changi Point |
| Integrated Cruise & Ferry Terminal (under study) | Cruise terminal | planned | Straits View | Area point | Feasibility study at Straits View, next to MBCCS |

### Wellness · 31 places (jade)

| Place | Type | Status | Area | Pin | Note |
| --- | --- | --- | --- | --- | --- |
| Therme Singapore | Wellness attraction | planned | Marina South | Area point | S$1bn thermal wellbeing park beside Marina Barrage; works from 2026, opens 2030 |
| Auriga Spa, Capella Singapore | Spa | open | Sentosa | OneMap | Forbes five-star spa |
| Banyan Tree Spa, Marina Bay Sands | Spa | open | Marina Bay | Approx |  |
| Willow Stream Spa, Fairmont | Spa | open | Civic District | OneMap | 23 treatment rooms |
| The St. Regis Spa (formerly Remède Spa) | Spa | open | Tanglin | OneMap | Renamed from Remède Spa after a redesign |
| ESPA, Resorts World Sentosa | Spa | open | Sentosa | OneMap | Garden suites and beach villas |
| BODHI Spa, The Laurus | Spa | new | Sentosa | Approx | First BODHI outside Australia; contrast bathhouse |
| Raffles Spa, Raffles Singapore | Spa | open | Civic District | OneMap |  |
| Raffles Sentosa Spa | Spa | new | Sentosa | OneMap | In restored former barracks at 4 Bukit Manis Road |
| AWAY Spa, W Sentosa Cove | Spa | open | Sentosa Cove | OneMap |  |
| CHI, The Spa, Shangri-La Rasa Sentosa | Spa | open | Sentosa | OneMap |  |
| Oasia Resort Sentosa | Wellness resort | open | Sentosa | OneMap | Wellness-led resort |
| COMO Shambhala Spa, Bideford Road | Spa | open | Orchard | OneMap street | Building number not confirmed |
| Aramsa – The Garden Spa | Spa | open | Bishan-AMK Park | OneMap | Spa inside a park |
| Yunomori Onsen & Spa | Bathhouse | open | Kallang | OneMap | Japanese onsen baths in Kallang Wave Mall |
| House Longevity & Sauna Bath House | Recovery & longevity | new | Raffles Place | OneMap | Finnish sauna rituals, hyperbaric oxygen |
| Sama Wellness | Recovery & longevity | new | Evans Road | OneMap | Fitness, recovery and spa |
| House of Wellness | Spa | new | Tanjong Pagar | OneMap street | Four-hand face and body sessions |
| Future Resonance, New Bahru | Sound & mind | new | River Valley | OneMap | Sound-healing studio opened May 2026; named in STB's 2026 address |
| Hideaway Bathhouse, New Bahru | Bathhouse | open | River Valley | OneMap | Featured by Visit Singapore |
| g.spa | Spa | open | Geylang | OneMap | Open 24 hours |
| Sentosa Sensoryscape | Mindful nature | open | Sentosa | Approx | Sensory garden linking RWS and the beaches |
| Mandai Boardwalk | Mindful nature | new | Mandai | OneMap | Public nature boardwalk, opened 2025 |
| Southern Ridges & Henderson Waves | Mindful nature | open | Bukit Merah | OneMap | Ridge walk |
| MacRitchie TreeTop Walk | Mindful nature | open | Central Catchment | OneMap |  |
| Bukit Timah Nature Reserve | Mindful nature | open | Bukit Timah | OneMap |  |
| Jurong Lake Gardens | Mindful nature | open | Jurong Lake District | OneMap |  |
| Sungei Buloh Wetland Reserve | Mindful nature | open | Kranji | OneMap |  |
| Coney Island Park | Mindful nature | open | Punggol | OneMap |  |
| East Coast Park | Active outdoors | open | East Coast | OneMap | Cycling, beach |
| Kranji Countryside farms | Farm & food wellness | open | Kranji | OneMap | Pin at Bollywood Farms |

### Leisure Events · 28 places (festival magenta)

| Place | Type | Status | Area | Pin | Events attached / note |
| --- | --- | --- | --- | --- | --- |
| Marina Bay Street Circuit & F1 Pit Building | Event venue | open | Marina Bay | OneMap | F1 Singapore GP held 9–11 Oct 2026 (first Sprint weekend) |
| National Stadium, The Kallang | Event venue | open | Kallang | OneMap | BTS "Arirang" 17–22 Dec 2026; Jay Chou 8–10 Jan 2027 |
| Singapore Indoor Stadium | Event venue | open | Kallang | OneMap | PGL Major CS2 finals 10–13 Dec 2026; Westlife 16–17 Jan 2027 |
| OCBC Arena, The Kallang | Event venue | open | Kallang | OneMap | Singapore Tennis Open (WTA 500) held 21–27 Sep 2026 |
| New Kallang indoor arena | Event venue | planned | Kallang | Area point | Named in STB's Tourism 2040 update; site not published |
| Esplanade – Theatres on the Bay | Event venue | open | Marina Bay | OneMap |  |
| The Padang | Event venue | open | Civic District | Approx | F1 concert stage, national events |
| Bayfront Event Space | Event venue | open | Marina Bay | Approx | World Christmas Market (Dec) |
| IMBA Theatre, Gardens by the Bay | Event venue | new | Marina Bay | Area point | West Lawn beside Bayfront Plaza, 18 Marina Gardens Dr #01-23; opened 2026 |
| Marina Bay Sands expansion: 15,000-seat arena | Event venue | planned | Marina Bay | Area point | Under construction with a new hotel tower |
| Downtown MICE Hub | Event venue | planned | Straits View | Area point | Bid call expected 2027 |
| Sentosa Golf Club | Event venue | open | Sentosa | OneMap | HSBC Women's World Championship |
| Singapore EXPO | Event venue | open | Tampines | OneMap | HYROX, large fairs |
| Sands Expo & Convention Centre | Event venue | open | Marina Bay | OneMap | ART SG |
| Suntec Convention Centre | Event venue | open | Marina Centre | OneMap |  |
| Fort Canning Park | Event venue | open | Fort Canning | OneMap | Outdoor concerts and festivals |
| Capitol Theatre | Event venue | open | Civic District | OneMap |  |
| Victoria Theatre & Concert Hall | Event venue | open | Civic District | OneMap | Home of the Singapore Symphony Orchestra |
| Star Theatre | Event venue | open | Buona Vista | OneMap |  |
| Zouk Singapore | Event venue | open | Clarke Quay | Approx | Flagship club renovating ahead of its 35th anniversary |
| Siloso Beach | Event venue | open | Sentosa | OneMap | Beach festivals (ZoukOut) |
| NS Square (under construction) | Event venue | planned | Marina Bay | Approx | Replaces The Float@Marina Bay |
| Grange Road Events Venue by Live Nation | Event venue | planned | Orchard | Area point | Under construction; about 3,000 seats |
| Christmas on a Great Street, Orchard Road | Festive light-up | seasonal | Orchard | OneMap | Mid-Nov 2026 to early Jan 2027; pin at ION Orchard |
| Christmas Wonderland, Supertree Grove | Festive light-up | seasonal | Marina Bay | OneMap | Late Nov 2026 to 1 Jan 2027 (dates TBA) |
| Changi Festive Village, Terminal 3 | Festive light-up | seasonal | Changi Airport | OneMap | 7 Nov 2026 to early 2027, Pokémon theme |
| Deepavali Light-Up, Serangoon Road | Festive light-up | seasonal | Little India | OneMap | Deepavali 8 Nov 2026; pin at Little India Arcade |
| Marina Bay Singapore Countdown | Festival | seasonal | Marina Bay | OneMap | 31 Dec; pin at The Promontory |

### Attractions, Precincts & Destination Hotels · 72 places (heritage amber)

**Attractions (34)**

| Place | Status | Area | Pin | Note |
| --- | --- | --- | --- | --- |
| Gardens by the Bay | open | Marina Bay | OneMap |  |
| Wetlands by the Bay & teamLab museum | planned | Marina Bay | Area point | 5-ha Kingfisher Wetlands expansion; works from Q1 2027, opening from late 2028 |
| Marina Bay Sands SkyPark | open | Marina Bay | OneMap |  |
| ArtScience Museum | open | Marina Bay | OneMap |  |
| Singapore Flyer | open | Marina Centre | OneMap |  |
| Merlion Park | open | Marina Bay | OneMap |  |
| Marina Barrage | open | Marina South | OneMap |  |
| Universal Studios Singapore | open | Sentosa | OneMap | Minion Land Feb 2025; Super Nintendo World confirmed Jul 2026, no date |
| Singapore Oceanarium | new | Sentosa | OneMap | Opened 24 Jul 2025, replacing S.E.A. Aquarium |
| WEAVE, Resorts World Sentosa | new | Sentosa | OneMap | Lifestyle and dining concept opened 2025 |
| Adventure Cove Waterpark | open | Sentosa | OneMap |  |
| Skypark Sentosa by AJ Hackett | new | Sentosa | OneMap | Skyslides from 7 Jun 2026 |
| Singapore Cable Car, Faber Peak | open | Mount Faber | OneMap |  |
| Fort Siloso | open | Sentosa | OneMap |  |
| Palawan Beach | open | Sentosa | OneMap |  |
| Singapore Zoo | open | Mandai | OneMap |  |
| Night Safari | open | Mandai | OneMap |  |
| River Wonders | open | Mandai | OneMap |  |
| Bird Paradise | open | Mandai | OneMap |  |
| Rainforest Wild Adventure (West & East) | new | Mandai | OneMap | West opened Mar 2025; East 20 May 2026 |
| Exploria | new | Mandai | OneMap | Indoor nature attraction, opened 3 Mar 2026 |
| Curiosity Cove | new | Mandai | OneMap | Opened 21 Nov 2025 |
| Jewel Changi Airport | open | Changi | OneMap | Gundam Base opened 3 Feb 2026 |
| Porsche Experience Centre Singapore | planned | Changi | Area point | 9-ha driving and experience site; opens 2027 |
| National Gallery Singapore | open | Civic District | OneMap | Pop Art exhibition from Dec 2026 |
| National Museum of Singapore | open | Bras Basah | OneMap | History Gallery revamp due Oct 2026 |
| Asian Civilisations Museum | open | Civic District | OneMap |  |
| Malay Heritage Centre | new | Kampong Gelam | OneMap | Reopened 25 Apr 2026 after a 3-year revamp; 85 Sultan Gate |
| Buddha Tooth Relic Temple | open | Chinatown | OneMap |  |
| Singapore Botanic Gardens | open | Tanglin | OneMap | UNESCO site; also tagged Wellness |
| Haw Par Villa | open | Pasir Panjang | OneMap |  |
| New Bahru | new | River Valley | OneMap | Creative and lifestyle cluster; final phase opened May 2026 |
| Founders' Memorial (under construction) | planned | Bay East | Area point | Opens 2028 with Founders' Memorial MRT |
| Science Centre at Jurong Lake District | planned | Jurong Lake District | Area point | Slated for 2027 |

**Precincts (16), drawn as areas**

| Precinct | Status | Note |
| --- | --- | --- |
| Marina Bay | open |  |
| Orchard Road | open | Orchard Road Rejuvenation Initiative from mid-2026 |
| Civic District | open |  |
| Singapore River (Boat, Clarke, Robertson Quays) | open |  |
| Chinatown | open |  |
| Kampong Gelam | open | Already has an on-site mode in the app |
| Little India | open |  |
| Katong–Joo Chiat | open |  |
| Bras Basah–Bugis | open |  |
| Dempsey | open | STB–HSBC–Dempsey precinct partnership (2025) |
| Greater Sentosa (incl. Pulau Brani) | open | Greater Sentosa Master Plan unveiled 3 Jul 2026; Brani West attractions site |
| Mandai Wildlife Reserve | new | Grand opening 29 May 2026 |
| Jurong Lake District | open | STB tourism site in development |
| HarbourFront–Keppel (Greater Southern Waterfront) | open |  |
| Changi Village & East Coast | open |  |
| Changi East Urban District | planned | Planned lifestyle and business district by Changi Airport |

**Destination hotels (22)**

| Hotel | Status | Area | Pin | Note |
| --- | --- | --- | --- | --- |
| Marina Bay Sands | open | Marina Bay | Approx | Integrated resort; fourth tower under construction |
| Resorts World Sentosa | open | Sentosa | OneMap | Integrated resort |
| Raffles Hotel Singapore | open | Civic District | OneMap | National monument |
| Raffles Sentosa Singapore | new | Sentosa | OneMap | First all-villa resort, 62 villas, opened 1 Mar 2025; 4 Bukit Manis Road |
| Capella Singapore | open | Sentosa | OneMap |  |
| Mandai Rainforest Resort by Banyan Tree | new | Mandai | OneMap | Opened 26 Nov 2025 |
| The Laurus, a Luxury Collection Resort | new | Sentosa | Approx | All-suite, Oct 2025, on the former Hard Rock Hotel site |
| The Mora Singapore | verify | Labrador | OneMap | TUI's first Asian hotel, 20 rooms in Labrador Nature Reserve; due Sep 2026 |
| The Fullerton Hotel | open | Marina Bay | OneMap | National monument |
| The Fullerton Bay Hotel | open | Marina Bay | OneMap |  |
| Pan Pacific Orchard | open | Orchard | OneMap | Zero-waste hotel |
| Goodwood Park Hotel | open | Orchard | OneMap | Tower block is a national monument |
| Parkroyal Collection Pickering | open | Chinatown | OneMap | Garden hotel |
| The Singapore EDITION | open | Orchard | OneMap |  |
| Shangri-La Rasa Sentosa | open | Sentosa | OneMap |  |
| W Singapore – Sentosa Cove | open | Sentosa Cove | OneMap |  |
| Maxwell Reserve Singapore, Autograph Collection | open | Chinatown | OneMap | Formerly Six Senses Maxwell |
| Frasers House, a Luxury Collection Hotel | new | Bugis | OneMap | Formerly the InterContinental; reopened 7 Jan 2026 |
| Hotel Waterloo Singapore | new | Bras Basah | OneMap street | Accor Handwritten Collection, 502 rooms, opened 16 Jan 2026 |
| Varel Singapore | new | Selegie | OneMap street | Tribute Portfolio, 128 rooms, opened Apr 2026 |
| Mövenpick Singapore | planned | Tanjong Pagar | OneMap street | 808 keys, largest Mövenpick in Asia Pacific; Hoe Chiang Road; 2026–27 |
| NoMad Singapore at Faber House | planned | Orchard | OneMap | 18 storeys, 173 rooms at 230 Orchard Road; 2027 |

Sources for dates and statuses: [Mandai grand opening](https://cn.mandai.com/en/about-mandai/media-centre/A-decade-in-the-making-The-Mandai-Wildlife-Reserve-marks-Grand-Opening-as-Singapores-wildlife-and-nature-destination.html), [new attractions 2026–27](https://dmcquote.com/blog/post/singapore-new-attractions-2026-travel-agents), [Greater Sentosa Master Plan](https://www.sentosa.gov.sg/resources/sentosa-development-corporation-s-bold-vision-for-greater-sentosa--plans-for-new-icons--reimagined-beaches-and-game-changing-attractions-envisioned-to-redefine-how-singaporeans-play--relax--and-bond/), [new hotels](https://thesmartlocal.com/read/new-hotels-in-singapore/amp/), [Frasers House](https://www.meetings-conventions-asia.com/News/Hotels-and-Resorts/InterContinental-Singapore-makes-way-for-Frasers-House), [Therme Singapore](https://www.herworld.com/life/wellness/therme-singapore-wellness-park-2030), [new wellness venues](https://www.luxuo.com/?p=373460), [new HarbourFront terminal](https://www.travelweekly-asia.com/Cruise-Travel/Singapore-Cruise-Centre-gets-ready-for-its-new-home), [cruise infrastructure](https://www.pulse.bot/transportation/news/singapore-enhances-cruise-infrastructure-for-tourism-growth-83c8f7e3-923f-478e-b984-8f03379976dc/), [F1 2026](https://blog.wego.com/singapore-grand-prix/), [Tennis Open](https://www.thekallang.com.sg/en/things-to-do/events/singapore-tennis-open-2026.html), [Kallang events](https://heretoplay.thekallang.com.sg/events?page=2), [Christmas 2026](https://www.sassymamasg.com/sassy-mamas-guide-to-christmas-events-2014/).

Refinement sources: [STB Tourism 2040](https://www.stb.gov.sg/about-stb/what-we-do/tourism-2040/), its [factsheet](https://isomer-user-content.by.gov.sg/1/ecec4451-5f7f-499c-926a-8436fe27e976/STB%20Tourism%202040%20Factsheet,%202025.pdf), the [STB 2026 address](https://www.stb.gov.sg/about-stb/media-publications/speeches/speech-by-ms-melissa-ow--chief-executive--singapore-tourism-board--at-the-tourism-industry-conference-2026/), [Mandai grand opening](https://littlebigreddot.com/mandai-wildlife-reserve-grand-opening-rainforest-wild-adventure-east-2026/), [Malay Heritage Centre](https://www.timeout.com/singapore/news/malay-heritage-centre-reopens-april-25-with-revamped-galleries-and-a-9-day-festival-042426), [Wetlands by the Bay](https://www.timeout.com/singapore/news/gardens-by-the-bay-is-getting-a-teamlab-flagship-museum-and-major-wetlands-expansion-030426), [new hotels 2026–27](https://tophotel.news/?p=593983), and OneMap Search (onemap.gov.sg), run on 7 Nov 2026.

## Build plan, risks & open questions

The build runs in six phases after your sign-off. Data comes first, so every later screen draws from geocoded, verified records. No dates are set yet; the order and the gates are drawn below.

&#91;embedded content: build roadmap · 6 phases, 6 gates\]

Each phase starts only when the gate above it passes. Phase 1 is highlighted because every later phase depends on its data.

**Risks**

| Risk | Effect | Mitigation |
| --- | --- | --- |
| Dense clusters in Marina Bay and Sentosa | 40+ markers within 2 km make the map hard to read | Category-share cluster rings; precinct areas at mid zoom; list view |
| Event data goes stale | Past events still showing as live | Store end dates, auto-expire, weekly review flag |
| Approximate coordinates | 9 pins still approximate; 27 are area points | OneMap re-geocode, flag anything beyond 150 m (phase 1 gate) |
| Unconfirmed items | The Mora's opening, COMO's building number, and the site points for the MBS arena, the Grange Road venue and the MICE Hub | Marked "verify"; checked before launch |
| Copied venue text | Copyright exposure | Write our own one-line blurbs; link to the official page |
| Colour clash with the selection accent | Amber places look "selected" | Ink-ring selection state (see colour system) |

**Open questions (need your call before phase 1)**

- [ ] **4 or 5 categories?** I read "Attractions, Precincts and Destination Hotels" as one category, giving 4 as you said, with three sub-types. Should it be split into separate layers?
- [ ] **What happens to today's \~350 curated places and the Landmark / Culture / Food / Nature topics?** My recommendation: landmarks and culture fold into Attractions and their precincts, nature goes to Wellness, and food becomes a tag. Alternatives: keep them as a neutral grey base layer, or retire them.
- [ ] **Keep regions?** Recommended: keep as a filter, with collection progress per category.
- [ ] **Show planned places** such as Therme (2030) and Founders' Memorial? Recommended: yes, as faded "coming soon" markers.
- [ ] **How wide is "destination hotel"?** Only the 22 landmark and resort hotels listed here, or every licensed hotel from STB's hotel dataset (several hundred)?
- [ ] **Main audience:** visitors (cruise mode and pre/post-cruise days) or residents (Hunt and Passport)?
- [ ] **Keep the vintage parchment look?** The palette was checked against it.
