import { useState, useRef, useCallback, useEffect } from 'react';
import { isBrowserVoiceAvailable, startBrowserVoice } from '../voice';

type Phase = 'idle' | 'listening' | 'processing' | 'done' | 'error';

type Props = {
  onResult: (transcript: string) => Promise<void> | void;
  className?: string;
};

export default function VoiceButton({ onResult, className }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSupported] = useState(() => isBrowserVoiceAvailable());
  const stopRef = useRef<(() => void) | null>(null);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => () => { if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current); }, []);

  const scheduleReset = (delay: number) => {
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => { setPhase('idle'); setTranscript(''); setErrorMsg(''); }, delay);
  };

  const toggleListen = useCallback(async () => {
    if (!isSupported) return;
    if (phase === 'listening') {
      stopRef.current?.();
      return;
    }
    if (phase === 'processing') return;
    setPhase('listening');
    setTranscript('');
    setErrorMsg('');
    try {
      const session = await startBrowserVoice(() => { /* end handler */ });
      stopRef.current = session.stop;
      const heard = await session.promise;
      setTranscript(heard);
      setPhase('processing');
      try {
        await onResult(heard);
        setPhase('done');
        scheduleReset(1500);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Command failed');
        setPhase('error');
        scheduleReset(2500);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Voice error');
      setPhase('error');
      scheduleReset(2500);
    }
  }, [phase, isSupported, onResult]);

  const baseClasses = 'relative min-h-touch min-w-touch flex items-center justify-center rounded-full transition-all duration-300';
  const stateClasses = !isSupported
    ? 'opacity-30 cursor-not-allowed bg-vapor-navy text-vapor-muted/80'
    : phase === 'listening'
      ? 'bg-[#ff2aa3] text-white shadow-[0_0_20px_rgba(255,42,163,0.6)] scale-110 animate-pulse'
      : phase === 'processing'
        ? 'bg-[#00f5ff] text-zinc-900 shadow-[0_0_20px_rgba(0,245,255,0.6)] scale-105'
        : phase === 'done'
          ? 'bg-emerald-500 text-white shadow-[0_0_18px_rgba(16,185,129,0.55)]'
          : phase === 'error'
            ? 'bg-rose-500 text-white shadow-[0_0_18px_rgba(244,63,94,0.55)]'
            : 'bg-zinc-800/80 text-vapor-muted hover:text-[#00f5ff] hover:shadow-[0_0_12px_rgba(0,245,255,0.3)] border border-vapor-magenta/50 hover:border-[#00f5ff]/40';

  const label =
    phase === 'idle' ? 'Tap to speak'
      : phase === 'listening' ? 'Listening…'
      : phase === 'processing' ? 'Parsing…'
      : phase === 'done' ? 'Logged ✓'
      : errorMsg || 'Error';

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <div className="relative">
        <button
          onClick={toggleListen}
          disabled={!isSupported || phase === 'processing'}
          type="button"
          className={`${baseClasses} ${stateClasses}`}
          title={label}
          aria-label={phase === 'listening' ? 'Stop voice input' : 'Start voice input'}
        >
          {phase === 'processing' ? (
            <svg viewBox="0 0 24 24" className="w-5 h-5 animate-spin">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="14 36" strokeLinecap="round" />
            </svg>
          ) : phase === 'done' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          ) : phase === 'error' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <img src={`${import.meta.env.BASE_URL}icons/voice_mic.png`} alt="Mic" className="w-6 h-6 object-contain mix-blend-screen" />
          )}
          {phase === 'listening' && (
            <span className="absolute inset-0 rounded-full animate-ping bg-[#ff2aa3]/30" />
          )}
        </button>
        {(transcript && (phase === 'processing' || phase === 'done')) && (
          <div className="absolute right-0 top-full mt-2 z-30 max-w-[260px] rounded-lg bg-zinc-900/95 border border-vapor-magenta/50 px-3 py-1.5 text-[11px] text-vapor-cyan shadow-lg whitespace-normal">
            <span className="text-[#00f5ff]">▸</span> {transcript}
          </div>
        )}
      </div>
      <span className="text-[10px] text-vapor-muted hidden sm:inline">{label}</span>
    </div>
  );
}
