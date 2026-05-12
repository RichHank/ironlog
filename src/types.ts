export type SetType = 'normal' | 'warmup' | 'drop' | 'failure';

export interface WorkoutSet {
  id: string;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  type: SetType;
  note?: string;
  completedAt: number;
}

export interface ExerciseLog {
  id: string;
  exerciseKey: string;
  name: string;
  sets: WorkoutSet[];
  notes?: string;
  supersetGroupId?: string;
}

export interface WorkoutSession {
  id: string;
  name?: string;
  startedAt: number;
  completedAt: number;
  duration?: number;
  exercises: ExerciseLog[];
  notes?: string;
  templateId?: string;
  stravaActivityId?: number;
}

export interface PlannedSet {
  id: string;
  weight: number | null;
  reps: number | null;
  type: SetType;
  restSeconds?: number;
}

export interface RoutineExercise {
  id: string;
  exerciseKey: string;
  name: string;
  notes?: string;
  plannedSets: PlannedSet[];
}

export interface Routine {
  id: string;
  name: string;
  notes?: string;
  exercises: RoutineExercise[];
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
}

export interface PersonalRecord {
  id: string;
  exerciseKey: string;
  exerciseName: string;
  type: 'max_weight' | 'max_reps' | 'max_volume' | 'est_1rm';
  value: number;
  unit: string;
  achievedAt: number;
  sessionId: string;
}

export interface BodyMeasurement {
  id: string;
  date: number;
  weight?: number;
  note?: string;
}

export type WeightUnit = 'lb' | 'kg';

export interface AppSettings {
  weightUnit: WeightUnit;
  restTimerDuration: number;
  soundEffectsVolume: number;   // 0-100, default 75
  soundEffectsMuted: boolean;
}