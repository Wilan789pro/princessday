# Princess Prism™

A cinematic, mobile-first (iPhone-first) Princess Day experience with a hidden second chapter: **Project 25**.

React + TypeScript + Vite + Framer Motion. Synthesised Web Audio, so there are no sound files.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173 (also on your LAN, so you can open it on a phone)
npm test           # date/countdown/server-gate tests
npm run build      # typecheck + production build into dist/
```

## The story (stages in `src/App.tsx`)

| Act | Component | What happens |
|---|---|---|
| I | `IntroClock` | Live Mauritius clock. "Wait a minute…" Nothing moves until she taps **Begin**, which also unlocks audio. |
| II | `TimeRewind` | Clock freezes, hands spin backwards, calendar pages flip back, the tunnel recedes, it slows into **Wed 18 Nov 2026 00:00:00**, then a sapphire flash. |
| — | `Arrival` | 18 NOVEMBER 2026 · WEDNESDAY · PRINCESS DAY |
| III | `PrincessDay` | Crown crystals → compliment generator → royal decree (+ seal) → hidden glints → *The Little Moments* gallery → closing |
| IV | `OneMoreThing` | "Happy Princess Day. Fin." → darkness → pause → **One More Thing...** |
| V | `DateReveal` | 18 Nov ↔ 18 Dec · **THE UNIVERSE HAS GREAT TASTE.** |
| VI | `Project25` → `PrismClock` + `BirthdayChamber` | Live countdown, status ticker, sealed vault |
| VII | `BirthdayReveal` | Opens at 18.12.2026 00:00 Mauritius. Content comes from the server. |

On a later visit, the intro offers **Skip to Project 25** (after she has reached it once, or after the birthday).

## Editing content

| What | Where |
|---|---|
| Intro / rewind / One More Thing / dates text | `src/content/experience.ts` |
| Everything in Princess Day (crystals, compliments, decree, secrets, captions, closing) | `src/content/princessDay.ts` |
| Project 25 labels, status messages, chamber lines (public, nothing secret) | `src/content/birthday.ts` |
| **The real birthday message** (private) | `server/birthday-content.json` |
| Private birthday photos / audio / video | `server/birthday-assets/` |

### Photos (The Little Moments)
1. Put files in `public/photos/` (JPEG/WebP, long edge ~1600px).
2. In `src/content/princessDay.ts` set `src: '/photos/01.jpg'`, plus `alt` and `caption`.
3. Any number from 1 to 6 works. While a `src` is empty, dev builds show a placeholder frame. Production builds hide the whole section if no photo has a `src`.

### Birthday content (server-protected)
Edit `server/birthday-content.json`:
```json
{
  "_placeholder": false,
  "eyebrow": "Transmission received",
  "headline": "…",
  "blocks": [
    { "type": "text", "text": "…" },
    { "type": "heading", "text": "…" },
    { "type": "image", "src": "us.jpg", "caption": "…" },
    { "type": "video", "src": "clip.mp4" },
    { "type": "audio", "src": "voice.m4a" }
  ],
  "signature": "…"
}
```
Bare file names in `src` are served from `server/birthday-assets/` through `/api/birthday-asset`, and only after the unlock moment.

## Why the birthday stays secret

- Nothing in `server/` is imported by the frontend, so it never reaches the JS bundle (verified with a grep of `dist/`).
- `/api/birthday` checks the **server's** clock. Before `2026-12-18T00:00:00+04:00` it returns `403 {status:"locked"}` with no content.
- In production the `?now=` test override is ignored. Only `vite dev` honours it.
- **This needs a host that runs the `api/` functions** (Vercel is configured in `vercel.json`). On purely static hosting (GitHub Pages and similar) the API doesn't exist: the chamber still opens visually, but shows "transmission could not be reached" and no content leaks.

## Testing the unlock (without touching the real date)

In `npm run dev`, use the **TEST** button (bottom-left, dev only) or URLs like:

- `/?stage=project25&now=2026-12-17T23:59:50%2B04:00`: watch the countdown hit zero and the chamber open live.
- `/?stage=project25&now=2026-12-19T09:00:00%2B04:00`: a visitor arriving after the birthday ("Open the chamber").
- `/?now=2026-11-22T21:30:00%2B04:00`: the intro on 22 Nov ("four days ago").
- `/?stage=princess` | `oneMore` | `dates`: jump straight to a scene.

The virtual clock starts at `now` and ticks normally, and the dev API follows it. Production ignores both `now` and `stage`.

## Timezone note
The brief specified `Africa/Port_Louis`, but **that is not a valid IANA zone ID**: browsers and Node throw a `RangeError` for it. The correct ID for Mauritius is **`Indian/Mauritius`** (UTC+4, no DST), and that is what `src/utils/timezone.ts` uses, with a fixed +4h fallback. The UI still says "Port Louis".

## Accessibility & devices
- Sound toggle (top-right) is remembered. Audio starts only after a tap. On iOS it plays even with the silent switch on (`navigator.audioSession`).
- `prefers-reduced-motion`: shorter, stepped rewind; no tunnel, no spinning or floating.
- Particle counts scale down on low-power devices and pause when the tab is hidden.
- Safe-area insets for the iPhone notch and Dynamic Island, `dvh` units, 44px touch targets, keyboard-navigable lightbox (←/→/Esc).

## Deploying
Not deployed. When approved, `vercel` from this folder deploys both the site and the `api/` functions. Pages are marked `noindex`.
