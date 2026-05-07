type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } }; length: number } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function isBrowserVoiceAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return !!((window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition);
}

export async function startBrowserVoice(onEnd: () => void): Promise<{ stop: () => void; promise: Promise<string> }> {
  const SpeechRecognitionCtor = (window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) throw new Error('Voice input is not available in this browser.');

  // Warm up mic permission
  if (navigator.mediaDevices?.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch {
      throw new Error('Microphone access denied. Please allow mic access in settings.');
    }
  }

  const recognition = new (SpeechRecognitionCtor as new () => BrowserSpeechRecognition)();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  const promise = new Promise<string>((resolve, reject) => {
    recognition.onresult = (event) => {
      resolve(event.results[0][0].transcript);
    };
    recognition.onerror = () => {
      reject(new Error('Voice input stopped before a transcript was ready.'));
    };
    recognition.onend = onEnd;
  });

  recognition.start();
  return { stop: () => recognition.stop(), promise };
}
