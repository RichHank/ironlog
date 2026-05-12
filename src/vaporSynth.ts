// Procedural vaporwave/chiptune background loop.
// One AudioContext per page; first user gesture resumes it.
// 16-bar progression: Cmaj7 → Am7 → Fmaj7 → G7 with a square-wave lead riff.

const MUTED_KEY = 'il-music-muted';
const VOLUME_KEY = 'il-music-volume';
const MASTER_VOLUME = 0.07;
const CHORD_DURATION = 4; // seconds per chord
const PROGRESSION: number[][] = [
  [261.63, 329.63, 392.0, 493.88], // Cmaj7
  [220.0, 261.63, 329.63, 392.0],  // Am7
  [174.61, 220.0, 261.63, 329.63], // Fmaj7
  [196.0, 246.94, 293.66, 349.23], // G7
];
// Pentatonic riff over the loop, [freq, beats]. 1 beat = 0.5s. 32 beats per chord (16s loop).
const RIFF: [number | null, number][] = [
  [523.25, 1], [587.33, 1], [659.25, 2],   // C5 D5 E5
  [523.25, 1], [493.88, 1], [440.0, 2],    // C5 B4 A4
  [null, 2], [392.0, 1], [440.0, 1],       // rest, G4, A4
  [523.25, 4],                             // C5 hold
  [659.25, 1], [587.33, 1], [523.25, 2],   // E5 D5 C5
  [493.88, 1], [440.0, 1], [392.0, 2],     // B4 A4 G4
  [349.23, 2], [392.0, 2],                 // F4 G4
  [440.0, 2], [null, 2],                   // A4 rest
];

class VaporSynth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private feedbackDelay: DelayNode | null = null;
  private muted: boolean;
  private _volume: number;
  private started = false;
  private running = false;
  private loopTimer: number | null = null;
  private nextLoopAt = 0;

  constructor() {
    this.muted = typeof localStorage !== 'undefined' && localStorage.getItem(MUTED_KEY) === '1';
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(VOLUME_KEY) : null;
    this._volume = saved != null ? Math.max(0, Math.min(100, Number(saved))) / 100 : MASTER_VOLUME;
  }

  isMuted(): boolean { return this.muted; }

  getVolume(): number { return Math.round(this._volume * 100); }

  setVolume(level0to100: number) {
    this._volume = Math.max(0, Math.min(100, level0to100)) / 100;
    try { localStorage.setItem(VOLUME_KEY, String(level0to100)); } catch {}
    if (this.master && this.ctx && !this.muted) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(this._volume, this.ctx.currentTime + 0.4);
    }
  }

  setMuted(value: boolean): void {
    this.muted = value;
    try { localStorage.setItem(MUTED_KEY, value ? '1' : '0'); } catch {}
    if (this.master) {
      const target = value ? 0 : this._volume;
      this.master.gain.cancelScheduledValues(this.ctx!.currentTime);
      this.master.gain.linearRampToValueAtTime(target, this.ctx!.currentTime + 0.4);
    }
  }

  // Call from a user-gesture handler. Idempotent.
  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    if (this.ctx.state === 'suspended') await this.ctx.resume();

    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this._volume;
    this.master.connect(this.ctx.destination);

    // Cheap "reverb": delay with feedback into a low-pass.
    this.feedbackDelay = this.ctx.createDelay(2);
    this.feedbackDelay.delayTime.value = 0.42;
    const fb = this.ctx.createGain();
    fb.gain.value = 0.38;
    const fbFilter = this.ctx.createBiquadFilter();
    fbFilter.type = 'lowpass';
    fbFilter.frequency.value = 2400;
    this.feedbackDelay.connect(fbFilter).connect(fb).connect(this.feedbackDelay);
    const wet = this.ctx.createGain();
    wet.gain.value = 0.45;
    this.feedbackDelay.connect(wet).connect(this.master);

    this.running = true;
    this.nextLoopAt = this.ctx.currentTime + 0.1;
    this.scheduleLoop();
    this.scheduleLoop(); // schedule one ahead for seamless looping

    document.addEventListener('visibilitychange', this.onVisibility);
  }

  stop(): void {
    this.running = false;
    if (this.loopTimer != null) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    document.removeEventListener('visibilitychange', this.onVisibility);
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
    }
  }

  private onVisibility = (): void => {
    if (!this.ctx) return;
    if (document.visibilityState === 'hidden') this.ctx.suspend();
    else if (this.running) this.ctx.resume();
  };

  private scheduleLoop = (): void => {
    if (!this.running || !this.ctx || !this.master || !this.feedbackDelay) return;
    const start = this.nextLoopAt;
    const loopLen = PROGRESSION.length * CHORD_DURATION;

    PROGRESSION.forEach((chord, i) => {
      const chordStart = start + i * CHORD_DURATION;
      // Sub-octave bass
      this.playPad(chord[0] * 0.5, chordStart, CHORD_DURATION, 0.18, 380);
      // Chord pad voices
      chord.forEach(f => this.playPad(f, chordStart, CHORD_DURATION, 0.08, 1200));
    });

    // Lead riff over the whole loop
    const beatLen = 0.5;
    let beatCursor = 0;
    for (const [freq, beats] of RIFF) {
      if (freq != null) {
        this.playLead(freq, start + beatCursor * beatLen, beats * beatLen);
      }
      beatCursor += beats;
      if (beatCursor * beatLen >= loopLen) break;
    }

    this.nextLoopAt = start + loopLen;
    // Schedule the next iteration ~1s before this one ends
    const msUntilNext = (loopLen - 1.5) * 1000;
    this.loopTimer = window.setTimeout(this.scheduleLoop, msUntilNext);
  };

  private playPad(freq: number, when: number, duration: number, peak: number, cutoff: number): void {
    if (!this.ctx || !this.master || !this.feedbackDelay) return;
    const ctx = this.ctx;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o2.type = 'sawtooth';
    o1.frequency.value = freq;
    o2.frequency.value = freq * 1.006; // slight detune for chorus

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff * 0.6, when);
    filter.frequency.linearRampToValueAtTime(cutoff, when + 1.5);
    filter.frequency.linearRampToValueAtTime(cutoff * 0.7, when + duration);
    filter.Q.value = 3;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(peak, when + 0.6);
    env.gain.linearRampToValueAtTime(peak * 0.7, when + duration - 0.5);
    env.gain.linearRampToValueAtTime(0, when + duration);

    o1.connect(filter);
    o2.connect(filter);
    filter.connect(env);
    env.connect(this.master);
    env.connect(this.feedbackDelay);

    o1.start(when); o2.start(when);
    o1.stop(when + duration + 0.05); o2.stop(when + duration + 0.05);
  }

  private playLead(freq: number, when: number, duration: number): void {
    if (!this.ctx || !this.master || !this.feedbackDelay) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;

    const env = ctx.createGain();
    const peak = 0.05;
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(peak, when + 0.02);
    env.gain.linearRampToValueAtTime(peak * 0.6, when + duration * 0.5);
    env.gain.linearRampToValueAtTime(0, when + duration - 0.02);

    osc.connect(env);
    env.connect(this.master);
    env.connect(this.feedbackDelay);

    osc.start(when);
    osc.stop(when + duration + 0.02);
  }
}

let instance: VaporSynth | null = null;
export function getVaporSynth(): VaporSynth {
  if (!instance) instance = new VaporSynth();
  return instance;
}
