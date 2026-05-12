let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let _sfxVolume = 0.75;       // 0–1 multiplier
let _sfxMuted = false;

export function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = _sfxMuted ? 0 : _sfxVolume;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/** The master gain node that all SFX should route through. */
export function getMasterGain(): GainNode | null {
  getAudioContext(); // ensure ctx + masterGain exist
  return masterGain;
}

// ── Volume / mute controls ──

export function getSfxVolume(): number {
  return Math.round(_sfxVolume * 100);
}

export function getSfxMuted(): boolean {
  return _sfxMuted;
}

export function setSfxVolume(level0to100: number) {
  _sfxVolume = Math.max(0, Math.min(100, level0to100)) / 100;
  if (masterGain && audioCtx && !_sfxMuted) {
    masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(_sfxVolume, audioCtx.currentTime + 0.08);
  }
}

export function setSfxMuted(muted: boolean) {
  _sfxMuted = muted;
  if (masterGain && audioCtx) {
    masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(muted ? 0 : _sfxVolume, audioCtx.currentTime + 0.08);
  }
}

// ── Sound effect functions ──
// All route through masterGain (via getMasterGain()) so volume/mute are
// respected uniformly.

// Low, mechanical clack for buttons
export function playClick() {
  try {
    const ctx = getAudioContext();
    const out = getMasterGain();
    if (!out) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.05);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {
    // Ignore audio errors
  }
}

// Warm synth chord for saving/success
export function playSuccess() {
  try {
    const ctx = getAudioContext();
    const out = getMasterGain();
    if (!out) return;
    const freqs = [261.63, 329.63, 392.00, 493.88]; // Cmaj7
    
    const noteGain = ctx.createGain();
    noteGain.gain.setValueAtTime(0.05, ctx.currentTime);
    noteGain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.2);
    noteGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);
    noteGain.connect(out);

    freqs.forEach(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 1.0);
      
      osc.connect(filter);
      filter.connect(noteGain);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.0);
    });
  } catch (e) {
    // Ignore
  }
}

// Harsh square wave digital alarm
export function playAlarm() {
  try {
    const ctx = getAudioContext();
    const out = getMasterGain();
    if (!out) return;
    for (let i = 0; i < 4; i++) {
      const time = ctx.currentTime + (i * 0.25);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.value = 880; // A5
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.15, time + 0.02);
      gain.gain.linearRampToValueAtTime(0, time + 0.15);
      
      osc.connect(gain);
      gain.connect(out);
      
      osc.start(time);
      osc.stop(time + 0.15);
    }
  } catch (e) {}
}

// Deep power-up sweep for starting sequences
export function playPowerUp() {
  try {
    const ctx = getAudioContext();
    const out = getMasterGain();
    if (!out) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(50, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.4);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(out);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {}
}

// Descending dissonant blip for errors/discard
export function playError() {
  try {
    const ctx = getAudioContext();
    const out = getMasterGain();
    if (!out) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(out);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}
