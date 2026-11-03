# React Bits components

From [React Bits](https://reactbits.dev) (github.com/DavidHDev/react-bits, `src/ts-default/`, fetched 29 Oct 2026),
used inside this app under the licence in `LICENSE.md` (MIT + Commons Clause: use in an app is allowed; the
components themselves may not be sold or redistributed on their own). They need `motion` (12.x).

| Component | Used for | Change from the original |
|---|---|---|
| `BlurText` | Ask home title, answer headings | `as` prop, so it can render a heading; with reduced motion (system or the app's setting, via `useReducedMotionConfig`) the text shows at once; its inner `MotionConfig` no longer overrides the app's |
| `CountUp` | key numbers in card answers | none |
| `ClickSpark` | spark when an answer is saved to Moments | `matchMedia` guarded (missing in some test environments) |
| `Magnet` | the send button | none |
| `BorderGlow` | Ask: the light that sweeps around a phrase reading when it appears | none (the caller passes `animated` only when motion is allowed) |
| `ShinyText` | Ask: the shimmer on "thinking" step labels | also stops for the app's Reduce motion setting (`html.reduce-motion`) |
| `CircularText` | Home card pages: the ring of text around the video poster's play button | `useReducedMotionConfig` (the ring stands still with reduced motion); no spin where `IntersectionObserver` is missing; `decorative` prop hides the ring from screen readers |

All motion components must use `useReducedMotionConfig()` (not `useReducedMotion()`), so the app's Reduce motion setting (`src/data/motion.ts`, `<MotionConfig>` in `App.tsx`) turns them off too.
