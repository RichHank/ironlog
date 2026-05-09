import {
  WorkoutSession, ExerciseLog, WorkoutSet, Routine,
  PersonalRecord, BodyMeasurement, AppSettings,
} from './types';
import { est1RM } from './utils';
import { idbSet, idbRemove, idbGetJSON } from './idb-storage';

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// ── Keys ──
const SESSION_KEY = 'il-current';
const HISTORY_KEY = 'il-history';
const ROUTINES_KEY = 'il-routines';
const PRS_KEY = 'il-prs';
const MEASUREMENTS_KEY = 'il-measurements';
const SETTINGS_KEY = 'il-settings';

// ── Generic helpers ──
function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch { return fallback; }
}

// Every writer mirrors to both stores: localStorage for synchronous reads on
// the next render, IDB for persistence across iOS's 7-day eviction. The IDB
// write is fire-and-forget — if it fails the localStorage copy still keeps
// the in-session experience consistent.
function writeJSON(key: string, value: unknown): void {
  const serialised = JSON.stringify(value);
  try { localStorage.setItem(key, serialised); } catch { /* quota */ }
  void idbSet(key, serialised);
}

function removeKey(key: string): void {
  try { localStorage.removeItem(key); } catch {}
  void idbRemove(key);
}

// ── Session ──
export function loadSession(): WorkoutSession | null {
  return readJSON<WorkoutSession | null>(SESSION_KEY, null);
}

export function saveSession(session: WorkoutSession): void {
  writeJSON(SESSION_KEY, session);
}

export function clearSession(): void {
  removeKey(SESSION_KEY);
}

// ── History ──
export function loadHistory(): WorkoutSession[] {
  return readJSON<WorkoutSession[]>(HISTORY_KEY, []);
}

export function saveHistory(sessions: WorkoutSession[]): void {
  writeJSON(HISTORY_KEY, sessions);
}

export function addWorkout(session: WorkoutSession): WorkoutSession[] {
  const history = loadHistory();
  history.unshift(session);
  saveHistory(history);
  return history;
}

export function deleteWorkout(sessionId: string): WorkoutSession[] {
  const history = loadHistory().filter(s => s.id !== sessionId);
  saveHistory(history);
  return history;
}

export function updateHistoryWorkout(session: WorkoutSession): WorkoutSession[] {
  const history = loadHistory().map(s => s.id === session.id ? session : s);
  saveHistory(history);
  return history;
}

// ── Routines ──
export function loadRoutines(): Routine[] {
  return readJSON<Routine[]>(ROUTINES_KEY, []).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveRoutines(routines: Routine[]): void {
  writeJSON(ROUTINES_KEY, routines);
}

export function upsertRoutine(routine: Routine): Routine[] {
  const routines = loadRoutines();
  const idx = routines.findIndex(r => r.id === routine.id);
  if (idx >= 0) routines[idx] = routine;
  else routines.unshift(routine);
  saveRoutines(routines);
  return routines;
}

export function deleteRoutine(id: string): Routine[] {
  const routines = loadRoutines().filter(r => r.id !== id);
  saveRoutines(routines);
  return routines;
}

// ── Personal Records ──
export function loadPRs(): PersonalRecord[] {
  return readJSON<PersonalRecord[]>(PRS_KEY, []);
}

function savePRs(prs: PersonalRecord[]): void {
  writeJSON(PRS_KEY, prs);
}

// PR ids are deterministic — exerciseKey + type — so identity stays stable
// across recalcs. Only `value` / `achievedAt` / `sessionId` change when a
// record is broken.
function prId(exerciseKey: string, type: PersonalRecord['type']): string {
  return `${exerciseKey}::${type}`;
}

type PRCandidate = {
  exerciseKey: string;
  exerciseName: string;
  weight: number;
  reps: number;
  completedAt: number;
  sessionId: string;
};

function collectCandidates(session: WorkoutSession): PRCandidate[] {
  const out: PRCandidate[] = [];
  for (const ex of session.exercises) {
    for (const set of ex.sets) {
      if (set.weight && set.weight > 0 && set.reps && set.reps > 0) {
        out.push({
          exerciseKey: ex.exerciseKey,
          exerciseName: ex.name,
          weight: set.weight,
          reps: set.reps,
          completedAt: set.completedAt,
          sessionId: session.id,
        });
      }
    }
  }
  return out;
}

function bestFromCandidates(candidates: PRCandidate[], unit: string): Map<string, PersonalRecord> {
  const best = new Map<string, PersonalRecord>();
  const consider = (rec: PersonalRecord) => {
    const existing = best.get(rec.id);
    if (!existing || rec.value > existing.value) best.set(rec.id, rec);
  };
  for (const c of candidates) {
    consider({
      id: prId(c.exerciseKey, 'max_weight'),
      exerciseKey: c.exerciseKey, exerciseName: c.exerciseName,
      type: 'max_weight', value: c.weight, unit,
      achievedAt: c.completedAt, sessionId: c.sessionId,
    });
    consider({
      id: prId(c.exerciseKey, 'max_reps'),
      exerciseKey: c.exerciseKey, exerciseName: c.exerciseName,
      type: 'max_reps', value: c.reps, unit: `at ${c.weight}${unit}`,
      achievedAt: c.completedAt, sessionId: c.sessionId,
    });
    consider({
      id: prId(c.exerciseKey, 'max_volume'),
      exerciseKey: c.exerciseKey, exerciseName: c.exerciseName,
      type: 'max_volume', value: c.weight * c.reps, unit,
      achievedAt: c.completedAt, sessionId: c.sessionId,
    });
    consider({
      id: prId(c.exerciseKey, 'est_1rm'),
      exerciseKey: c.exerciseKey, exerciseName: c.exerciseName,
      type: 'est_1rm', value: est1RM(c.weight, c.reps), unit,
      achievedAt: c.completedAt, sessionId: c.sessionId,
    });
  }
  return best;
}

// Full recalc — used on delete or in-place edit, where a previous PR may have
// disappeared and we have to re-walk every session to find the next-best.
export function recalcPRs(sessions: WorkoutSession[]): PersonalRecord[] {
  const unit = loadSettings().weightUnit;
  const all = sessions.flatMap(collectCandidates);
  const best = Array.from(bestFromCandidates(all, unit).values());
  savePRs(best);
  return best;
}

// Incremental — the common path after `addWorkout`. Compares only this
// session's candidates against the persisted bests and replaces them where
// beaten. O(sets-in-session) instead of O(total-sets-ever).
export function updatePRsAfterAdd(session: WorkoutSession): PersonalRecord[] {
  const unit = loadSettings().weightUnit;
  const current = loadPRs();
  const byId = new Map(current.map(p => [p.id, p]));
  const fromSession = bestFromCandidates(collectCandidates(session), unit);
  for (const [id, fresh] of fromSession) {
    const existing = byId.get(id);
    if (!existing || fresh.value > existing.value) byId.set(id, fresh);
  }
  const next = Array.from(byId.values());
  savePRs(next);
  return next;
}

export function getPRsForExercise(exerciseKey: string): PersonalRecord[] {
  return loadPRs().filter(p => p.exerciseKey === exerciseKey);
}

// ── Body Measurements ──
export function loadMeasurements(): BodyMeasurement[] {
  return readJSON<BodyMeasurement[]>(MEASUREMENTS_KEY, []).sort((a, b) => b.date - a.date);
}

export function saveMeasurements(measurements: BodyMeasurement[]): void {
  writeJSON(MEASUREMENTS_KEY, measurements);
}

export function addMeasurement(m: BodyMeasurement): BodyMeasurement[] {
  const all = loadMeasurements();
  all.unshift(m);
  saveMeasurements(all);
  return all;
}

// ── Settings ──
export function loadSettings(): AppSettings {
  return readJSON<AppSettings>(SETTINGS_KEY, { weightUnit: 'lb', restTimerDuration: 90 });
}

export function saveSettings(s: AppSettings): void {
  writeJSON(SETTINGS_KEY, s);
}

// ── Export / Import ──
export function exportAllJSON(): string {
  return JSON.stringify({
    history: loadHistory(),
    routines: loadRoutines(),
    prs: loadPRs(),
    measurements: loadMeasurements(),
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s = String(v);
  // Defang spreadsheet formulas before quote-wrapping; previous early return
  // skipped quote-wrapping for cells that started with =/+/-/@ AND contained
  // commas or newlines, producing invalid CSV.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportHistoryCSV(): string {
  const sessions = loadHistory();
  const rows = [['Date', 'Exercise', 'Set#', 'Weight', 'Reps', 'RPE', 'Type', 'Note', 'Session']];

  for (const session of sessions) {
    const date = new Date(session.startedAt).toLocaleDateString();
    for (const ex of session.exercises) {
      for (let i = 0; i < ex.sets.length; i++) {
        const set = ex.sets[i];
        rows.push([
          date, ex.name, String(i + 1),
          String(set.weight ?? 'BW'), String(set.reps ?? ''), String(set.rpe ?? ''),
          set.type, set.note ?? ex.notes ?? '',
          session.name ?? session.id,
        ]);
      }
    }
  }
  return rows.map(r => r.map(csvCell).join(',')).join('\n');
}

export function downloadFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function clearAllData(): void {
  [SESSION_KEY, HISTORY_KEY, ROUTINES_KEY, PRS_KEY, MEASUREMENTS_KEY].forEach(removeKey);
}

// One-shot hydration from IDB. Returns whatever IDB has for each app key so
// callers can adopt it as React state on mount — necessary because cold-start
// reads from localStorage will be empty after iOS evicts it, even though IDB
// still has the data.
export async function hydrateFromIDB(): Promise<{
  session: WorkoutSession | null;
  history: WorkoutSession[];
  routines: Routine[];
  prs: PersonalRecord[];
  measurements: BodyMeasurement[];
  settings: AppSettings;
}> {
  const [session, history, routines, prs, measurements, settings] = await Promise.all([
    idbGetJSON<WorkoutSession | null>(SESSION_KEY, null),
    idbGetJSON<WorkoutSession[]>(HISTORY_KEY, []),
    idbGetJSON<Routine[]>(ROUTINES_KEY, []),
    idbGetJSON<PersonalRecord[]>(PRS_KEY, []),
    idbGetJSON<BodyMeasurement[]>(MEASUREMENTS_KEY, []),
    idbGetJSON<AppSettings>(SETTINGS_KEY, { weightUnit: 'lb', restTimerDuration: 90 }),
  ]);
  return { session, history, routines, prs, measurements, settings };
}
