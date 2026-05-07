export interface ExerciseDef {
  key: string;
  name: string;
  category: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string;
}

export const EXERCISE_CATEGORIES = [
  'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Full Body',
] as const;

export const EXERCISES: ExerciseDef[] = [
  // ── Chest ──
  { key: 'barbell-bench', name: 'Barbell Bench Press', category: 'Chest', primaryMuscles: ['Chest'], secondaryMuscles: ['Triceps', 'Front Delts'], equipment: 'Barbell' },
  { key: 'dumbbell-bench', name: 'Dumbbell Bench Press', category: 'Chest', primaryMuscles: ['Chest'], secondaryMuscles: ['Triceps', 'Front Delts'], equipment: 'Dumbbell' },
  { key: 'incline-barbell-bench', name: 'Incline Barbell Bench', category: 'Chest', primaryMuscles: ['Upper Chest'], secondaryMuscles: ['Triceps', 'Front Delts'], equipment: 'Barbell' },
  { key: 'incline-dumbbell-bench', name: 'Incline Dumbbell Bench', category: 'Chest', primaryMuscles: ['Upper Chest'], secondaryMuscles: ['Triceps', 'Front Delts'], equipment: 'Dumbbell' },
  { key: 'decline-bench', name: 'Decline Bench Press', category: 'Chest', primaryMuscles: ['Lower Chest'], secondaryMuscles: ['Triceps', 'Front Delts'], equipment: 'Barbell' },
  { key: 'dumbbell-fly', name: 'Dumbbell Fly', category: 'Chest', primaryMuscles: ['Chest'], secondaryMuscles: ['Front Delts'], equipment: 'Dumbbell' },
  { key: 'cable-fly', name: 'Cable Fly', category: 'Chest', primaryMuscles: ['Chest'], secondaryMuscles: ['Front Delts'], equipment: 'Cable' },
  { key: 'pec-deck', name: 'Pec Deck Fly', category: 'Chest', primaryMuscles: ['Chest'], secondaryMuscles: ['Front Delts'], equipment: 'Machine' },
  { key: 'chest-dip', name: 'Chest Dip', category: 'Chest', primaryMuscles: ['Lower Chest'], secondaryMuscles: ['Triceps', 'Front Delts'], equipment: 'Bodyweight' },
  { key: 'push-up', name: 'Push Up', category: 'Chest', primaryMuscles: ['Chest'], secondaryMuscles: ['Triceps', 'Front Delts', 'Core'], equipment: 'Bodyweight' },
  { key: 'smith-machine-bench', name: 'Smith Machine Bench', category: 'Chest', primaryMuscles: ['Chest'], secondaryMuscles: ['Triceps'], equipment: 'Machine' },
  { key: 'chest-press-machine', name: 'Chest Press Machine', category: 'Chest', primaryMuscles: ['Chest'], secondaryMuscles: ['Triceps', 'Front Delts'], equipment: 'Machine' },

  // ── Back ──
  { key: 'deadlift', name: 'Deadlift', category: 'Back', primaryMuscles: ['Spinal Erectors', 'Glutes'], secondaryMuscles: ['Hamstrings', 'Traps', 'Lats'], equipment: 'Barbell' },
  { key: 'romanian-deadlift', name: 'Romanian Deadlift', category: 'Back', primaryMuscles: ['Hamstrings', 'Spinal Erectors'], secondaryMuscles: ['Glutes'], equipment: 'Barbell' },
  { key: 'barbell-row', name: 'Barbell Row', category: 'Back', primaryMuscles: ['Lats', 'Mid Back'], secondaryMuscles: ['Biceps', 'Rear Delts'], equipment: 'Barbell' },
  { key: 'dumbbell-row', name: 'Dumbbell Row', category: 'Back', primaryMuscles: ['Lats', 'Mid Back'], secondaryMuscles: ['Biceps', 'Rear Delts'], equipment: 'Dumbbell' },
  { key: 'pull-up', name: 'Pull Up', category: 'Back', primaryMuscles: ['Lats'], secondaryMuscles: ['Biceps', 'Core'], equipment: 'Bodyweight' },
  { key: 'chin-up', name: 'Chin Up', category: 'Back', primaryMuscles: ['Lats'], secondaryMuscles: ['Biceps'], equipment: 'Bodyweight' },
  { key: 'lat-pulldown', name: 'Lat Pulldown', category: 'Back', primaryMuscles: ['Lats'], secondaryMuscles: ['Biceps'], equipment: 'Cable' },
  { key: 'seated-cable-row', name: 'Seated Cable Row', category: 'Back', primaryMuscles: ['Mid Back'], secondaryMuscles: ['Lats', 'Biceps'], equipment: 'Cable' },
  { key: 't-bar-row', name: 'T-Bar Row', category: 'Back', primaryMuscles: ['Mid Back', 'Lats'], secondaryMuscles: ['Biceps', 'Rear Delts'], equipment: 'Barbell' },
  { key: 'face-pull', name: 'Face Pull', category: 'Back', primaryMuscles: ['Rear Delts', 'Rotator Cuff'], secondaryMuscles: ['Traps'], equipment: 'Cable' },
  { key: 'straight-arm-pulldown', name: 'Straight Arm Pulldown', category: 'Back', primaryMuscles: ['Lats'], secondaryMuscles: ['Triceps'], equipment: 'Cable' },

  // ── Shoulders ──
  { key: 'ohp', name: 'Overhead Press', category: 'Shoulders', primaryMuscles: ['Front Delts'], secondaryMuscles: ['Triceps', 'Side Delts'], equipment: 'Barbell' },
  { key: 'dumbbell-ohp', name: 'Dumbbell Shoulder Press', category: 'Shoulders', primaryMuscles: ['Front Delts'], secondaryMuscles: ['Triceps', 'Side Delts'], equipment: 'Dumbbell' },
  { key: 'lateral-raise', name: 'Lateral Raise', category: 'Shoulders', primaryMuscles: ['Side Delts'], secondaryMuscles: ['Traps'], equipment: 'Dumbbell' },
  { key: 'front-raise', name: 'Front Raise', category: 'Shoulders', primaryMuscles: ['Front Delts'], secondaryMuscles: [], equipment: 'Dumbbell' },
  { key: 'rear-delt-fly', name: 'Rear Delt Fly', category: 'Shoulders', primaryMuscles: ['Rear Delts'], secondaryMuscles: ['Traps'], equipment: 'Dumbbell' },
  { key: 'cable-lateral-raise', name: 'Cable Lateral Raise', category: 'Shoulders', primaryMuscles: ['Side Delts'], secondaryMuscles: ['Traps'], equipment: 'Cable' },
  { key: 'arnold-press', name: 'Arnold Press', category: 'Shoulders', primaryMuscles: ['Front Delts', 'Side Delts'], secondaryMuscles: ['Triceps'], equipment: 'Dumbbell' },
  { key: 'shrug', name: 'Shrugs', category: 'Shoulders', primaryMuscles: ['Traps'], secondaryMuscles: [], equipment: 'Dumbbell' },
  { key: 'upright-row', name: 'Upright Row', category: 'Shoulders', primaryMuscles: ['Side Delts', 'Traps'], secondaryMuscles: ['Biceps'], equipment: 'Barbell' },

  // ── Arms ──
  { key: 'barbell-curl', name: 'Barbell Curl', category: 'Arms', primaryMuscles: ['Biceps'], secondaryMuscles: [], equipment: 'Barbell' },
  { key: 'dumbbell-curl', name: 'Dumbbell Curl', category: 'Arms', primaryMuscles: ['Biceps'], secondaryMuscles: [], equipment: 'Dumbbell' },
  { key: 'hammer-curl', name: 'Hammer Curl', category: 'Arms', primaryMuscles: ['Biceps', 'Brachialis'], secondaryMuscles: [], equipment: 'Dumbbell' },
  { key: 'preacher-curl', name: 'Preacher Curl', category: 'Arms', primaryMuscles: ['Biceps'], secondaryMuscles: [], equipment: 'Barbell' },
  { key: 'incline-curl', name: 'Incline Dumbbell Curl', category: 'Arms', primaryMuscles: ['Biceps'], secondaryMuscles: [], equipment: 'Dumbbell' },
  { key: 'cable-curl', name: 'Cable Curl', category: 'Arms', primaryMuscles: ['Biceps'], secondaryMuscles: [], equipment: 'Cable' },
  { key: 'close-grip-bench', name: 'Close Grip Bench Press', category: 'Arms', primaryMuscles: ['Triceps'], secondaryMuscles: ['Chest', 'Front Delts'], equipment: 'Barbell' },
  { key: 'tricep-pushdown', name: 'Tricep Pushdown', category: 'Arms', primaryMuscles: ['Triceps'], secondaryMuscles: [], equipment: 'Cable' },
  { key: 'overhead-tricep-ext', name: 'Overhead Tricep Extension', category: 'Arms', primaryMuscles: ['Triceps'], secondaryMuscles: [], equipment: 'Dumbbell' },
  { key: 'skull-crusher', name: 'Skull Crusher', category: 'Arms', primaryMuscles: ['Triceps'], secondaryMuscles: [], equipment: 'Barbell' },
  { key: 'tricep-dip', name: 'Tricep Dip', category: 'Arms', primaryMuscles: ['Triceps'], secondaryMuscles: ['Chest'], equipment: 'Bodyweight' },
  { key: 'diamond-pushup', name: 'Diamond Push Up', category: 'Arms', primaryMuscles: ['Triceps'], secondaryMuscles: ['Chest'], equipment: 'Bodyweight' },
  { key: 'wrist-curl', name: 'Wrist Curl', category: 'Arms', primaryMuscles: ['Forearms'], secondaryMuscles: [], equipment: 'Dumbbell' },

  // ── Legs ──
  { key: 'squat', name: 'Barbell Squat', category: 'Legs', primaryMuscles: ['Quads', 'Glutes'], secondaryMuscles: ['Hamstrings', 'Core', 'Spinal Erectors'], equipment: 'Barbell' },
  { key: 'front-squat', name: 'Front Squat', category: 'Legs', primaryMuscles: ['Quads'], secondaryMuscles: ['Glutes', 'Core'], equipment: 'Barbell' },
  { key: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', category: 'Legs', primaryMuscles: ['Quads', 'Glutes'], secondaryMuscles: ['Hamstrings'], equipment: 'Dumbbell' },
  { key: 'goblet-squat', name: 'Goblet Squat', category: 'Legs', primaryMuscles: ['Quads', 'Glutes'], secondaryMuscles: ['Core'], equipment: 'Dumbbell' },
  { key: 'leg-press', name: 'Leg Press', category: 'Legs', primaryMuscles: ['Quads', 'Glutes'], secondaryMuscles: ['Hamstrings'], equipment: 'Machine' },
  { key: 'hack-squat', name: 'Hack Squat', category: 'Legs', primaryMuscles: ['Quads'], secondaryMuscles: ['Glutes'], equipment: 'Machine' },
  { key: 'leg-extension', name: 'Leg Extension', category: 'Legs', primaryMuscles: ['Quads'], secondaryMuscles: [], equipment: 'Machine' },
  { key: 'lying-leg-curl', name: 'Lying Leg Curl', category: 'Legs', primaryMuscles: ['Hamstrings'], secondaryMuscles: [], equipment: 'Machine' },
  { key: 'seated-leg-curl', name: 'Seated Leg Curl', category: 'Legs', primaryMuscles: ['Hamstrings'], secondaryMuscles: [], equipment: 'Machine' },
  { key: 'nordic-curl', name: 'Nordic Hamstring Curl', category: 'Legs', primaryMuscles: ['Hamstrings'], secondaryMuscles: ['Glutes'], equipment: 'Bodyweight' },
  { key: 'hip-thrust', name: 'Barbell Hip Thrust', category: 'Legs', primaryMuscles: ['Glutes'], secondaryMuscles: ['Hamstrings'], equipment: 'Barbell' },
  { key: 'glute-bridge', name: 'Glute Bridge', category: 'Legs', primaryMuscles: ['Glutes'], secondaryMuscles: ['Hamstrings'], equipment: 'Bodyweight' },
  { key: 'cable-kickback', name: 'Cable Kickback', category: 'Legs', primaryMuscles: ['Glutes'], secondaryMuscles: [], equipment: 'Cable' },
  { key: 'calf-raise', name: 'Standing Calf Raise', category: 'Legs', primaryMuscles: ['Calves'], secondaryMuscles: [], equipment: 'Machine' },
  { key: 'seated-calf-raise', name: 'Seated Calf Raise', category: 'Legs', primaryMuscles: ['Calves'], secondaryMuscles: [], equipment: 'Machine' },
  { key: 'lunge', name: 'Dumbbell Lunge', category: 'Legs', primaryMuscles: ['Quads', 'Glutes'], secondaryMuscles: ['Hamstrings'], equipment: 'Dumbbell' },
  { key: 'step-up', name: 'Dumbbell Step Up', category: 'Legs', primaryMuscles: ['Quads', 'Glutes'], secondaryMuscles: ['Hamstrings'], equipment: 'Dumbbell' },

  // ── Core ──
  { key: 'cable-crunch', name: 'Cable Crunch', category: 'Core', primaryMuscles: ['Abs'], secondaryMuscles: [], equipment: 'Cable' },
  { key: 'hanging-leg-raise', name: 'Hanging Leg Raise', category: 'Core', primaryMuscles: ['Abs', 'Hip Flexors'], secondaryMuscles: [], equipment: 'Bodyweight' },
  { key: 'plank', name: 'Plank', category: 'Core', primaryMuscles: ['Abs'], secondaryMuscles: ['Shoulders', 'Glutes'], equipment: 'Bodyweight' },
  { key: 'ab-wheel', name: 'Ab Wheel Rollout', category: 'Core', primaryMuscles: ['Abs'], secondaryMuscles: ['Lats'], equipment: 'Other' },
  { key: 'russian-twist', name: 'Russian Twist', category: 'Core', primaryMuscles: ['Obliques'], secondaryMuscles: ['Abs'], equipment: 'Bodyweight' },
  { key: 'decline-crunch', name: 'Decline Crunch', category: 'Core', primaryMuscles: ['Abs'], secondaryMuscles: [], equipment: 'Bodyweight' },
  { key: 'woodchopper', name: 'Cable Woodchopper', category: 'Core', primaryMuscles: ['Obliques'], secondaryMuscles: ['Abs'], equipment: 'Cable' },
];

export function getExercise(key: string): ExerciseDef | undefined {
  return EXERCISES.find(e => e.key === key);
}

export function searchExercises(query: string): ExerciseDef[] {
  const q = query.toLowerCase();
  return EXERCISES.filter(e =>
    e.name.toLowerCase().includes(q) ||
    e.category.toLowerCase().includes(q) ||
    e.primaryMuscles.some(m => m.toLowerCase().includes(q)) ||
    e.equipment.toLowerCase().includes(q)
  );
}

export function getExercisesByCategory(cat: string): ExerciseDef[] {
  return EXERCISES.filter(e => e.category === cat);
}

export function getMuscleGroups(): string[] {
  const groups = new Set<string>();
  for (const ex of EXERCISES) {
    for (const m of ex.primaryMuscles) groups.add(m);
    for (const m of ex.secondaryMuscles) groups.add(m);
  }
  return Array.from(groups).sort();
}
