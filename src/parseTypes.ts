export interface SetData {
  weight: number | null;
  reps: number | null;
  isWarmup?: boolean;
  isDropSet?: boolean;
  isAMRAP?: boolean;
  isBodyweight?: boolean;
  failed?: boolean;
  rpe?: number | null;
}

export type ParseResult = {
  exercises: {
    name: string;
    sets: {
      weight: number | null;
      reps: number | null;
      rpe?: number | null;
      note?: string;
      type?: 'normal' | 'warmup' | 'drop' | 'failure';
      restSeconds?: number;
      isWarmup?: boolean;
      isDropSet?: boolean;
      isAMRAP?: boolean;
      isBodyweight?: boolean;
      failed?: boolean;
    }[];
    notes?: string;
  }[];
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
  needsConfirmation?: boolean;
};
