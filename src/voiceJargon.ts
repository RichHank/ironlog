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

export function applyPhoneticFixes(input: string): string {
  let result = input;
  for (const [pattern, replacement] of PHONETIC_FIXES) result = result.replace(pattern, replacement);
  return result;
}

function levenshtein(a: string, b: string): number {
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

export function fuzzyMatchJargon(token: string): string | null {
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
  result = result.replace(/\b([a-z]{4,})\b/gi, (match) => {
    const fix = fuzzyMatchJargon(match);
    if (fix && fix !== match.toLowerCase() && levenshtein(match.toLowerCase(), fix) <= 1) return fix;
    return match;
  });
  return result;
}
