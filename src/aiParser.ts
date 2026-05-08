import { parseWorkoutInput } from './parser';
import { ParseResult } from './parseTypes';

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
  t.totalCalls = field === 'totalCalls' ? t.totalCalls : t.totalCalls + (field === 'localHits' || field === 'aiFallbacks' ? 1 : 0);
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

function hasParsedEntries(result: ParseResult): boolean {
  return result.exercises.length > 0 && result.exercises.some(e => e.sets.length > 0);
}

function withTimeout(ms: number): AbortSignal {
  const controller = new AbortController();
  window.setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

export async function parseWorkoutInputSmart(
  input: string,
  context: ParserContext
): Promise<{ result: ParseResult; source: 'ai' | 'local' }> {
  const localResult = parseWorkoutInput(input, context);
  if (hasParsedEntries(localResult) && localResult.confidence !== 'low') {
    bumpTelemetry('localHits');
    return { result: localResult, source: 'local' };
  }

  try {
    const response = await fetch(AI_PARSE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, context }),
      signal: withTimeout(6500),
    });
    if (response.ok) {
      const result = (await response.json()) as ParseResult;
      if (hasParsedEntries(result)) {
        bumpTelemetry('aiFallbacks');
        return { result, source: 'ai' };
      }
    }
  } catch {
    bumpTelemetry('aiFailures');
  }

  bumpTelemetry('localHits');
  return { result: localResult, source: 'local' };
}
