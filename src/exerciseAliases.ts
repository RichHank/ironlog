import { EXERCISES } from './exerciseData';

// Manual short-name aliases for canonical exercises. These take priority because
// "bench" and "squat" are vastly more common than full names in spoken input.
const COMMON_ALIASES: Record<string, string[]> = {
  'Barbell Bench Press': ['bench', 'bench press', 'flat bench', 'barbell bench', 'bp'],
  'Dumbbell Bench Press': ['db bench', 'dumbbell bench', 'dumbbell press', 'db press'],
  'Incline Barbell Bench': ['incline bench', 'incline press', 'incline barbell'],
  'Incline Dumbbell Bench': ['incline db', 'incline dumbbell'],
  'Barbell Squat': ['squat', 'squats', 'back squat', 'barbell squat'],
  'Front Squat': ['front squat', 'front squats'],
  'Deadlift': ['deadlift', 'deadlifts', 'dead', 'deads', 'dl', 'conventional deadlift'],
  'Romanian Deadlift': ['rdl', 'rdls', 'romanian deadlift'],
  'Overhead Press': ['ohp', 'press', 'military press', 'overhead press', 'standing press', 'shoulder press'],
  'Dumbbell Shoulder Press': ['db shoulder press', 'dumbbell shoulder press', 'db ohp'],
  'Barbell Row': ['row', 'rows', 'bb row', 'barbell row', 'bent over row', 'bent-over row'],
  'Dumbbell Row': ['db row', 'dumbbell row', 'one arm row'],
  'Pull Up': ['pull up', 'pullup', 'pull-up', 'pullups', 'pull-ups'],
  'Chin Up': ['chin up', 'chinup', 'chin-up', 'chinups', 'chin-ups'],
  'Lat Pulldown': ['pulldown', 'pulldowns', 'lat pulldown'],
  'Close Grip Bench Press': ['close grip', 'close grip bench', 'cgbp'],
  'Lateral Raise': ['lateral raise', 'lat raise', 'side raise', 'side lateral'],
  'Bicep Curl': ['curl', 'curls', 'bicep curl', 'biceps curl'],
  'Tricep Pushdown': ['pushdown', 'pushdowns', 'tricep pushdown'],
  'Leg Press': ['leg press'],
  'Leg Curl': ['leg curl', 'leg curls', 'hamstring curl'],
  'Leg Extension': ['leg extension', 'leg extensions'],
  'Calf Raise': ['calf raise', 'calf raises', 'calves'],
  'Hip Thrust': ['hip thrust', 'hip thrusts', 'thrust'],
  'Plank': ['plank', 'planks'],
  'Push Up': ['push up', 'pushup', 'push-up', 'pushups', 'push-ups'],
  'Dip': ['dip', 'dips'],
  'Chest Dip': ['chest dip', 'chest dips'],
};

function buildAliases(): [string[], string][] {
  const entries: [string[], string][] = [];
  for (const ex of EXERCISES) {
    const aliases = new Set<string>();
    aliases.add(ex.name.toLowerCase());
    aliases.add(ex.name.toLowerCase().replace(/\s+/g, '-'));
    const common = COMMON_ALIASES[ex.name];
    if (common) for (const c of common) aliases.add(c.toLowerCase());
    entries.push([Array.from(aliases), ex.name]);
  }
  // Sort by longest alias first so multi-word matches win over single-word.
  entries.sort((a, b) => Math.max(...b[0].map(s => s.length)) - Math.max(...a[0].map(s => s.length)));
  return entries;
}

export const EXERCISE_ALIASES: [string[], string][] = buildAliases();
