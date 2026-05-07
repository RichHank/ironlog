import { parseWorkoutInput } from './parser';
import { ParseResult } from './parseTypes';

type ParserContext = {
  activeExerciseName?: string;
  lastWeight?: number | null;
  lastReps?: number;
};

const AI_PARSE_URL = 'https://deep-work-ai-parser.richhank.workers.dev/parse';

function hasParsedEntries(result: ParseResult): boolean {
  return result.exercises.length > 0;
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
  // Always try local parser first — it's free and instant
  const localResult = parseWorkoutInput(input, context);
  if (hasParsedEntries(localResult) && localResult.confidence !== 'low') {
    return { result: localResult, source: 'local' };
  }

  // Fall back to AI for ambiguous input
  try {
    const response = await fetch(AI_PARSE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, context }),
      signal: withTimeout(6500),
    });
    if (response.ok) {
      const result = (await response.json()) as ParseResult;
      if (hasParsedEntries(result)) return { result, source: 'ai' };
    }
  } catch { /* Local parser is the reliability layer */ }

  return { result: localResult, source: 'local' };
}
