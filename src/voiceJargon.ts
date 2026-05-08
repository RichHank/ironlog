const GYM_JARGON = [
  'amrap', 'rpe', 'pyramid', 'superset',
  'eccentric', 'tempo', 'warmup', 'bodyweight',
];

const PHONETIC_FIXES: [RegExp, string][] = [
  [/\b(?:i'?m|am)\s*wrap+(?:p?ing|ed)?\b/gi, 'amrap'],
  [/\bm\s*wrap\b/gi, 'amrap'],
  [/\ba\.?\s*m\.?\s*rap\b/gi, 'amrap'],
  [/\bem\s*rap\b/gi, 'amrap'],
  [/\bdrops?\s*at\b/gi, 'drop set'],
  [/\bsupper\s*set\b/gi, 'superset'],
  [/\bsuper\s+sets\b/gi, 'superset'],
  [/\bwarm\s*up\b/gi, 'warmup'],
  [/\bare\s+p\s+e\b/gi, 'rpe'],
  [/\barpy\b/gi, 'rpe'],
  [/\b(?:to|two)\s+failure\b/gi, 'to failure'],
];

// Expanded jargon/phonetic corrections applied BEFORE the main parse.
// Order matters: earlier rules take precedence.
const JARGON_EXPANSIONS: [RegExp, string][] = [
  // ── AMRAP / to-failure ──
  [/\bmax\s+reps?\b/gi, 'AMRAP'],
  [/\bto\s+failure\b/gi, 'AMRAP'],
  [/\bas\s+many\s+as\s+(?:i|you)\s+(?:could|can)\b/gi, 'AMRAP'],
  [/\buntil\s+failure\b/gi, 'AMRAP'],
  [/\bburnout\b/gi, 'AMRAP'],
  [/\bamrap\b/gi, 'AMRAP'],

  // ── Drop sets ──
  [/\bdrop\s+sit\b/gi, 'drop set'],
  [/\bdropset\b/gi, 'drop set'],
  [/\bdrop-set\b/gi, 'drop set'],

  // ── Slang for rep counts ──
  [/\bfor\s+a\s+double\b/gi, 'for 2 reps'],
  [/\bfor\s+a\s+triple\b/gi, 'for 3 reps'],
  [/\bfor\s+a\s+single\b/gi, 'for 1 rep'],
  [/\b(?:got|did|hit|got\s+me)\s+a\s+double\b/gi, 'for 2 reps'],
  [/\b(?:got|did|hit|got\s+me)\s+a\s+triple\b/gi, 'for 3 reps'],
  [/\b(?:got|did|hit|got\s+me)\s+a\s+single\b/gi, 'for 1 rep'],
  [/\b(\d+(?:\.\d+)?)\s+for\s+a\s+double\b/gi, '$1 for 2 reps'],
  [/\b(\d+(?:\.\d+)?)\s+for\s+a\s+triple\b/gi, '$1 for 3 reps'],
  [/\b(\d+(?:\.\d+)?)\s+for\s+a\s+single\b/gi, '$1 for 1 rep'],

  // ── Heavy patterns ──
  [/\bheavy\s+single\b/gi, '1 rep heavy'],
  [/\bheavy\s+double\b/gi, '2 reps heavy'],
  [/\bheavy\s+triple\b/gi, '3 reps heavy'],

  // ── RPE normalization ──
  [/\brpe\s*(\d+(?:\.\d+)?)\b/gi, 'rpe_$1'],
  [/@\s*(\d+(?:\.\d+)?)\b/g, 'rpe_$1'],

  // ── Bodyweight ──
  [/\bjust\s+body\s*weight\b/gi, 'bodyweight'],
  [/\bbody\s*weight\b/gi, 'bodyweight'],

  // ── Empty bar ──
  [/\bempty\s+bar\b/gi, 'bar'],
  [/\bjust\s+the\s+bar\b/gi, 'bar'],

  // ── Failed rep ──
  [/\bmissed\s+the\s+last\s+rep\b/gi, 'failed'],
  [/\bcouldn'?t\s+get\s+it\b/gi, 'failed'],

  // ── "for reps" shorthand ──
  [/\bfor\s+(\d+)\s+reps?\b/gi, 'for $1'],
];

// Filler words to remove entirely.
const FILLER_WORDS: RegExp[] = [
  /\bum\b/gi,
  /\buh\b/gi,
  /\blike\b/gi,
  /\bI\s+think\b/gi,
  /\blet'?s\s+see\b/gi,
  /\byou\s+know\b/gi,
  /\bi\s+mean\b/gi,
  /\bsort\s+of\b/gi,
  /\bkind\s+of\b/gi,
  /\bbasically\b/gi,
];

export function applyPhoneticFixes(input: string): string {
  let result = input;
  for (const [pattern, replacement] of PHONETIC_FIXES) result = result.replace(pattern, replacement);
  return result;
}

export function applyJargonExpansions(input: string): string {
  let result = input;
  for (const [pattern, replacement] of JARGON_EXPANSIONS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function removeFillerWords(input: string): string {
  let result = input;
  for (const pattern of FILLER_WORDS) {
    result = result.replace(pattern, '');
  }
  return result.replace(/\s+/g, ' ').trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function fuzzyMatchJargon(token: string): string | null {
  const lower = token.toLowerCase();
  if (GYM_JARGON.includes(lower)) return lower;
  let best: { word: string; dist: number } | null = null;
  for (const word of GYM_JARGON) {
    const dist = levenshtein(lower, word);
    const tolerance = Math.max(1, Math.floor(word.length / 5));
    if (dist <= tolerance && (!best || dist < best.dist)) best = { word, dist };
  }
  return best?.word ?? null;
}

export function normalizeJargon(input: string): string {
  let result = applyPhoneticFixes(input);
  result = applyJargonExpansions(result);
  result = removeFillerWords(result);
  result = result.replace(/\b([a-z]{4,})\b/gi, (match) => {
    const fix = fuzzyMatchJargon(match);
    if (fix && fix !== match.toLowerCase() && levenshtein(match.toLowerCase(), fix) <= 1) return fix;
    return match;
  });
  return result;
}
