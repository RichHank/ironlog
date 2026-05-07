import { EXERCISES, ExerciseDef } from './exerciseData';

// Build alias map from IronLog's exercise catalog
function buildAliases(): [string[], string][] {
  const entries: [string[], string][] = [];
  for (const ex of EXERCISES) {
    const aliases = [ex.name, ex.name.toLowerCase(), ex.name.toLowerCase().replace(/\s+/g, '-')];
    for (const m of ex.primaryMuscles) aliases.push(m.toLowerCase().replace(/\s+/g, '-'));
    entries.push([Array.from(new Set(aliases)), ex.name]);
  }
  entries.sort((a, b) => Math.max(...b[0].map(s => s.length)) - Math.max(...a[0].map(s => s.length)));
  return entries;
}

export const EXERCISE_ALIASES: [string[], string][] = buildAliases();
