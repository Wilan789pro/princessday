# Princess Prism™

A cinematic, mobile-first (iPhone-first) Princess Day experience with a hidden second chapter: **Project 25**.

React + TypeScript + Vite + Framer Motion. Synthesised Web Audio, so there are no sound files.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173 (also on your LAN, so you can open it on a phone)
npm test           # dates, countdown, birthday gate, wish rules, wish endpoint, bouquet & certificate
npm run build      # typecheck + production build into dist/
```

## The story (stages in `src/App.tsx`)

| Act | Component | What happens |
|---|---|---|
| I | `IntroClock` | Live Mauritius clock. "Wait a minute…" Nothing moves until she taps **Begin**, which also unlocks audio. |
| II | `TimeRewind` | Clock freezes, hands spin backwards, calendar pages flip back, the tunnel recedes, it slows into **Wed 18 Nov 2026 00:00:00**, then a sapphire flash. |
| — | `Arrival` | 18 NOVEMBER 2026 · WEDNESDAY · PRINCESS DAY |
| III | `PrincessDay` | Crown crystals → compliment generator → royal decree (+ seal) → hidden glints → **The Garden of Wishes** → closing |
| IV | `OneMoreThing` | "Happy Princess Day. Fin." → darkness → pause → **One More Thing...** |
| V | `DateReveal` | 18 Nov ↔ 18 Dec · **THE UNIVERSE HAS GREAT TASTE.** |
| VI | `Project25` → `PrismClock` + `BirthdayChamber` | Live countdown, status ticker, sealed vault |
| VII | `BirthdayReveal` | Opens at 18.12.2026 00:00 Mauritius. Content comes from the server. |

On a later visit, the intro offers **Skip to Project 25** (after she has reached it once, or after the birthday).

## Editing content

| What | Where |
|---|---|
| Intro / rewind / One More Thing / dates text | `src/content/experience.ts` |
| Everything in Princess Day (crystals, compliments, decree, hidden glints, closing) | `src/content/princessDay.ts` |
| The Garden of Wishes (chapter titles, palette, ribbons, five secrets, wish texts, certificate wording) | `src/content/garden.ts` |
| Project 25 labels, status messages, chamber lines (public, nothing secret) | `src/content/birthday.ts` |
| Birthday content format (placeholder only, see below) | `server/birthday-content.json` |

## The Garden of Wishes (Chapter IV of Princess Day)

It sits where the photo gallery used to be (`src/components/Garden/`), between the royal decree and the closing.

| Chapter | Component | What happens |
|---|---|---|
| I · The First Bloom | `FirstBloom` | Tap **Plant the seed**: the seed falls, the stem grows, leaves unfold, a bud opens petal by petal, four more flowers bloom, the view pulls back to a tied bouquet. |
| II · The Grand Bouquet | `BouquetStudio`, `ColourPalette`, `BouquetSVG` | 6 flowers (rose, peony, daisy, lily, tulip, starflower), each with petals / centre / leaves / stem. Tap a colour, then tap parts to paint them; fill whole flower, undo, reset. Add up to 7 flowers, then move, resize, tilt, remove, choose a ribbon, **Gather the bouquet**, and **Download bouquet** (2000 × 2500 PNG). |
| III · Five Little Secrets | `FiveSecrets` | Radiance ★, Kindness 🦋, Elegance ☾, Mischief ♛, Unpredictable ◆. Each is linked to an existing crown crystal (it reuses that crystal's colour and gem shape) but has a new message. Finding all five forms a floral crown. Progress is kept for the browser session. |
| IV · A Wish Upon a Star | `WishUponAStar` | Catch the shooting star and write an optional wish (500 characters max). Money/wealth wishes get the playful reply and are never sent. |
| V · The Royal Seal | `RoyalCertificate` | The sapphire seal forms; pressing it reveals the **Certificate of Extraordinary Princesshood** (2480 × 3508 PNG, A4 at 300 DPI), stamped with *her* bouquet. **Save My Certificate** / **Return to My Kingdom** (scrolls to the closing). |

**Where things are kept:**
- The bouquet is stored only in this browser (`localStorage['prism:bouquet']`).
- Secret progress is kept for the session (`sessionStorage['prism:garden-secrets']`).
- PNGs are generated on the device: iPhone gets the share sheet ("Save Image"), and computers get a normal download.
- Nothing is uploaded.

### Wishes (`/api/wish`)
- **Dry-run by default.** With no email configured, the server validates a wish, then discards it. Nothing is emailed or saved, and the page says so honestly.
- **To enable delivery later,** set these **server** environment variables (see `.env.example`): `RESEND_API_KEY`, `WISH_TO_EMAIL`, `WISH_FROM_EMAIL`, and optionally `WISH_ALLOWED_ORIGINS`. Never prefix them with `VITE_`, and never commit a real `.env` (it is git-ignored).
- **Wish text is never stored, logged or shown back.** Email, when enabled, is plain text, exactly as she wrote it.
- **The wealth joke is detected in the browser *and* on the server** (`shared/wishRules.js`, English + French, accent-insensitive, whole words). A detected wish is never sent anywhere.
- **Abuse protection:** a honeypot field, a minimum compose time, a 2 KB body limit, and JSON only. Rate limits are 5 per hour per IP and 40 per day overall, but **in memory only, so best-effort**. On serverless hosting each instance has its own counter. Use the host's firewall or a shared store if strong limits are ever needed.

### Birthday content (server-protected)
> ⚠️ **The GitHub repository is public.** Anything committed, including `server/birthday-content.json` and `server/birthday-assets/`, is publicly readable, and stays in Git history even if deleted later. The committed file must stay the development placeholder (a test enforces `_placeholder: true`). Real birthday content needs a private source (for example a server environment variable or private storage), which has **not been set up yet**.

The content format:
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
Bare file names in `src` are served through `/api/birthday-asset`, and only after the unlock moment.

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
- `/?stage=princess` | `oneMore` | `dates`: jump straight to a scene. The Garden is inside `princess`, after the royal decree.

The virtual clock starts at `now` and ticks normally, and the dev API follows it. Production ignores both `now` and `stage`.

## Timezone note
The brief specified `Africa/Port_Louis`, but **that is not a valid IANA zone ID**: browsers and Node throw a `RangeError` for it. The correct ID for Mauritius is **`Indian/Mauritius`** (UTC+4, no DST), and that is what `src/utils/timezone.ts` uses, with a fixed +4h fallback. The UI still says "Port Louis".

## Accessibility & devices
- Sound toggle (top-right) is remembered. Audio starts only after a tap. On iOS it plays even with the silent switch on (`navigator.audioSession`).
- `prefers-reduced-motion`: shorter, stepped rewind; no tunnel, no spinning or floating. In the Garden it skips straight to the finished bouquet and crown.
- Particle counts scale down on low-power devices and pause when the tab is hidden.
- Safe-area insets for the iPhone notch and Dynamic Island, `dvh` units, 44px touch targets. Every Garden control is a real button with a label. The selected flower part is shown with a dashed outline, not just colour.

## Deploying

Nothing is deployed until you merge into `main` (GitHub Pages) or run a hosting command yourself.

### GitHub Pages (static hosting): https://wilan789pro.github.io/princessday/
- **Workflow:** `.github/workflows/deploy.yml` runs on every push to `main`, or manually. It runs `npm ci`, the type check, the tests, then `vite build --mode pages`, and deploys `dist/`. Its deploy job refuses to publish any branch other than `main`.
- **Base path:** `--mode pages` serves the site from `/princessday/`. Locally: `npm run build:pages`, then `npm run preview:pages` (no `/api` there either, like the real host).
- **Repository setting:** *Settings → Pages → Build and deployment → Source* must be **GitHub Actions**.

**GitHub Pages cannot run the `api/` functions,** so the `pages` build makes no API calls and says honestly what is unavailable:

| Feature | On GitHub Pages |
|---|---|
| Intro, rewind, Princess Day, crystals, compliments, decree, glints, closing, One More Thing, dates | ✅ works |
| Garden: bloom, bouquet studio + PNG, five secrets + crown, certificate + PNG, bouquet saved in the browser | ✅ works (all local) |
| Wish: the wealth joke and validation | ✅ works (local) |
| Wish delivery | ❌ no server. The page says delivery isn't switched on, and the wish is checked and discarded (nothing sent or saved) |
| Project 25 countdown and the chamber animation | ✅ works, using the **phone's** clock (no server time correction) |
| Birthday content in the 25th Chamber | ❌ no server to release it. After opening, the chamber says the transmission isn't available on this version of the site |

**Why the birthday content can't be secured on GitHub Pages:** everything published there (and everything in this public repository) can be read by anyone at any time. A date check in the browser only hides things visually: anyone can read the files or change their clock. So no private content is published at all.

**Safest ways to add it later** (not done; needs your approval):
1. Keep Pages for the site and add one small serverless endpoint for `/api/birthday` (for example a Cloudflare Worker, Vercel or Netlify function), with the content kept in that service's private settings. This needs a small change so the Pages build calls that endpoint's address.
2. Host the whole site where the existing `api/` functions run (`vercel.json` is already set up), with the content supplied privately, not committed.

### Vercel (with the API)
`vercel` from this folder deploys both the site and the `api/` functions (normal build, base `/`). Not used yet. Pages are marked `noindex`.
