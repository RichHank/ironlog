import {
  WorkoutSession, ExerciseLog, WorkoutSet, Routine,
  PersonalRecord, BodyMeasurement, AppSettings,
} from './types';

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

function writeJSON(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

// ── Session ──
export function loadSession(): WorkoutSession | null {
  return readJSON<WorkoutSession | null>(SESSION_KEY, null);
}

export function saveSession(session: WorkoutSession): void {
  writeJSON(SESSION_KEY, session);
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
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

export function recalcPRs(sessions: WorkoutSession[]): PersonalRecord[] {
  const unit = loadSettings().weightUnit;
  const prs = new Map<string, PersonalRecord[]>();

  for (const session of sessions) {
    for (const ex of session.exercises) {
      const key = ex.exerciseKey;
      const existing = prs.get(key) ?? [];
      const all: PersonalRecord[] = [...existing];

      for (const set of ex.sets) {
        if (set.weight && set.weight > 0 && set.reps && set.reps > 0) {
          const e1rm = set.weight * (36 / (37 - Math.min(set.reps, 36)));
          all.push({
            id: generateId(), exerciseKey: key, exerciseName: ex.name,
            type: 'est_1rm', value: Math.round(e1rm), unit,
            achievedAt: set.completedAt, sessionId: session.id,
          });
          all.push({
            id: generateId(), exerciseKey: key, exerciseName: ex.name,
            type: 'max_weight', value: set.weight, unit,
            achievedAt: set.completedAt, sessionId: session.id,
          });
        }
        if (set.reps && set.reps > 0 && set.weight && set.weight > 0) {
          all.push({
            id: generateId(), exerciseKey: key, exerciseName: ex.name,
            type: 'max_reps', value: set.reps, unit: `at ${set.weight}${unit}`,
            achievedAt: set.completedAt, sessionId: session.id,
          });
        }
        if (set.weight && set.reps && set.weight > 0 && set.reps > 0) {
          all.push({
            id: generateId(), exerciseKey: key, exerciseName: ex.name,
            type: 'max_volume', value: set.weight * set.reps, unit,
            achievedAt: set.completedAt, sessionId: session.id,
          });
        }
      }
      prs.set(key, all);
    }
  }

  const best: PersonalRecord[] = [];
  for (const [, entries] of prs) {
    const types = ['max_weight', 'max_reps', 'max_volume', 'est_1rm'] as const;
    for (const t of types) {
      const typed = entries.filter(e => e.type === t);
      if (typed.length > 0) {
        best.push(typed.reduce((a, b) => a.value > b.value ? a : b));
      }
    }
  }
  savePRs(best);
  return best;
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
  [SESSION_KEY, HISTORY_KEY, ROUTINES_KEY, PRS_KEY, MEASUREMENTS_KEY].forEach(k =>
    localStorage.removeItem(k)
  );
}
