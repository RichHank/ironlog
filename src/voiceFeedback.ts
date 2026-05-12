import { getAudioContext, getMasterGain } from './audio';

export function playSuccessChime() {
  try {
    const ctx = getAudioContext();
    const out = getMasterGain();
    if (!ctx || !out) return;
    const t = ctx.currentTime;
    const notes: [number, number][] = [[660, 0], [880, 0.07]];
    for (const [freq, when] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, t + when);
      gain.gain.linearRampToValueAtTime(0.18, t + when + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + when + 0.18);
      osc.connect(gain).connect(out);
      osc.start(t + when);
      osc.stop(t + when + 0.2);
    }
  } catch {}
}

export function playErrorBuzz() {
  try {
    const ctx = getAudioContext();
    const out = getMasterGain();
    if (!ctx || !out) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 200;
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain).connect(out);
    osc.start(t);
    osc.stop(t + 0.31);
  } catch {}
}

export function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.05;
  u.volume = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
