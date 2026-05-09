// Strava OAuth helper worker for IronLog.
// Holds the client_secret and brokers token exchange / refresh / deauthorize.
// Activity reads/writes go straight from the browser to Strava (CORS-enabled).

interface Env {
  STRAVA_CLIENT_ID: string;
  STRAVA_CLIENT_SECRET: string;
  ALLOWED_ORIGINS: string; // comma-separated
}

interface StravaTokenResponse {
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete?: unknown;
}

const STRAVA_TOKEN_URL = 'https://www.strava.com/api/v3/oauth/token';
const STRAVA_DEAUTH_URL = 'https://www.strava.com/oauth/deauthorize';

function corsHeaders(origin: string | null, allowed: Set<string>): HeadersInit {
  const allow = origin && allowed.has(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(body: unknown, init: ResponseInit, cors: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...cors, ...(init.headers ?? {}) },
  });
}

async function exchangeCode(env: Env, code: string): Promise<StravaTokenResponse> {
  const params = new URLSearchParams({
    client_id: env.STRAVA_CLIENT_ID,
    client_secret: env.STRAVA_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
  });
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`strava ${res.status}: ${await res.text()}`);
  return res.json();
}

async function refreshToken(env: Env, refresh_token: string): Promise<StravaTokenResponse> {
  const params = new URLSearchParams({
    client_id: env.STRAVA_CLIENT_ID,
    client_secret: env.STRAVA_CLIENT_SECRET,
    refresh_token,
    grant_type: 'refresh_token',
  });
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`strava ${res.status}: ${await res.text()}`);
  return res.json();
}

async function deauthorize(access_token: string): Promise<void> {
  // Deauthorize uses the access_token as bearer; client_secret not required.
  const res = await fetch(STRAVA_DEAUTH_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${access_token}` },
  });
  if (!res.ok) throw new Error(`strava ${res.status}: ${await res.text()}`);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const allowed = new Set(env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean));
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin, allowed);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '');

    try {
      if (path === '/strava/exchange' && request.method === 'POST') {
        const { code } = await request.json<{ code?: string }>();
        if (!code) return json({ error: 'missing code' }, { status: 400 }, cors);
        const tokens = await exchangeCode(env, code);
        return json(tokens, { status: 200 }, cors);
      }

      if (path === '/strava/refresh' && request.method === 'POST') {
        const { refresh_token } = await request.json<{ refresh_token?: string }>();
        if (!refresh_token) return json({ error: 'missing refresh_token' }, { status: 400 }, cors);
        const tokens = await refreshToken(env, refresh_token);
        return json(tokens, { status: 200 }, cors);
      }

      if (path === '/strava/deauthorize' && request.method === 'POST') {
        const { access_token } = await request.json<{ access_token?: string }>();
        if (!access_token) return json({ error: 'missing access_token' }, { status: 400 }, cors);
        await deauthorize(access_token);
        return json({ ok: true }, { status: 200 }, cors);
      }

      if (path === '' || path === '/health') {
        return json({ ok: true, service: 'ironlog-strava' }, { status: 200 }, cors);
      }

      return json({ error: 'not found' }, { status: 404 }, cors);
    } catch (err) {
      return json({ error: String(err instanceof Error ? err.message : err) }, { status: 502 }, cors);
    }
  },
};
