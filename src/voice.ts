type BrowserResult = {
  isFinal: boolean;
  [index: number]: { transcript: string };
};
type BrowserResultList = {
  length: number;
  [index: number]: BrowserResult;
};
type BrowserSpeechEvent = { results: BrowserResultList; resultIndex: number };
type BrowserErrorEvent = { error?: string };
type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechEvent) => void) | null;
  onerror: ((event: BrowserErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export function isBrowserVoiceAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return !!((window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition);
}

// How long to wait after the last detected speech before deciding the user is done.
const SILENCE_TIMEOUT_MS = 2500;
// Hard cap if no speech is detected at all.
const NO_SPEECH_TIMEOUT_MS = 12000;

export async function startBrowserVoice(onEnd: () => void): Promise<{ stop: () => void; promise: Promise<string> }> {
  const Ctor = (window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  if (!Ctor) throw new Error('Voice input is not available in this browser.');

  if (navigator.mediaDevices?.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch {
      throw new Error('Microphone access denied. Please allow mic access in settings.');
    }
  }

  const recognition = new (Ctor as new () => BrowserSpeechRecognition)();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  let finalText = '';
  let interimText = '';
  let silenceTimer: number | null = null;
  let initialTimer: number | null = null;
  let resolved = false;

  const clearTimers = () => {
    if (silenceTimer) { window.clearTimeout(silenceTimer); silenceTimer = null; }
    if (initialTimer) { window.clearTimeout(initialTimer); initialTimer = null; }
  };

  const promise = new Promise<string>((resolve, reject) => {
    const finish = () => {
      if (resolved) return;
      resolved = true;
      clearTimers();
      try { recognition.stop(); } catch { /* already stopped */ }
      const combined = (finalText + ' ' + interimText).replace(/\s+/g, ' ').trim();
      if (combined) resolve(combined);
      else reject(new Error('No speech detected.'));
    };

    recognition.onresult = (event) => {
      interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const text = r[0]?.transcript ?? '';
        if (r.isFinal) finalText += text + ' ';
        else interimText += text;
      }
      if (silenceTimer) window.clearTimeout(silenceTimer);
      silenceTimer = window.setTimeout(finish, SILENCE_TIMEOUT_MS);
    };

    recognition.onerror = (event) => {
      if (resolved) return;
      const err = event?.error || 'unknown';
      // 'no-speech' fires when the browser hears nothing for a while; let onend handle final disposition.
      if (err === 'no-speech' || err === 'aborted') return;
      resolved = true;
      clearTimers();
      reject(new Error(`Voice error: ${err}`));
    };

    recognition.onend = () => {
      onEnd();
      if (!resolved) finish();
    };
  });

  initialTimer = window.setTimeout(() => {
    if (!finalText && !interimText) {
      try { recognition.stop(); } catch { /* ok */ }
    }
  }, NO_SPEECH_TIMEOUT_MS);

  recognition.start();

  return {
    stop: () => { try { recognition.stop(); } catch { /* ok */ } },
    promise,
  };
}
