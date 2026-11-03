# IntentAI → Discovery app: redesign summary (31 Oct 2026)

From the owner's brief of 31 Oct. Hunt (the treasure hunt) is out of scope here; it will be specified separately.
根据 31 日 owner 的需求整理。Hunt（寻宝游戏）方案另行讨论，本文不展开。

## 1. Direction / 方向

- IntentAI becomes a **discovery app for exploring Singapore and learning its culture through places**. The map is the centre.
  App 改为以地图为核心的**探索 + 文化学习**应用。
- **Removed:** the old culture content (Today culture cards, articles, Singlish expressions), About us, Community, **Ask**, and Team 1's story-card format.
  **移除**：旧版 culture 内容、About us、Community、**Ask**，以及 Team 1 的故事卡形式。
- **Kept:** single places such as the Berlin Wall Fragments stay. They can be grouped into collections, but each one sits in its planning area.
  **保留**：柏林墙这类单点不删，可以组合，但必须放在正确的地理层级里。
- **Bottom tabs (4):** Home · Moments · Hunt · Mine (Profile).
  **底部 Tab（4 个）**：Home · Moments · Hunt · Mine。

## 2. Home layout / 首页布局

Top to bottom / 从上到下：

| Layer | What it shows |
| --- | --- |
| Header | App header. |
| Festival & Event row | A row of event cards under the header. It follows the selected area and the current month. 节日/活动卡片组，随所选区域和月份变化。 |
| Map (most of the screen) | Singapore map. Grey = not unlocked; blue + pin = visited/unlocked. Zooms to the selected card's area; other areas dim. 地图占主要面积；灰色未解锁，蓝色+Pin 已解锁；随卡片缩放，其他区域变暗。 |
| Card deck (above the tab bar) | Horizontally swipeable cards (like the Chinatown carousel), in an **Apple Music–style drawer**: swipe up to expand into the full detail page. 可横滑的卡组，抽屉式，可上拉展开。 |
| Tab bar | Home · Moments · Hunt · Mine |

## 3. Area levels / 区域层级

**Level 1 — Region (大区)** → **Level 2 — Planning area (小区)** → **Level 3 — Place (地点)**

- Swipe region cards; tap one to get that region's area cards; tap an area to get its place cards. The deck keeps its level; a back step returns one level.
  横滑大区卡 → 点进得到小区卡组 → 再点进得到地点卡组；卡组保持层级，可逐级返回。
- **Unlock rule (decided):** an area's progress = its landmarks and fun places that you have checked in, out of all of them. An area is **unlocked only when every one is checked in**. A region's progress adds up its areas.
  **解锁规则（已定）**：区域进度＝已打卡的 landmark 和好玩地点 / 该区域全部此类地点；**全部打卡才算解锁**；大区进度由所含小区累加。
- **Stamps:** each unlocked area (and its places) gives a stamp that can be opened and viewed.
  **印章**：解锁的区域和地点都有章，可以查看。
- **Each card shows progress:** a bar for the current card, a ✓ when complete.
  **每张卡显示进度**：进度条，完全解锁打勾。
- **Status dots** on the small cards: 🟢 all checked in (unlocked) · 🟡 some checked in · 🔴 none checked in.
  **缩略卡状态点**：绿＝全部去过，黄＝探索中，红＝未去过。
- **Animation is a priority:** card swipe ↔ map zoom ↔ highlight/dim must move together smoothly.
  **动画是重点**：卡片滑动、地图缩放、高亮变暗要同步流畅。

"Strictly administrative" means URA's official levels: **5 regions → 55 planning areas** (Master Plan 2019).
"严格按行政层级"＝URA 官方划分：**5 大区 → 55 个规划区**。

- Note: Bukit Timah and Queenstown are planning areas in URA's **Central** region, not the West. Holland Village is a neighbourhood, not a planning area, so it would be a place (or a group of places) inside its planning area.
  注意：按 URA，Bukit Timah、Queenstown 属于**中部**，不是西部；Holland Village 是街区而不是规划区，应作为规划区里的地点（或地点组）。

## 4. Festival & Event cards / 节日活动卡

- They pop up for events in Singapore near the selected area and in season. Example: Marina Bay in October → the Singapore Grand Prix.
  与所选区域、当前月份联动，例如 10 月滑到 Marina Bay → 新加坡 F1 大奖赛。
- Each event needs dates, place and an official source. Dates change each year, so the list is per year, with a "check before you go" note.
  每个活动需要日期、地点和官方来源；日期每年不同，按年维护。

## 5. Place detail / 地点详情页

Opened from a place card. The deck below stays at its level. 从地点卡打开，下方卡组层级不变。

- **Types:** Landmark · Food · Heritage. 按 Landmark / Food / 历史遗迹分类。
- **Ordering:** places are ranked by the user's interests (onboarding topics, what they open and check in). 按用户偏好智能排序。
- **Top:** a story card with the intro (the place-card template we already have). 顶部卡片式介绍。
- **Top right — camera:**
  **右上角拍照**：
  - AI recognises the place in the photo and checks you in. AI 识别地点并打卡。
  - With several photos, it makes a 3×3 grid image. 多张照片生成九宫格。
  - It writes a caption and tags for social posts, using the place, date and weather. 结合地点、天气生成朋友圈文案和 Tag。
- **Middle:** the 3D landmark view (EARTH ONLINE). 中间接入 3D Landmark。
- **Bottom:** Check-in button; green mark once checked in. 底部打卡，已打卡显示绿色。

## 6. Routes and Editor's Pick / 路线与编辑精选

- **Checklist → route:** tick places in the deck → add them to a checklist → auto-plan a route → export it.
  卡组勾选 → 收藏/Checklist → 自动生成路线 → 导出。
- **In-app view first:** the route shows in the app as our routes do now: numbered stops on the map, rough total time, time per stop.
  **首先在 App 内展示**：和现有路线一样，地图上编号站点、大致总用时、每站用时。
- **Export (decided):** a Google Maps directions link that opens in Google Maps navigation. Google Maps links take only a few stops, so long routes are split into legs. A KML file for Google My Maps is an optional extra.
  **导出（已定）**：生成 Google Maps 导航链接，直接在 Google 地图中打开；站点多时分段。可另附 KML 导入 Google My Maps。
- **Route intros to redo:** every combined route gets a reviewed intro with transport between stops (MRT, bus, walk), tips (best time, closures, what to bring) and sources.
  **路线介绍要重写**：每条组合路线补交通（MRT/公交/步行）、建议（时段、休息日、注意事项）和来源。
- **Editor's Pick:** themed collections and routes beside the area view, for example Chinese or American restaurants, hidden spots, wedding-photo locations, or a story walk following a Singapore figure's life.
  **编辑精选**：按主题的合辑与路线，如中餐/美式餐厅、小众打卡地、婚纱取景地、名人生平故事线。

## 7. What we can reuse / 已有可复用

| Need | Already in the app | Gap |
| --- | --- | --- |
| Map | Our Singapore map (`CityMap`), clusters, OneMap street detail, 2D↔3D | **No area boundaries**: 21 hand-made areas with centre points only. Need URA boundary shapes for grey/blue fill. |
| Swipe deck | Team 1's Home carousel (`PlaceCarousel`), with iPhone memory limits | Three levels, drawer expand, linked map zoom |
| Places | 304 sourced places (landmark 119, food 90, nature 50, culture 45) | Re-tag to Landmark / Food / Heritage; spread is uneven (208 in Central) |
| Check-in | Save / Check in in Nearby, Moments stamps | Area progress and status dots from check-ins |
| Place detail | Place card template (`PlaceStoryCard`), 3D view, Order like a local | Camera features; Team 1's story-card format is dropped |
| Photo recognition | Moments "Snap & recognise" (demo flow) | A real recognition model, 3×3 grid, caption, weather |
| Routes | 3 story walks, 5 atlas routes, MRT route engine | Route from a checklist; export |
| Collections | 5 sourced lists (sg-100, MICHELIN hawkers…) | Editor's Pick themes and their research |
| Events | One fixed demo holiday card | A sourced event list by date and area |
| Personal ranking | Onboarding topics, `ranking.ts` | Use them on Home's place order |

## 8. Data and services needed / 需要的数据与服务

- **URA Master Plan 2019 region and planning-area boundaries** (data.gov.sg, Singapore Open Data Licence), simplified for phones.
  URA 2019 大区/规划区边界（data.gov.sg 开放数据），需简化。
- **Events:** official pages per event (e.g. the Grand Prix's own site, Singapore Tourism Board's event listings), with dates.
  活动：每个活动的官方页面和日期。
- **Weather:** NEA real-time weather on data.gov.sg (for captions).
  天气：data.gov.sg 的 NEA 实时天气。
- **AI:** an image model for place recognition, and a language model for captions. Photos leave the phone, so this needs consent and a privacy note.
  AI：识图模型和文案模型；照片会上传，需要用户同意和隐私说明。
- **Editor's Pick research:** every theme needs sourced places, e.g. a figure's life story with dated sources.
  编辑精选需逐条研究并有来源。

## 9. Owner decisions (31 Oct) / 已确认

| # | Topic | Decision |
| --- | --- | --- |
| 1 | Ask | **Removed.** 去掉。 |
| 2 | Team 1 story cards | **Format dropped** (it lacks a clear logic; the course teacher agreed). Single places like the Berlin Wall stay and can be combined into groups, always within the URA hierarchy. 故事卡形式去掉；单点保留，可组合，但要守地理层级。 |
| 3 | Unlock rule | Count an area's landmarks and fun places; **unlocked only when all are checked in**. Unlocked areas and places give stamps you can view. 按区域内 landmark 和好玩地点计数，全部打卡才解锁；解锁有章可查看。 |
| 4 | Moments | **Change little for now.** Make it the user's **personal travel journal**: check-ins and journal entries. Add other things only when asked. 先少改，做成个人游记：打卡 + 游记。 |
| 5 | Route export | Any format that **imports into Google Maps navigation** (we use a Google Maps directions link). The in-app view with rough times matters most. Redo combined-route intros with transport and tips. 能导入 Google 导航即可；重点是 App 内展示和大致用时；组合介绍重写，补交通和建议。 |
| 6 | Area standard | **URA**: 5 regions → 55 planning areas (Master Plan 2019), replacing our 21 areas. 采用 URA。 |
| 7 | Branch and sync | **Don't sync with Team 1 and don't push for now.** Work locally on the latest version in `~/Documents/GitHub/CDE-5311-team1`. 暂不同步、不上传，用本地最新版开发。 |

Still open: which places count as "fun places" for unlocking (proposal: every published landmark, heritage and food place in the area, with nature counted as landmark).
仍待定："好玩地点"包含哪些（建议：区域内所有已发布的 landmark、历史遗迹、美食地点，自然景点算 landmark）。

## 10. Suggested order / 建议顺序

1. Tabs and removals (Ask, Community, About us, old culture, story-card format). Tab 调整与移除。
2. URA boundaries and the region → area → place deck with map zoom and animation. 边界数据 + 三级卡组 + 地图联动动画。
3. Check-in progress: colours, dots, ✓, stamps. 打卡进度、颜色、状态点、印章。
4. Place detail drawer with 3D and Check-in. 详情抽屉 + 3D + 打卡。
5. Events row. 活动卡。
6. Checklist → route (in-app view, times) → Google Maps export; rewrite route intros; Editor's Pick. 路线、导出、介绍重写与精选。
7. Camera: recognition, grid, caption. 拍照识别、九宫格、文案。
8. Hunt (separate spec). Hunt 另议。
