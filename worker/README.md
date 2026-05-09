# ironlog-strava worker

Cloudflare Worker that brokers Strava OAuth for IronLog. Holds the `client_secret` so the PWA can do token exchange/refresh without leaking it to the browser. Activity reads/writes go straight from the browser to Strava (CORS is enabled on Strava's API).

## One-time setup

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put STRAVA_CLIENT_SECRET   # paste the secret
npm run deploy
```

After deploy, copy the worker URL (e.g. `https://ironlog-strava.<account>.workers.dev`) and set it as `VITE_STRAVA_WORKER_URL` in the IronLog frontend (or hardcode in `src/strava.ts`).

## Strava app config (developers.strava.com/settings)

- **Authorization Callback Domain:** `richhank.github.io`
  (Localhost dev also works without changing this — Strava allows `localhost` automatically.)

## Endpoints

- `POST /strava/exchange` — body `{ code }`, returns `{ access_token, refresh_token, expires_at, athlete, ... }`
- `POST /strava/refresh` — body `{ refresh_token }`, returns new token bundle
- `POST /strava/deauthorize` — body `{ access_token }`, revokes app access

## Local dev

```bash
npm run dev   # starts on http://localhost:8787
```

Use `.dev.vars` for the secret locally:

```
STRAVA_CLIENT_SECRET=...your_secret...
```
