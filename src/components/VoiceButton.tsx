import { useState, useRef, useCallback } from 'react';
import { isBrowserVoiceAvailable, startBrowserVoice } from '../voice';

type Props = {
  onResult: (transcript: string) => void;
  className?: string;
};

export default function VoiceButton({ onResult, className }: Props) {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('Tap to speak');
  const [isSupported] = useState(() => isBrowserVoiceAvailable());
  const stopRef = useRef<(() => void) | null>(null);

  const toggleListen = useCallback(async () => {
    if (!isSupported) return;
    if (isListening) {
      stopRef.current?.();
      setIsListening(false);
      setStatus('Tap to speak');
      return;
    }
    setIsListening(true);
    setStatus('Listening...');
    try {
      const session = await startBrowserVoice(() => {
        setIsListening(false);
        setStatus('Tap to speak');
      });
      stopRef.current = session.stop;
      const transcript = await session.promise;
      onResult(transcript);
      setStatus('Logged!');
      setTimeout(() => setStatus('Tap to speak'), 1500);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Voice error');
      setTimeout(() => setStatus('Tap to speak'), 2500);
    } finally {
      setIsListening(false);
    }
  }, [isListening, isSupported, onResult]);

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <button
        onClick={toggleListen}
        disabled={!isSupported}
        type="button"
        className={`relative min-h-touch min-w-touch flex items-center justify-center rounded-full transition-all duration-300 ${
          !isSupported ? 'opacity-30 cursor-not-allowed bg-zinc-800 text-zinc-600' :
          isListening
            ? 'bg-[#ff2aa3] text-white shadow-[0_0_20px_rgba(255,42,163,0.6)] scale-110 animate-pulse'
            : 'bg-zinc-800/80 text-zinc-400 hover:text-[#00f5ff] hover:shadow-[0_0_12px_rgba(0,245,255,0.3)] border border-zinc-700 hover:border-[#00f5ff]/40'
        }`}
        title={status}
        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7.001 7.001 0 0 0 6 6.93V20H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-3.07A7.001 7.001 0 0 0 19 10Z" />
        </svg>
        {/* Ripple effect when listening */}
        {isListening && (
          <span className="absolute inset-0 rounded-full animate-ping bg-[#ff2aa3]/30" />
        )}
      </button>
      <span className="text-[10px] text-zinc-500 hidden sm:inline">{status}</span>
    </div>
  );
}
