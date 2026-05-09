import { idbGet, idbSet, idbRemove } from './idb-storage';
import type { WorkoutSession } from './types';
import { formatWeightCell } from './utils';

// ── Config ──
export const STRAVA_CLIENT_ID = '237824';
export const STRAVA_SCOPES = 'activity:read_all,activity:write,profile:read_all';
export const STRAVA_WORKER_URL =
  (import.meta.env.VITE_STRAVA_WORKER_URL as string | undefined) ??
  'https://ironlog-strava.richhank.workers.dev';

const TOKENS_KEY = 'il-strava-tokens';
const STATE_KEY = 'il-strava-oauth-state';
const REFRESH_LEEWAY_SEC = 300; // refresh if expiring within 5 min

// ── Types ──
export interface StravaAthlete {
  id: number;
  firstname?: string;
  lastname?: string;
  profile?: string;
  username?: string;
}

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  athlete?: StravaAthlete;
  scope?: string;
}

export interface StravaActivitySummary {
  id: number;
  name: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  total_elevation_gain?: number;
  average_heartrate?: number;
  max_heartrate?: number;
}

// ── Token storage ──
export async function loadTokens(): Promise<StravaTokens | null> {
  const raw = await idbGet(TOKENS_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as StravaTokens; } catch { return null; }
}

export async function saveTokens(t: StravaTokens): Promise<void> {
  await idbSet(TOKENS_KEY, JSON.stringify(t));
}

export async function clearTokens(): Promise<void> {
  await idbRemove(TOKENS_KEY);
}

// ── OAuth flow ──
function redirectUri(): string {
  // Strava redirects back to wherever the app is loaded.
  // Use origin + pathname so subpath deploys (e.g. /ironlog/) work.
  return window.location.origin + window.location.pathname;
}

function randomState(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export function beginOAuth(): void {
  const state = randomState();
  sessionStorage.setItem(STATE_KEY, state);
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: STRAVA_SCOPES,
    approval_prompt: 'auto',
    state,
  });
  window.location.href = `https://www.strava.com/oauth/authorize?${params}`;
}

export interface OAuthCallback {
  code: string;
  state: string;
  scope: string;
}

export function readOAuthCallback(): OAuthCallback | null {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const scope = url.searchParams.get('scope') ?? '';
  if (!code || !state) return null;
  return { code, state, scope };
}

export function clearOAuthCallback(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  url.searchParams.delete('scope');
  url.searchParams.delete('error');
  window.history.replaceState({}, '', url.toString());
}

export async function completeOAuth(cb: OAuthCallback): Promise<StravaTokens> {
  const expected = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  if (!expected || expected !== cb.state) {
    throw new Error('OAuth state mismatch — aborting for safety');
  }
  const res = await fetch(`${STRAVA_WORKER_URL}/strava/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: cb.code }),
  });
  if (!res.ok) throw new Error(`exchange failed: ${res.status} ${await res.text()}`);
  const tokens = (await res.json()) as StravaTokens;
  tokens.scope = cb.scope;
  await saveTokens(tokens);
  return tokens;
}

export async function disconnect(): Promise<void> {
  const t = await loadTokens();
  if (t) {
    try {
      await fetch(`${STRAVA_WORKER_URL}/strava/deauthorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: t.access_token }),
      });
    } catch { /* still clear local tokens */ }
  }
  await clearTokens();
}

// ── Token refresh ──
async function refreshIfNeeded(t: StravaTokens): Promise<StravaTokens> {
  const now = Math.floor(Date.now() / 1000);
  if (t.expires_at - now > REFRESH_LEEWAY_SEC) return t;

  const res = await fetch(`${STRAVA_WORKER_URL}/strava/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: t.refresh_token }),
  });
  if (!res.ok) throw new Error(`refresh failed: ${res.status} ${await res.text()}`);
  const fresh = (await res.json()) as StravaTokens;
  // Strava preserves athlete/scope on refresh response (athlete is omitted; keep ours)
  const merged: StravaTokens = {
    ...fresh,
    athlete: fresh.athlete ?? t.athlete,
    scope: t.scope,
  };
  await saveTokens(merged);
  return merged;
}

export async function getValidTokens(): Promise<StravaTokens | null> {
  const t = await loadTokens();
  if (!t) return null;
  return refreshIfNeeded(t);
}

// ── Strava API client (browser → strava direct, CORS-enabled) ──
async function stravaFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const t = await getValidTokens();
  if (!t) throw new Error('not connected to Strava');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${t.access_token}`);
  return fetch(`https://www.strava.com/api/v3${path}`, { ...init, headers });
}

export async function listActivities(perPage = 30): Promise<StravaActivitySummary[]> {
  const res = await stravaFetch(`/athlete/activities?per_page=${perPage}`);
  if (!res.ok) throw new Error(`list activities ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Push workout to Strava ──
export interface PushedActivity {
  id: number;
}

function describeWorkout(session: WorkoutSession): string {
  const lines: string[] = [];
  for (const ex of session.exercises) {
    if (ex.sets.length === 0) continue;
    const sets = ex.sets.map(s => {
      const weight = s.weight != null ? formatWeightCell(s.weight, ex.exerciseKey) : 'BW';
      const reps = s.reps ?? '?';
      const rpe = s.rpe != null ? ` @${s.rpe}` : '';
      const tag = s.type === 'warmup' ? ' (warmup)' : s.type === 'drop' ? ' (drop)' : s.type === 'failure' ? ' (failure)' : '';
      return `${weight}×${reps}${rpe}${tag}`;
    }).join(', ');
    lines.push(`${ex.name}: ${sets}`);
    if (ex.notes) lines.push(`  ↳ ${ex.notes}`);
  }
  if (session.notes) lines.push('', session.notes);
  lines.push('', '— logged with IronLog');
  return lines.join('\n');
}

function workoutName(session: WorkoutSession): string {
  if (session.name) return session.name;
  const exerciseCount = session.exercises.filter(e => e.sets.length > 0).length;
  return exerciseCount > 0 ? `Lift — ${exerciseCount} exercises` : 'Lift';
}

function isoLocal(ts: number): string {
  // Strava expects start_date_local without timezone suffix.
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}Z`;
}

export async function pushWorkout(session: WorkoutSession): Promise<PushedActivity> {
  const elapsed = Math.max(60, Math.round((session.completedAt - session.startedAt) / 1000));
  const body = new URLSearchParams({
    name: workoutName(session),
    sport_type: 'WeightTraining',
    start_date_local: isoLocal(session.startedAt),
    elapsed_time: String(elapsed),
    description: describeWorkout(session),
  });
  const res = await stravaFetch('/activities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`push failed ${res.status}: ${await res.text()}`);
  const activity = (await res.json()) as { id: number };
  return { id: activity.id };
}
