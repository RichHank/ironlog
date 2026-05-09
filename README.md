# IronLog

Vaporwave-themed Progressive Web App for tracking strength training workouts. Log sets, track progress, and analyze your training — with voice input, offline support, and Strava integration. Built for mobile (install to homescreen on iOS/Android).

## Features

- **Workout logging** — 90+ canonical exercises with muscle group and equipment metadata, plus custom exercises. Log sets with weight, reps, RPE, and set type (normal, warmup, drop, failure). Estimated 1RM calculated per set (Brzycki formula).
- **Voice input** — Speak your sets and the app parses them. 3-layer pipeline: intent classifier → rule-based parser → Cloudflare Worker AI fallback. Handles gym jargon, AMRAP, RPE, warmup notation, and more.
- **History & editing** — Browse past workouts grouped by date, view details, and edit sets retroactively.
- **Analytics** — Calendar heatmap, muscle group volume distribution, exercise volume trends, and personal records (max weight, max reps, max volume, est. 1RM) tracked per exercise.
- **Routine templates** — Save workout routines with planned sets and load them when starting a session.
- **Rest timer** — Preset and custom rest timers with pause/resume, persisted across page navigation. Haptic feedback on expiry.
- **FIT file sharing** — Export workouts as `.fit` files (Garmin binary format) via the native share sheet, with a download fallback.
- **Strava integration** — OAuth connect, auto-push completed workouts to Strava, and view recent Strava activities.
- **Body weight tracking** — Log body weight over time with a trend chart.
- **Plate calculator** — Calculate plates per side for a target barbell weight.
- **Export / Import** — JSON export of all data, CSV export of workout history, JSON import with merge.
- **Fully offline** — Service worker with cache-first shell and stale-while-revalidate assets. Dual persistence (localStorage + IndexedDB) guards against iOS storage eviction.
- **Vaporwave aesthetic** — Neon color palette, VT323 monospace font, CRT scanlines, retro grid background, procedurally generated chiptune background music, and an animated ASCII lifter mascot.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite 6 |
| Styling | Tailwind CSS 3.4 |
| Persistence | localStorage + IndexedDB (dual-write) |
| Voice | Web Speech API (SpeechRecognition) |
| Audio | Web Audio API (procedural music, chimes, speech synthesis) |
| Service Worker | Custom (no Workbox) |
| AI Parser Backend | Cloudflare Worker |
| Strava Backend | Cloudflare Worker |
| FIT Encoding | Custom binary encoder (Garmin SDK Profile 21.x subset) |

Zero runtime dependencies beyond React. Everything else — FIT encoding, voice processing, parsing, music synthesis, persistence, and the Strava OAuth client — is hand-rolled.

## Voice Parser Architecture

The voice input system uses a 3-layer pipeline:

1. **Intent Router** (`voiceCommands.ts`) — 14 rule-based matchers classify the utterance (log_set, add_exercise, finish_workout, undo_last, timer_control, etc.). First match wins.
2. **Jargon Normalization** (`voiceJargon.ts`) — 4-stage pipeline: phonetic ASR error correction → jargon expansion ("to failure" → "AMRAP", "@8" → "rpe 8") → filler word removal → Levenshtein fuzzy matching against gym vocabulary.
3. **Rule Parser** (`parser.ts`) — Splits compound input on conjunctions, detects exercises via alias matching, and extracts set data from many spoken patterns (weight × reps, "3 sets of 10 at 185", AMRAP, dumbbell notation, etc.).
4. **AI Fallback** (`aiParser.ts`) — If the local parser returns low confidence, the input is sent to a Cloudflare Worker running an LLM with the full exercise catalog and 18 parsing rules. Results are merged with any partial local parse.

## Project Structure

```
src/
  App.tsx                     Root component, session management, view routing
  types.ts                    Core TypeScript interfaces
  storage.ts                  localStorage + IndexedDB dual persistence
  exerciseData.ts             Canonical exercise catalog (90+ exercises)
  fit.ts                      FIT file encoder (Garmin binary format)
  share.ts                    Web Share API + FIT download fallback
  strava.ts                   Strava OAuth client, token refresh, activity push
  voice.ts                    SpeechRecognition wrapper with silence detection
  voiceCommands.ts            Intent classifier (rule-based)
  voiceJargon.ts              Spoken gym jargon normalization pipeline
  voiceFeedback.ts            Audio feedback (chimes, speech synthesis)
  parser.ts                   Local rule-based workout parser
  aiParser.ts                 AI parser with Cloudflare Worker fallback
  vaporSynth.ts               Procedural chiptune background music
  components/                 React components (views, forms, charts, timers)
  hooks/                      Custom hooks (timer, voice commands, wake lock, iOS PWA)
worker/                       Cloudflare Worker for Strava OAuth (deployed separately)
scripts/                      FIT encoder smoke test
public/                       Static assets, service worker, PWA manifest, Strava button
```

## Getting Started

```bash
npm install
npm run dev        # Vite dev server on http://localhost:5173
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_STRAVA_WORKER_URL` | `https://ironlog-strava.richhank.workers.dev` | Strava OAuth worker URL |

### Building for Production

```bash
npm run build      # tsc -b && vite build → dist/
npm run preview    # Preview the production build locally
```

### Strava Worker

The Strava OAuth flow uses a separate Cloudflare Worker to keep the `client_secret` off the client:

```bash
cd worker
npm install
npx wrangler secret put STRAVA_CLIENT_SECRET
npm run deploy
```

All other Strava logic (token refresh, activity upload, activity list) runs client-side.

### AI Parser Worker

The voice AI fallback calls a Cloudflare Worker at `deep-work-ai-parser.richhank.workers.dev` that accepts OpenAI-format chat messages and returns structured JSON. This worker is maintained separately.

## PWA

IronLog is a Progressive Web App targeting mobile install-to-homescreen:

- **Manifest** — `display: standalone`, portrait orientation, vaporwave theme color
- **Service Worker** — custom `sw.js` with cache-first shell strategy and build-ID-based cache invalidation
- **iOS** — apple-mobile-web-app-capable meta tags, splash screen markup, and an install prompt bottom sheet
- **Offline** — dual persistence to localStorage + IndexedDB guards against iOS storage eviction. Wake lock keeps the screen on during workouts (with a video fallback for older iOS).

## Deploy

Static files from `dist/` are deployed to GitHub Pages at `richhank.github.io`. The Vite config uses `base: './'` for subpath compatibility. Each build gets a unique ID injected into the service worker for cache busting.
