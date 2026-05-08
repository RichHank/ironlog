import { parseWorkoutInput } from './parser';
import { ParseResult } from './parseTypes';
import { EXERCISES } from './exerciseData';
import { levenshtein } from './voiceJargon';

type ParserContext = {
  activeExerciseName?: string;
  lastWeight?: number | null;
  lastReps?: number;
};

const AI_PARSE_URL = 'https://deep-work-ai-parser.richhank.workers.dev/parse';
const TELEMETRY_KEY = 'ironlog:voiceTelemetry';

interface Telemetry {
  totalCalls: number;
  localHits: number;
  aiFallbacks: number;
  aiFailures: number;
  lastResetAt: number;
}

// ── AI response shape (flat, one exercise per utterance) ──

interface AISet {
  weight: number | null;
  reps: number | null;
  isWarmup: boolean;
  isDropSet: boolean;
  isAMRAP: boolean;
  isBodyweight: boolean;
  failed: boolean;
  rpe: number | null;
}

interface AIResponse {
  exercise: string;
  sets: AISet[];
}

// ── Telemetry ──

function readTelemetry(): Telemetry {
  if (typeof localStorage === 'undefined') return { totalCalls: 0, localHits: 0, aiFallbacks: 0, aiFailures: 0, lastResetAt: Date.now() };
  try {
    const raw = localStorage.getItem(TELEMETRY_KEY);
    if (!raw) return { totalCalls: 0, localHits: 0, aiFallbacks: 0, aiFailures: 0, lastResetAt: Date.now() };
    return JSON.parse(raw) as Telemetry;
  } catch {
    return { totalCalls: 0, localHits: 0, aiFallbacks: 0, aiFailures: 0, lastResetAt: Date.now() };
  }
}

function writeTelemetry(t: Telemetry) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(TELEMETRY_KEY, JSON.stringify(t)); } catch { /* quota */ }
}

function bumpTelemetry(field: keyof Omit<Telemetry, 'lastResetAt'>) {
  const t = readTelemetry();
  t[field] += 1;
  if (field === 'localHits' || field === 'aiFallbacks') t.totalCalls += 1;
  if (field === 'totalCalls') t.totalCalls += 1;
  writeTelemetry(t);
}

export function getVoiceTelemetry(): Telemetry & { fallbackRate: number } {
  const t = readTelemetry();
  const denom = t.localHits + t.aiFallbacks;
  return { ...t, fallbackRate: denom > 0 ? t.aiFallbacks / denom : 0 };
}

export function resetVoiceTelemetry() {
  writeTelemetry({ totalCalls: 0, localHits: 0, aiFallbacks: 0, aiFailures: 0, lastResetAt: Date.now() });
}

// ── Helpers ──

function hasParsedEntries(result: ParseResult): boolean {
  return result.exercises.length > 0 && result.exercises.some(e => e.sets.length > 0);
}

function withTimeout(ms: number): AbortSignal {
  const controller = new AbortController();
  window.setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

// ── Prompt builder ──

const CANONICAL_EXERCISE_LIST = EXERCISES.map(e => e.name).join(', ');

export function buildAIParserPrompt(
  transcript: string,
  context: { lastExercise: string | null; lastWeight: number | null; lastReps: number | null }
): { system: string; user: string } {
  const prevBlock = context.lastExercise
    ? `The user's previous set was: ${context.lastExercise}, ${context.lastWeight ?? 'bodyweight'} lbs × ${context.lastReps ?? '?'} reps.`
    : 'No previous set context available.';

  const system = `You are a workout log parser. Your ONLY job is to convert a spoken gym utterance into a single JSON object matching this schema exactly:

{
  "exercise": string,
  "sets": [
    {
      "weight": number | null,
      "reps": number | null,
      "isWarmup": boolean,
      "isDropSet": boolean,
      "isAMRAP": boolean,
      "isBodyweight": boolean,
      "failed": boolean,
      "rpe": number | null
    }
  ]
}

The "exercise" field MUST be one of these canonical names (case-insensitive match, pick the closest match):
${CANONICAL_EXERCISE_LIST}

If no reasonable match exists in the list, set exercise to "Unknown".

${prevBlock}

Parsing rules (apply in order of priority):

1. Only parse the FIRST exercise mentioned. If the user mentions a second distinct exercise ("then I did squats..."), ignore everything after the second exercise starts.
2. Remove filler words (um, uh, like, I think, let's see, you know, basically, sort of, kind of).
3. Self-correction: if the user corrects themselves ("8... wait, 10 reps"), use the LAST number stated.
4. "to failure", "max reps", "as many as I could", "AMRAP" → isAMRAP: true, reps: null.
5. "heavy triple" → reps: 3, weight: null. "heavy double" → reps: 2. "heavy single" → reps: 1.
6. "@8", "RPE 8", "rpe 8" → rpe: 8.
7. "bodyweight", "just body weight" → weight: null, isBodyweight: true.
8. "bar", "empty bar", "just the bar" → weight: null (do NOT output 45).
9. "drop set", "drop-set" → isDropSet: true.
10. "warm-up", "warmup" → isWarmup: true.
11. "failed", "missed the last rep" → failed: true.
12. "for a double" → reps: 2. "for a triple" → reps: 3.
13. Weight × reps patterns: "135 for 8", "135 x 8", "135 by 8", "135 8".
14. Multiple explicit sets: "3 sets of 10 at 185" → 3 identical set objects.
15. Progression lists: "135x10, 155x10, 175x5" → all three sets as separate objects.
16. "same weight for 10": use the weight from the same utterance if available, otherwise from the previous set context (${context.lastWeight ?? 'none available'}).
17. If weight is missing but reps are present → weight: null. If reps are missing but weight is present → reps: null.
18. Omit rpe if not mentioned (set to null). All booleans default to false.

Output ONLY the JSON object. No markdown, no code fences, no explanation.`;

  return { system, user: transcript };
}

// ── Fuzzy exercise matching ──

function fuzzyMatchExercise(name: string): string | null {
  const lower = name.toLowerCase().trim();
  // Exact match
  const exact = EXERCISES.find(e => e.name.toLowerCase() === lower);
  if (exact) return exact.name;

  // Levenshtein-based fuzzy match
  let best: { name: string; dist: number } | null = null;
  for (const ex of EXERCISES) {
    const dist = levenshtein(lower, ex.name.toLowerCase());
    if (dist < 3 && (!best || dist < best.dist)) {
      best = { name: ex.name, dist };
    }
  }
  if (best) return best.name;

  // Substring match as last resort
  const substr = EXERCISES.find(e =>
    e.name.toLowerCase().includes(lower) || lower.includes(e.name.toLowerCase())
  );
  return substr?.name ?? null;
}

// ── AI response validation ──

function mapAIToParseResult(ai: AIResponse): ParseResult {
  const canonicalName = fuzzyMatchExercise(ai.exercise);
  const exerciseName = canonicalName ?? (ai.exercise === 'Unknown' ? null : ai.exercise) ?? null;

  if (!exerciseName || exerciseName === 'Unknown') {
    return {
      exercises: [{ name: ai.exercise || 'Unknown', sets: [] }],
      confidence: 'low',
      warnings: ['AI could not match the exercise to a known exercise.'],
      needsConfirmation: true,
    };
  }

  const sets = (ai.sets || []).map(s => ({
    weight: s.weight,
    reps: s.reps,
    rpe: s.rpe,
    type: (s.isWarmup ? 'warmup' : s.isDropSet ? 'drop' : s.failed ? 'failure' : 'normal') as 'normal' | 'warmup' | 'drop' | 'failure',
    isWarmup: s.isWarmup,
    isDropSet: s.isDropSet,
    isAMRAP: s.isAMRAP,
    isBodyweight: s.isBodyweight,
    failed: s.failed,
  }));

  if (sets.length === 0) {
    return {
      exercises: [{ name: exerciseName, sets: [] }],
      confidence: 'low',
      warnings: ['AI returned no sets.'],
      needsConfirmation: true,
    };
  }

  return {
    exercises: [{ name: exerciseName, sets }],
    confidence: 'high',
    warnings: [],
  };
}

// ── AI call ──

async function callAIParser(
  systemPrompt: string,
  userMessage: string,
): Promise<AIResponse> {
  const response = await fetch(AI_PARSE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
    signal: withTimeout(6500),
  });

  if (!response.ok) {
    throw new Error(`AI endpoint returned ${response.status}`);
  }

  const text = await response.text();

  // Strip markdown code fences if present
  let jsonStr = text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  return JSON.parse(jsonStr) as AIResponse;
}

async function callAIParserWithRetry(
  systemPrompt: string,
  userMessage: string,
): Promise<AIResponse> {
  try {
    return await callAIParser(systemPrompt, userMessage);
  } catch {
    // Retry once with explicit instruction
    const retryUser = `${userMessage}\n\nPrevious response was invalid JSON. Please output only valid JSON matching the schema exactly.`;
    return await callAIParser(systemPrompt, retryUser);
  }
}

// ── Orchestration ──

export async function parseWorkoutInputSmart(
  input: string,
  context: ParserContext
): Promise<{ result: ParseResult; source: 'ai' | 'local' }> {
  bumpTelemetry('totalCalls');

  // 1. Try local parser first
  const localResult = parseWorkoutInput(input, context);

  // If local is high confidence and has sets, return immediately
  if (localResult.confidence === 'high' && hasParsedEntries(localResult)) {
    bumpTelemetry('localHits');
    return { result: localResult, source: 'local' };
  }

  // 2. Build AI prompt and call
  const lastEx = context.activeExerciseName ?? localResult.exercises[0]?.name ?? null;
  const lastSet = localResult.exercises[0]?.sets?.length
    ? localResult.exercises[0].sets[localResult.exercises[0].sets.length - 1]
    : null;

  const { system, user } = buildAIParserPrompt(input, {
    lastExercise: lastEx,
    lastWeight: context.lastWeight ?? lastSet?.weight ?? null,
    lastReps: context.lastReps ?? lastSet?.reps ?? null,
  });

  try {
    const aiResponse = await callAIParserWithRetry(system, user);
    const aiResult = mapAIToParseResult(aiResponse);

    if (hasParsedEntries(aiResult)) {
      bumpTelemetry('aiFallbacks');

      // Merge logic: if local has high-confidence sets but low-confidence exercise,
      // and AI returned a good exercise, combine them.
      if (
        localResult.confidence === 'high' &&
        hasParsedEntries(localResult) &&
        localResult.exercises[0]?.name &&
        aiResult.exercises[0]?.name &&
        localResult.exercises[0].name !== aiResult.exercises[0].name
      ) {
        // Local has high-confidence sets but AI returned different exercise.
        // Use local sets with AI exercise if local exercise seems like a guess.
        const localEx = localResult.exercises[0];
        const aiEx = aiResult.exercises[0];
        return {
          result: {
            exercises: [{ name: aiEx.name, sets: localEx.sets, notes: localEx.notes }],
            confidence: 'high',
            warnings: [],
          },
          source: 'ai',
        };
      }

      // If local has sets but low confidence, prefer AI
      if (hasParsedEntries(localResult) && localResult.confidence !== 'high') {
        return { result: aiResult, source: 'ai' };
      }

      return { result: aiResult, source: 'ai' };
    }

    // AI returned empty — fall back to local
    bumpTelemetry('aiFailures');
  } catch {
    bumpTelemetry('aiFailures');
  }

  // 3. Fallback: return local result (may be empty/low confidence)
  bumpTelemetry('localHits');
  return { result: localResult, source: 'local' };
}
