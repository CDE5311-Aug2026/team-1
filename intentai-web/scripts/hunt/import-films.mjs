#!/usr/bin/env node
// Imports the owner's Grok film packs (FindSG-GS-TA / KG-BA / CV-FXBR, unzipped) into Hunt:
//   node scripts/hunt/import-films.mjs <unzipped pack dir> [more dirs]
// Each pack holds <ROUTE>/manifest.json and its clips. Every clip is re-encoded for phones (540p, H.264, ~1 MB) with a
// poster, into public/hunt/films/<ROUTE>/, and listed in src/data/hunt/films.json (merged across runs).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '../..');
const outRoot = join(repo, 'public/hunt/films');
const indexFile = join(repo, 'src/data/hunt/films.json');
const index = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, 'utf8')) : {};

const manifests = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (name === '__MACOSX') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name === 'manifest.json') manifests.push(p);
  }
};
for (const dir of process.argv.slice(2)) walk(dir);
if (!manifests.length) throw new Error('No manifest.json found under the given folders.');

for (const file of manifests) {
  const dir = dirname(file);
  const pack = dir.split('/').pop();
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  const clips = Array.isArray(raw) ? raw : raw.clips; // some packs wrap the list with route notes
  // a clip may come in several versions: keep the selected one, else the highest
  const best = new Map();
  for (const c of clips) {
    const prev = best.get(c.clipId);
    if (!prev || c.selected || (!prev.selected && c.version > prev.version)) best.set(c.clipId, c);
  }
  mkdirSync(join(outRoot, pack), { recursive: true });
  for (const c of best.values()) {
    // some packs list a clip as <id>/<file> but ship it flat
    let src = join(dir, c.filename);
    if (!existsSync(src)) src = join(dir, c.filename.split('/').pop());
    if (!existsSync(src)) {
      console.warn(`skip ${c.clipId}: ${c.filename} missing`);
      continue;
    }
    const out = join(outRoot, pack, `${c.clipId}.mp4`);
    const poster = join(outRoot, pack, `${c.clipId}.webp`);
    if (!existsSync(out))
      execFileSync('ffmpeg', [
        '-v',
        'error',
        '-y',
        '-i',
        src,
        '-vf',
        'scale=-2:540',
        '-c:v',
        'libx264',
        '-preset',
        'slow',
        '-crf',
        '27',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        '-c:a',
        'aac',
        '-b:a',
        '80k',
        out,
      ]);
    if (!existsSync(poster))
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', '1.2', '-i', src, '-frames:v', '1', '-vf', 'scale=-2:360', '-quality', '72', poster]);
    const cap = c.captions || c.captionSuggestion || { zh: c.captionZh, en: c.captionEn };
    index[c.clipId] = {
      id: c.clipId,
      pack,
      request: c.playbackRequest,
      spoiler: c.spoilerLevel,
      zh: cap.zh ?? '',
      en: cap.en ?? '',
      seconds: Math.round(c.actualDurationSeconds * 10) / 10,
      src: `/hunt/films/${pack}/${c.clipId}.mp4`,
      poster: `/hunt/films/${pack}/${c.clipId}.webp`,
      fiction: c.historyStatus ?? '',
    };
    console.log(`${c.clipId}  ${c.playbackRequest}  ${cap.zh ?? ''}`);
  }
}
const sorted = Object.fromEntries(Object.entries(index).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(indexFile, JSON.stringify(sorted, null, 1) + '\n');
console.log(`${Object.keys(sorted).length} films in src/data/hunt/films.json`);
