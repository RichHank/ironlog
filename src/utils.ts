import { WorkoutSession } from './types';

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

export function est1RM(weight: number, reps: number): number {
  if (reps >= 36) return weight;
  return Math.round(weight * (36 / (37 - reps)));
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
  // Lazy import pattern — use the exerciseData map
  const map: Record<string, string[]> = {
    'barbell-bench': ['Chest', 'Triceps', 'Front Delts'],
    'dumbbell-bench': ['Chest', 'Triceps', 'Front Delts'],
    'incline-barbell-bench': ['Upper Chest', 'Triceps', 'Front Delts'],
    'incline-dumbbell-bench': ['Upper Chest', 'Triceps', 'Front Delts'],
    'decline-bench': ['Chest', 'Triceps'],
    'dumbbell-fly': ['Chest'],
    'cable-fly': ['Chest'],
    'pec-deck': ['Chest'],
    'chest-dip': ['Chest', 'Triceps'],
    'push-up': ['Chest', 'Triceps'],
    'smith-machine-bench': ['Chest', 'Triceps'],
    'chest-press-machine': ['Chest', 'Triceps'],
    'deadlift': ['Back', 'Glutes', 'Hamstrings'],
    'romanian-deadlift': ['Hamstrings', 'Back', 'Glutes'],
    'barbell-row': ['Back', 'Biceps'],
    'dumbbell-row': ['Back', 'Biceps'],
    'pull-up': ['Back', 'Biceps'],
    'chin-up': ['Back', 'Biceps'],
    'lat-pulldown': ['Back', 'Biceps'],
    'seated-cable-row': ['Back', 'Biceps'],
    't-bar-row': ['Back', 'Biceps'],
    'face-pull': ['Rear Delts'],
    'straight-arm-pulldown': ['Back'],
    'ohp': ['Shoulders', 'Triceps'],
    'dumbbell-ohp': ['Shoulders', 'Triceps'],
    'lateral-raise': ['Side Delts'],
    'front-raise': ['Front Delts'],
    'rear-delt-fly': ['Rear Delts'],
    'cable-lateral-raise': ['Side Delts'],
    'arnold-press': ['Shoulders', 'Triceps'],
    'shrug': ['Traps'],
    'upright-row': ['Shoulders', 'Traps'],
    'barbell-curl': ['Biceps'],
    'dumbbell-curl': ['Biceps'],
    'hammer-curl': ['Biceps'],
    'preacher-curl': ['Biceps'],
    'incline-curl': ['Biceps'],
    'cable-curl': ['Biceps'],
    'close-grip-bench': ['Triceps', 'Chest'],
    'tricep-pushdown': ['Triceps'],
    'overhead-tricep-ext': ['Triceps'],
    'skull-crusher': ['Triceps'],
    'tricep-dip': ['Triceps', 'Chest'],
    'diamond-pushup': ['Triceps', 'Chest'],
    'wrist-curl': ['Forearms'],
    'squat': ['Quads', 'Glutes', 'Hamstrings'],
    'front-squat': ['Quads', 'Glutes'],
    'bulgarian-split-squat': ['Quads', 'Glutes', 'Hamstrings'],
    'goblet-squat': ['Quads', 'Glutes'],
    'leg-press': ['Quads', 'Glutes', 'Hamstrings'],
    'hack-squat': ['Quads', 'Glutes'],
    'leg-extension': ['Quads'],
    'lying-leg-curl': ['Hamstrings'],
    'seated-leg-curl': ['Hamstrings'],
    'nordic-curl': ['Hamstrings', 'Glutes'],
    'hip-thrust': ['Glutes', 'Hamstrings'],
    'glute-bridge': ['Glutes'],
    'cable-kickback': ['Glutes'],
    'calf-raise': ['Calves'],
    'seated-calf-raise': ['Calves'],
    'lunge': ['Quads', 'Glutes', 'Hamstrings'],
    'step-up': ['Quads', 'Glutes'],
    'cable-crunch': ['Abs'],
    'hanging-leg-raise': ['Abs'],
    'plank': ['Abs'],
    'ab-wheel': ['Abs'],
    'russian-twist': ['Obliques'],
    'decline-crunch': ['Abs'],
    'woodchopper': ['Obliques'],
  };
  return map[key] ?? [];
}
