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
    }[];
    notes?: string;
  }[];
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
};
