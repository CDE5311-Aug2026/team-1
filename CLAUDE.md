# FindSG / IntentAI: start here (for Claude and other agents)

Claude Code reads this file automatically. Other agents: read it first. Updated 3 Nov 2026.

## What this repo is

- `intentai-web/`: the FindSG web app (React 18, TypeScript, Vite 7, React Router 7, CSS Modules, Vitest, Playwright). Live at https://cde-5311.vercel.app.
- `intentai-web/api/` + `intentai-web/server/`: Vercel functions (usage tracking, admin stats, help, captions, photo check).
- `docs/`: product and handoff notes. `SinglishDaily*`, `web/`: older side projects; leave them alone unless asked.

| Remote | Repo | Use |
| --- | --- | --- |
| `team1` (or `origin`, if you cloned team-1) | https://github.com/CDE5311-Aug2026/team-1 | The team repo. This is a group project: no single owner. Contribute here by pull request. |
| `origin` (in Wsamme's clone) | https://github.com/Wsamme/CDE-5311 | Wsamme's own copy, one team member's mirror of the same branches. Not the team repo. |

Working branch: `merge/team1-v3` (PR #6 into `main` on team-1). Branch from it for new work and open your PR against it.

## Read next

1. [`docs/USER-STUDY.md`](docs/USER-STUDY.md): the earlier A/B user study (UI1 vs UI2). Its start screen, `/ui1`, `/test` and `/api/abtest` were removed in `redesign/v2`: the app opens only the current version.
2. [`docs/HANDOFF.md`](docs/HANDOFF.md): the app's features and history (written 29 Oct; numbers there may be out of date).
3. [`docs/MERGE-TEAM1-V3.md`](docs/MERGE-TEAM1-V3.md): why the code looks the way it does after merging Team 1's work.

## Set up and check

```bash
git clone https://github.com/CDE5311-Aug2026/team-1.git && cd team-1
git checkout merge/team1-v3
cd intentai-web && npm ci
npx vite --port 5181                      # dev server; /api works locally (answers kept in memory)
npx tsc -b                                # type check
NODE_OPTIONS=--no-experimental-webstorage npx vitest run   # unit tests, 896 pass
npm run build                             # production build
```

- Node 25 needs `NODE_OPTIONS=--no-experimental-webstorage` for Vitest; without it nearly every test fails with `localStorage.clear is not a function`.
- e2e: `npm run build && npx playwright test --grep-invert nearby3d`.
- Place data check: `npm run validate:explore`.
- Local admin password (dev server only, no Redis): `intentai-local`. The production password is not in the repo; ask the team member who set it in Vercel. Never write it into the repo, logs or chat.

## Deploying

A team member with access to the Vercel project deploys, from the repo root: `vercel deploy --prod --yes`, then `vercel inspect <url>` must show Ready and the alias cde-5311.vercel.app. Git pushes do not deploy. Open a PR, and agree in the team who deploys it.

## Rules

- **No invented data.** Every fact, date, opening hour and position needs a source, or leave it out. Label estimates.
- **No invented study results.** User-study answers come only from real participants. Agent dry runs use **Start a pilot** (codes T01, T02…), and must be called pilots.
- Do not use the Singapore Culture Atlas photos (no reuse licence).
- Design: story pages fit the screen without vertical scrolling. Oswald font for titles and buttons. Minimal and retro. Icon buttons have no text labels.
- Do not run Prettier over the codebase (it rewrites unrelated files).
- The app's text is English.
- Commit messages end with a `Co-Authored-By:` line naming the model that helped.
- Do not commit secrets (`.env*`), participant CSV exports, or real names. Testers use codes such as P01.

## Large files

Nothing needs external storage. The largest tracked file is 6.7 MB (`public/earth-online/sg/f1.html`), and the whole app (`public/` is 144 MB) is in git. There is no Google Drive folder for this project. If you add a file over 50 MB, put it on Google Drive instead, and link it here with what it is and where it goes.
