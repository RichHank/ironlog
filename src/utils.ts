import { WorkoutSession } from './types';
import { getExercise } from './exerciseData';

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function isBodyweightExercise(exerciseKey: string): boolean {
  return getExercise(exerciseKey)?.equipment === 'Bodyweight';
}

export function formatWeightCell(weight: number | null, exerciseKey: string): string {
  if (weight !== null) return String(weight);
  return isBodyweightExercise(exerciseKey) ? 'BW' : '—';
}

export function weightPlaceholder(exerciseKey: string, unit: string): string {
  return isBodyweightExercise(exerciseKey) ? 'BW' : unit;
}

// Brzycki 1RM estimate. The formula is reliable up to ~10–12 reps and
// produces nonsense beyond that (at 36 reps it returns 36×weight). Clamp the
// rep count so high-rep AMRAP sets still produce a believable upper bound.
const EST_1RM_REP_CAP = 12;
export function est1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  const r = Math.min(reps, EST_1RM_REP_CAP);
  return Math.round(weight * (36 / (37 - r)));
}

export function totalVolume(sessions: WorkoutSession[]): number {
  return sessions.reduce((sum, s) =>
    sum + s.exercises.reduce((es, ex) =>
      es + ex.sets.reduce((ss, set) =>
        ss + (set.weight ?? 0) * (set.reps ?? 0), 0
      ), 0
    ), 0
  );
}

export function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysAgo(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function groupByDate(sessions: WorkoutSession[]): Map<string, WorkoutSession[]> {
  const map = new Map<string, WorkoutSession[]>();
  for (const s of sessions) {
    const key = new Date(s.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const arr = map.get(key) ?? [];
    arr.push(s);
    map.set(key, arr);
  }
  return map;
}

export function getExerciseHistory(key: string, sessions: WorkoutSession[]): { date: number; sets: WorkoutSession['exercises'][0]['sets'] }[] {
  const result: { date: number; sets: WorkoutSession['exercises'][0]['sets'] }[] = [];
  for (const s of [...sessions].reverse()) {
    const ex = s.exercises.find(e => e.exerciseKey === key);
    if (ex && ex.sets.length > 0) {
      result.push({ date: s.startedAt, sets: ex.sets });
    }
  }
  return result;
}

export function getExerciseVolumeOverTime(key: string, sessions: WorkoutSession[]): { date: string; volume: number }[] {
  const byDate = new Map<string, number>();
  for (const s of sessions) {
    const date = new Date(s.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const ex = s.exercises.find(e => e.exerciseKey === key);
    if (ex) {
      const vol = ex.sets.reduce((sum, set) => sum + (set.weight ?? 0) * (set.reps ?? 0), 0);
      byDate.set(date, (byDate.get(date) ?? 0) + vol);
    }
  }
  return Array.from(byDate.entries()).map(([date, volume]) => ({ date, volume }));
}

export function muscleGroupVolume(sessions: WorkoutSession[]): Map<string, number> {
  const map = new Map<string, number>();
  // Simplified: count exercises per session toward muscle groups
  for (const s of sessions) {
    for (const ex of s.exercises) {
      const vol = ex.sets.reduce((sum, set) => sum + (set.weight ?? 0) * (set.reps ?? 0), 0);
      const key = ex.exerciseKey;
      // Heuristic mapping based on exerciseCatalog
      const groups = getMuscleGroupsForKey(key);
      for (const g of groups) {
        map.set(g, (map.get(g) ?? 0) + vol);
      }
    }
  }
  return map;
}

function getMuscleGroupsForKey(key: string): string[] {
  const ex = getExercise(key);
  if (!ex) return [];
  return [...new Set([...ex.primaryMuscles, ...ex.secondaryMuscles])];
}
