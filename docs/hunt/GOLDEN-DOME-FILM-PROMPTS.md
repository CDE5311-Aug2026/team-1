# Beneath the Golden Dome — film prompts

These prompts are for generating the four short films in the Golden Dome book. Each film is 2–3 clips of about 8 seconds. Until the new clips exist, the book plays the current `GS-xx` clips (see `SHORT_FILMS` in `intentai-web/src/pages/HuntPage/notebook/chapters.ts`).

| Film | When it plays | Book step |
| --- | --- | --- |
| 1. The story so far | After the player tears the field pass | `ticket` |
| 2. At the old press | After the player opens the shutters and takes the parcel | `shutter` |
| 3. To the next building | After the player picks the right place on the sketch | `deduce` |
| 4. Beneath the golden dome | After the player sets the glass in the band | `bottle` |

Film 3 must never name or show the second building clearly. The player has only just worked it out, and the film should feel like a walk, not a reveal.

## Shared settings (paste before every prompt)

> Cinematic live-action short, 16:9, 1080p, 8 seconds, 24 fps. Warm, slightly faded colour like 1950s Kodachrome for the past and soft natural daylight for the present. Shallow depth of field, gentle handheld camera, quiet. No on-screen text, no subtitles, no logos, no watermarks. No one speaks to camera. Real Kampong Gelam, Singapore: two-storey shophouses with louvred timber windows, five-foot ways, palm trees, the golden dome of a mosque glimpsed over rooftops.

## Characters (keep them identical across clips)

- **Ah Ning (present day):** Chinese Singaporean woman, early 30s, short black bob, round wire glasses, olive-green canvas jacket over a white T-shirt, canvas tote bag. She edits a small folded street paper. Curious and careful.
- **Yusof (1950s):** Malay man, about 40, neat short hair, thin moustache, cream short-sleeved shirt with rolled sleeves, ink on his fingertips, a pencil behind one ear. He is a typesetter at a print shop.
- **The press (1950s):** a narrow print shop at street level. Wooden type cases with many small drawers, a composing stick, a heavy cast-iron printing press, stacks of magazines, light through tall louvred windows under a round arch.

Keep the player off screen. Their hands may appear, but no face.

---

## Film 1 — The story so far

Suggested captions (the app adds these, not the video): *"Last week I bought an old type case." · "In the bottom drawer, a note." · "It starts at 101 Jalan Sultan."*

**1a — The type case**
> Present day, late afternoon. In a cluttered second-hand shop, Ah Ning kneels beside an old wooden printer's type case with dozens of tiny drawers. She pulls out the bottom drawer; it sticks, then gives. Dust drifts in a shaft of window light. Close on her face, glasses catching the light, as she sees something inside.

**1b — The note**
> Close-up of Ah Ning's hands unfolding a small, yellowed note written in pencil in neat old-fashioned handwriting (the words are not readable). Slow push-in. Behind her, out of focus, rows of metal letters glint in the drawers. She turns the note over and looks up, thinking.

**1c — The past answers**
> 1950s, the same note being written. Yusof stands at a wooden type case in a dim print shop, writing in pencil on a small slip of paper, then folding it and slipping it into the bottom drawer. Through a tall louvred window under a round arch, the street outside is bright. He glances toward the window as if he has decided something.

---

## Film 2 — At the old press

Plays right after the player has opened the shutters and found the parcel. Suggested captions: *"Yusof set the last line himself." · "No one printed it."*

**2a — Setting the line**
> 1950s print shop, evening, warm lamp light. Close-up of Yusof's ink-stained fingers picking small metal letters one by one from a type case and placing them, upside down and backwards, into a metal composing stick. Shallow focus on the letters. The rhythm is slow and practised.

**2b — Hiding the parcel**
> 1950s, night. Yusof wraps the composing stick, a small round disc of dark green glass and a narrow paper slip in brown paper and ties it with printer's string. He opens a tall louvred timber shutter under a round arch and tucks the parcel into the deep window ledge behind it, then closes the louvres. Rain on the street outside. He rests his hand on the shutter for a moment.

---

## Film 3 — To the next building

The player now knows where to go. Do not show the mosque clearly or say its name. Suggested caption: *"Beneath the gold…"*

**3a — The walk**
> Present day, golden hour. Following shot behind Ah Ning (never her face) walking down a five-foot way of colourful Kampong Gelam shophouses, holding a small brown-paper parcel. At the end of the street, out of focus and partly hidden by palm leaves, a hint of gold catches the sun. The camera tilts up with her gaze but cuts before the building is fully seen.

**3b — Hands and glass**
> Close-up of a hand holding a small disc of dark green bottle glass up against the evening sky. Light passes through it, glowing deep green. Out of focus behind it, a warm golden shape. Gentle lens flare.

---

## Film 4 — Beneath the golden dome

The ending, after the glass is set. Suggested captions: *"1928. The poorest gave bottles." · "Their glass became the band below the gold." · "Printed by the many."*

**4a — The giving (1928–1932)**
> Late 1920s, Kampong Gelam, bright morning. A line of ordinary people (a hawker, a mother with a child, an old man in a songkok, a young labourer) each place a used glass bottle into a large woven basket beside a wooden scaffold. Builders carry the basket away. Warm, faded, respectful. No faces in extreme close-up.

**4b — The band**
> Present day, exterior only, seen from the public street. Slow tilt up the face of Sultan Mosque, Singapore, from the street to the golden dome. The camera settles on the dark band at the base of the dome where it meets the building, made of the ends of glass bottles, catching the evening light. People pass on the street below. No interior of the prayer hall.

**4c — The line, printed**
> Present day. Ah Ning at a small table in a shophouse office lays a fresh copy of her folded street paper flat. Close-up on the back page: a single short line of small type at the bottom (not readable). She smiles slightly and pins the green glass disc beside it on a corkboard. Fade to warm white.

---

## Respect and accuracy

- Show Sultan Mosque only from the public street, with no one climbing, touching or entering. Do not show the prayer hall.
- Show no one tampering with the real windows at 101 Jalan Sultan in present-day shots; the hidden parcel happens only in the 1950s.
- The bottle donations in 1928–1932 are from the sources. That they were soy sauce bottles is oral tradition, so do not label the bottles.
- Ah Ning, Yusof, the note and the parcel are fiction (see `SHORT_EPISODE.distinction` in `intentai-web/src/findsg/app/short/short-content.js`).

## Dropping the clips in

1. Export each clip as `.mp4` (H.264, about 1080p) plus a `.jpg` poster frame.
2. Put them in `intentai-web/public/hunt/films/GD/` named `GD-1a.mp4`, `GD-1a.jpg`, and so on.
3. Add an entry per clip to `intentai-web/src/data/hunt/films.json` in the same shape as the `GS-xx` entries, with the English caption in `en`.
4. In `chapters.ts`, point `SHORT_FILMS.opening`, `found`, `passage` and `ending` at the new ids.
