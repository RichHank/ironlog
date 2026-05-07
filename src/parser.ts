import { ParseResult } from './parseTypes';
import { EXERCISE_ALIASES } from './exerciseAliases';
import { SCALE_WORDS, TENS_WORDS, UNIT_WORDS } from './parserConstants';

const NUMBER_TOKEN = /^[a-z]+$/;

function parseNumberWordsAt(words: string[], start: number): { value: number; end: number } | null {
  const first = words[start];
  if (UNIT_WORDS[first] !== undefined) {
    const next = words[start + 1];
    const afterNext = words[start + 2];
    if (next === 'hundred') {
      let value = UNIT_WORDS[first] * 100;
      let end = start + 2;
      if (words[end] === 'and') end += 1;
      const rest = parseNumberWordsAt(words, end);
      if (rest && rest.value < 100) { value += rest.value; end = rest.end; }
      return { value, end };
    }
    if ((next === 'oh' || next === 'zero') && UNIT_WORDS[afterNext] !== undefined) {
      return { value: UNIT_WORDS[first] * 100 + UNIT_WORDS[afterNext], end: start + 3 };
    }
    if (UNIT_WORDS[next] !== undefined && UNIT_WORDS[next] >= 10) {
      return { value: UNIT_WORDS[first] * 100 + UNIT_WORDS[next], end: start + 2 };
    }
    if (TENS_WORDS[next] !== undefined) {
      const unit = UNIT_WORDS[afterNext] !== undefined ? UNIT_WORDS[afterNext] : 0;
      const end = UNIT_WORDS[afterNext] !== undefined ? start + 3 : start + 2;
      return { value: UNIT_WORDS[first] * 100 + TENS_WORDS[next] + unit, end };
    }
    return { value: UNIT_WORDS[first], end: start + 1 };
  }
  if (TENS_WORDS[first] !== undefined) {
    const next = words[start + 1];
    if (UNIT_WORDS[next] !== undefined && UNIT_WORDS[next] < 10) {
      return { value: TENS_WORDS[first] + UNIT_WORDS[next], end: start + 2 };
    }
    return { value: TENS_WORDS[first], end: start + 1 };
  }
  if (SCALE_WORDS[first] !== undefined) return null;
  return null;
}

function replaceNumberWords(input: string): string {
  const spaced = input.replace(/-/g, ' ').replace(/\b(a|an)\s+(rep|reps)\b/gi, '1 $2');
  const tokens = spaced.match(/\d+(?:\.\d+)?|[a-zA-Z]+|[^\w\s]+|\s+/g) ?? [];
  const output: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const lower = token.toLowerCase();
    if (!NUMBER_TOKEN.test(lower)) { output.push(token); continue; }
    const wordRun: string[] = [];
    let j = i;
    while (j < tokens.length && NUMBER_TOKEN.test(tokens[j].toLowerCase())) {
      wordRun.push(tokens[j].toLowerCase());
      j += 1;
      if (tokens[j] && /^\s+$/.test(tokens[j])) j += 1;
    }
    const parsed = parseNumberWordsAt(wordRun, 0);
    if (!parsed || parsed.end === 0) { output.push(token); continue; }
    output.push(String(parsed.value));
    let consumedOriginal = 0;
    let k = i;
    while (k < tokens.length && consumedOriginal < parsed.end) {
      if (NUMBER_TOKEN.test(tokens[k].toLowerCase())) consumedOriginal += 1;
      k += 1;
    }
    i = k - 1;
  }
  return output.join('').replace(/\s+/g, ' ').trim();
}

function normalize(input: string): string {
  return input.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[’']/g, "'");
}

function normalizeOperators(input: string): string {
  return input.replace(/\b(by|times)\b/gi, 'x').replace(/\b(body weight|body-weight)\b/gi, 'bodyweight');
}

function detectExercise(input: string): { name: string; remaining: string } | null {
  const norm = normalize(input);
  for (const [aliases, canonicalName] of EXERCISE_ALIASES) {
    for (const alias of aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^${escaped}\\b`, 'i');
      const match = norm.match(regex);
      if (match) return { name: canonicalName, remaining: input.slice(match[0].length).trim() };
    }
  }
  return null;
}

function detectFreeformExercise(input: string): { name: string; remaining: string } | null {
  const marker = input.match(/\s+(?:bodyweight\s+)?(?:failed\s+)?(?:same\s+weight|only\s+got|\d+(?:\.\d+)?(?:s\b|\s*x|\s+for|\s+\d))/i);
  if (!marker || marker.index === undefined) return null;
  const name = input.slice(0, marker.index).replace(/[,\s]+/g, ' ').trim();
  if (!name || name.length < 3) return null;
  return {
    name: name.split(' ').map(p => p[0].toUpperCase() + p.slice(1).toLowerCase()).join(' '),
    remaining: input.slice(marker.index).trim(),
  };
}

export function parseWorkoutInput(
  input: string,
  context: { activeExerciseName?: string; lastWeight?: number | null; lastReps?: number } = {}
): ParseResult {
  const warnings: string[] = [];
  let remaining = normalizeOperators(replaceNumberWords(input)).trim();
  let detectedExerciseName: string | undefined;
  let exerciseNotes: string | undefined;

  const detected = detectExercise(remaining);
  if (detected) {
    detectedExerciseName = detected.name;
    remaining = detected.remaining;
  } else if (detectFreeformExercise(remaining)) {
    const freeform = detectFreeformExercise(remaining)!;
    detectedExerciseName = freeform.name;
    remaining = freeform.remaining;
  } else {
    detectedExerciseName = context.activeExerciseName;
  }

  if (!detectedExerciseName) {
    return { exercises: [], confidence: 'low', warnings: ['No exercise detected. Start with an exercise name like "bench", "squat", etc.'] };
  }

  // Bodyweight
  let isBodyweight = false;
  const bwMatch = remaining.match(/^bodyweight\b\s*/i);
  if (bwMatch) { isBodyweight = true; remaining = remaining.slice(bwMatch[0].length).trim(); }

  // Failed set
  const failedMatch = remaining.match(/^failed\s+(\d+(?:\.\d+)?)\s*/i);
  let failedSet: { weight: number; reps: number; note: string } | null = null;
  if (failedMatch) {
    failedSet = { weight: parseFloat(failedMatch[1]), reps: 0, note: 'failed rep' };
    remaining = remaining.slice(failedMatch[0].length).trim();
  }

  // Same weight
  let sameWeightReps: number | null = null;
  const sameWeightMatch = remaining.match(/^same\s+weight(?:\s+for\s+(\d+))?\s*/i);
  if (sameWeightMatch) {
    sameWeightReps = sameWeightMatch[1] ? parseInt(sameWeightMatch[1]) : null;
    remaining = remaining.slice(sameWeightMatch[0].length).trim();
    if (context.lastWeight === undefined || context.lastWeight === null) {
      warnings.push('"same weight" used but no previous weight available.');
    }
  }

  // Only got
  let onlyGotReps: number | null = null;
  const onlyGotMatch = remaining.match(/^only\s+got\s+(\d+)\s*/i);
  if (onlyGotMatch) { onlyGotReps = parseInt(onlyGotMatch[1]); remaining = remaining.slice(onlyGotMatch[0].length).trim(); }

  // Parse sets
  const rawSets: { weight: number | null; reps: number | null }[] = [];
  if (failedSet) rawSets.push({ weight: failedSet.weight, reps: failedSet.reps });
  if (sameWeightReps !== null || onlyGotReps !== null) {
    rawSets.push({ weight: context.lastWeight ?? null, reps: onlyGotReps ?? sameWeightReps ?? context.lastReps ?? 5 });
  }

  let textAfterSets = remaining;
  if (rawSets.length === 0 && remaining.length > 0) {
    // Dumbbell notation: "70s 8 8 7"
    const dbMatch = remaining.match(/^(\d+(?:\.\d+)?)s\s+/i);
    if (dbMatch) {
      const dbWeight = parseFloat(dbMatch[1]);
      remaining = remaining.slice(dbMatch[0].length).trim();
      const repNumbers = remaining.match(/^[\d\s]+/);
      if (repNumbers) {
        repNumbers[0].trim().split(/\s+/).map(Number).forEach(r => rawSets.push({ weight: dbWeight, reps: r }));
        remaining = remaining.slice(repNumbers[0].length).trim();
      }
    }

    // Standard weight x reps
    if (rawSets.length === 0) {
      const wxrRegex = /(\d+(?:\.\d+)?)\s*x\s*(\d+)/gi;
      let m: RegExpExecArray | null;
      let lastWxrIndex = 0;
      while ((m = wxrRegex.exec(remaining)) !== null) {
        rawSets.push({ weight: parseFloat(m[1]), reps: parseInt(m[2]) });
        lastWxrIndex = m.index + m[0].length;
      }
      if (rawSets.length > 0) textAfterSets = remaining.slice(lastWxrIndex).trim();
    }

    // "for" pattern
    if (rawSets.length === 0) {
      const wfrRegex = /(\d+(?:\.\d+)?)\s+for\s+(\d+)/gi;
      let m: RegExpExecArray | null;
      let lastWfrIndex = 0;
      while ((m = wfrRegex.exec(remaining)) !== null) {
        rawSets.push({ weight: parseFloat(m[1]), reps: parseInt(m[2]) });
        lastWfrIndex = m.index + m[0].length;
      }
      if (rawSets.length > 0) textAfterSets = remaining.slice(lastWfrIndex).trim();
    }

    // "then" separated
    if (rawSets.length === 0) {
      const thenParts = remaining.split(/\s+then\s+/i);
      let allParsed = true;
      const parsedParts: { weight: number; reps: number }[] = [];
      for (const part of thenParts) {
        const pmX = part.match(/^(\d+(?:\.\d+)?)\s*x\s*(\d+)/i);
        const pmF = part.match(/^(\d+(?:\.\d+)?)\s+for\s+(\d+)/i);
        if (pmX) parsedParts.push({ weight: parseFloat(pmX[1]), reps: parseInt(pmX[2]) });
        else if (pmF) parsedParts.push({ weight: parseFloat(pmF[1]), reps: parseInt(pmF[2]) });
        else { allParsed = false; break; }
      }
      if (allParsed && parsedParts.length > 0) { parsedParts.forEach(p => rawSets.push(p)); textAfterSets = ''; }
    }

    // Bodyweight bare numbers
    if (rawSets.length === 0 && isBodyweight) {
      const allNums = remaining.match(/\d+/g);
      if (allNums) { allNums.forEach(n => rawSets.push({ weight: null, reps: parseInt(n) })); textAfterSets = remaining.replace(/[\d\s]+/, '').trim(); }
    }

    // Bare number pairs
    if (rawSets.length === 0 && !isBodyweight) {
      const numPairs = remaining.match(/^\s*(\d+(?:\.\d+)?)\s+(\d+)(?:\s+(\d+(?:\.\d+)?)\s+(\d+))?(?:\s+(\d+(?:\.\d+)?)\s+(\d+))?/);
      if (numPairs) {
        const nums = numPairs[0].trim().split(/\s+/).map(Number);
        if (nums.length >= 2 && nums.length % 2 === 0) {
          for (let i = 0; i < nums.length; i += 2) {
            if (nums[i] >= 30 && nums[i + 1] <= 50) rawSets.push({ weight: nums[i], reps: nums[i + 1] });
            else if (nums[i] <= 30 && nums[i + 1] >= 30) rawSets.push({ weight: nums[i + 1], reps: nums[i] });
            else rawSets.push({ weight: nums[i], reps: nums[i + 1] });
          }
          textAfterSets = remaining.slice(numPairs[0].length).trim();
        }
      }
    }

    // Context fallback (bare reps using last weight)
    if (rawSets.length === 0 && context.lastWeight !== undefined) {
      const leading = remaining.trimStart();
      const reps: number[] = [];
      for (const part of leading.split(/\s+/)) {
        if (!/^\d+$/.test(part)) break;
        reps.push(Number(part));
      }
      if (reps.length > 0) { reps.forEach(r => rawSets.push({ weight: context.lastWeight!, reps: r })); textAfterSets = leading.slice(reps.join(' ').length).trim(); }
    }
  }

  // RPE
  let rpe: number | null = null;
  const rpeMatch = textAfterSets.match(/rpe\s+(\d+(?:\.\d+)?)/i);
  if (rpeMatch) { rpe = parseFloat(rpeMatch[1]); textAfterSets = textAfterSets.replace(rpeMatch[0], '').trim(); }

  // Notes
  const noteText = textAfterSets.replace(/[,\s]+/g, ' ').trim();
  if (noteText) {
    exerciseNotes = noteText;
    if (failedSet && noteText) { failedSet.note = noteText; exerciseNotes = undefined; }
  }

  const finalSets = rawSets.map((rs, i) => ({
    weight: rs.weight,
    reps: rs.reps,
    rpe: i === rawSets.length - 1 && rpe !== null ? rpe : undefined,
    note: i === rawSets.length - 1 && failedSet ? failedSet.note : undefined,
  }));

  if (finalSets.length === 0 && !exerciseNotes) {
    return { exercises: [{ name: detectedExerciseName, sets: [], notes: exerciseNotes }], confidence: 'low', warnings: ['No sets detected. Try "bench 225x5" or "squat 315 for 5".'] };
  }

  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (warnings.length > 0 || sameWeightReps !== null || onlyGotReps !== null) confidence = 'medium';
  if (finalSets.length === 0 && !detected) confidence = 'low';
  if (!detected && context.activeExerciseName) confidence = confidence === 'high' ? 'medium' : confidence;

  return { exercises: [{ name: detectedExerciseName, sets: finalSets, notes: exerciseNotes }], confidence, warnings };
}

export function suggestNextSet(
  exercise: { sets: { weight: number | null; reps: number | null }[] }
): { weightLabel: string; reps: number } | null {
  if (exercise.sets.length === 0) return null;
  const lastSet = exercise.sets[exercise.sets.length - 1];
  const weight = lastSet.weight;
  const reps = lastSet.reps ?? 5;
  if (weight === null) return { weightLabel: 'Bodyweight', reps };
  if (reps >= 5) return { weightLabel: `${weight}`, reps: 5 };
  return { weightLabel: `${Math.max(0, weight - 5)}`, reps: 5 };
}
