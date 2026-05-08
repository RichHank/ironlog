import { useEffect, useRef, useState } from 'react';
import { ExerciseLog } from '../types';
import { useWakeLock } from '../hooks/useWakeLock';

const PRESETS = [45, 60, 90, 120, 150, 180];

type Timer = {
  display: string;
  displaySeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  duration: number;
  start: (d?: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  setDuration: (d: number) => void;
};

type Props = {
  timer: Timer;
  activeExercise: ExerciseLog | null;
};

export default function RestTimer({ timer, activeExercise }: Props) {
  const wakeLock = useWakeLock();
  const prevSeconds = useRef(timer.displaySeconds);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    if (timer.isRunning) wakeLock.acquire(); else wakeLock.release();
  }, [timer.isRunning, wakeLock]);

  useEffect(() => {
    const justExpired = prevSeconds.current > 0 && timer.displaySeconds === 0;
    if (justExpired && !document.hidden) {
      if (window.navigator?.vibrate) window.navigator.vibrate([200, 100, 200, 100, 400]);
      setGlitch(true);
      setTimeout(() => setGlitch(false), 600);
    }
    prevSeconds.current = timer.displaySeconds;
  }, [timer.displaySeconds]);

  const progress = timer.isRunning ? (timer.displaySeconds / timer.duration) * 100 : 0;
  const isUrgent = timer.displaySeconds <= 10 && timer.isRunning;

  return (
    <div className="card p-4 border-[#ff2aa3]/20">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-[#887baa] uppercase tracking-[0.2em] font-display">Rest Timer</p>
        {activeExercise && (
          <p className="text-xs text-zinc-400 truncate ml-2">{activeExercise.name}</p>
        )}
      </div>

      {/* Progress bar */}
      {timer.isRunning && (
        <div className="w-full h-2 bg-[#12121A] rounded-full mb-3 overflow-hidden border border-[#ff2aa3]/10">
          <div
            className="h-full rounded-full transition-all duration-300 ease-linear bg-gradient-to-r from-[#ff2aa3] to-[#00f5ff]"
            style={{ width: `${100 - progress}%` }}
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Giant neon timer display */}
        <div className={`min-w-[100px] rounded-xl border px-4 py-3 text-center transition-all duration-200 ${
          isUrgent
            ? 'border-[#fe4450]/60 bg-[#fe4450]/10 shadow-[0_0_20px_rgba(254,68,80,0.3)]'
            : 'border-[#00f5ff]/30 bg-[#00f5ff]/5 shadow-[0_0_12px_rgba(0,245,255,0.1)]'
        } ${glitch ? 'animate-pulse' : ''}`}>
          <span className={`text-3xl font-mono font-bold tabular-nums ${
            isUrgent
              ? 'text-[#fe4450] [text-shadow:0_0_10px_rgba(254,68,80,0.8),0_0_20px_rgba(254,68,80,0.4)]'
              : 'text-[#00f5ff] [text-shadow:0_0_10px_rgba(0,245,255,0.6),0_0_20px_rgba(0,245,255,0.3)]'
          }`}>
            {timer.display}
          </span>
        </div>

        {/* Controls */}
        <div className="flex gap-1.5">
          {!timer.isRunning && !timer.isPaused && (
            <button onClick={() => timer.start()}
              className="min-h-touch rounded-lg bg-gradient-to-r from-[#ff2aa3] to-[#ff2e88] px-4 py-2 text-sm font-bold text-white shadow-[0_0_15px_rgba(255,42,163,0.3)] active:scale-95 transition-transform">
              Start
            </button>
          )}
          {timer.isRunning && !timer.isPaused && (
            <button onClick={timer.pause}
              className="min-h-touch rounded-lg border border-[#fede5d]/40 bg-[#fede5d]/10 px-4 py-2 text-sm font-bold text-[#fede5d] shadow-[0_0_10px_rgba(254,222,93,0.2)] active:scale-95 transition-transform">
              Pause
            </button>
          )}
          {timer.isPaused && (
            <>
              <button onClick={timer.resume}
                className="min-h-touch rounded-lg bg-gradient-to-r from-[#ff2aa3] to-[#ff2e88] px-4 py-2 text-sm font-bold text-white shadow-[0_0_15px_rgba(255,42,163,0.3)] active:scale-95 transition-transform">
                Resume
              </button>
              <button onClick={timer.reset}
                className="min-h-touch rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm font-bold text-zinc-400 active:scale-95 transition-transform hover:border-zinc-600">
                Reset
              </button>
            </>
          )}
        </div>

        {/* Presets */}
        <div className="ml-auto flex gap-1 overflow-x-auto scrollbar-hide">
          {PRESETS.map(d => {
            const label = d >= 60 ? `${d / 60}m` : `${d}s`;
            const isActive = timer.duration === d && !timer.isRunning;
            return (
              <button key={d} onClick={() => { timer.setDuration(d); timer.start(d); }}
                className={`min-h-touch rounded-lg px-2.5 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? 'border border-[#ff2aa3]/40 bg-[#ff2aa3]/10 text-[#ff2aa3] shadow-[0_0_8px_rgba(255,42,163,0.2)]'
                    : 'border border-zinc-700/50 text-zinc-500 hover:border-[#00f5ff]/30 hover:text-[#00f5ff]'
                }`}>
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
