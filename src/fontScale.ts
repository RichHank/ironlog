// Font scaling presets. Values are root font-size percentages.
export const FONT_PRESETS = [
  { label: 'Small',  pct: 87.5 },
  { label: 'Normal', pct: 100 },
  { label: 'Large',  pct: 112.5 },
  { label: 'X-Large', pct: 125 },
] as const;

export function applyFontScale(pct: number) {
  document.documentElement.style.fontSize = `${pct}%`;
}

export function getCurrentFontScale(): number {
  const v = document.documentElement.style.fontSize;
  if (!v || v === '100%') return 100;
  return parseFloat(v);
}
