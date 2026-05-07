import { useEffect, useRef } from 'react';
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

  // Acquire wake lock while timer is running, release when it stops
  useEffect(() => {
    if (timer.isRunning) {
      wakeLock.acquire();
    } else {
      wakeLock.release();
    }
  }, [timer.isRunning, wakeLock]);

  // Completion notification: vibrate when timer hits 0
  useEffect(() => {
    if (prevSeconds.current > 0 && timer.displaySeconds === 0 && timer.isRunning) {
      if (window.navigator?.vibrate) window.navigator.vibrate([200, 100, 200, 100, 400]);
    }
    prevSeconds.current = timer.displaySeconds;
  }, [timer.displaySeconds, timer.isRunning]);

  const progress = timer.isRunning
    ? ((timer.displaySeconds) / timer.duration) * 100
    : 0;

  const isUrgent = timer.displaySeconds <= 10 && timer.isRunning;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Rest Timer</p>
        {activeExercise && (
          <p className="text-xs text-zinc-400 truncate ml-2">{activeExercise.name}</p>
        )}
      </div>

      {/* Progress bar */}
      {timer.isRunning && (
        <div className="w-full h-1.5 bg-zinc-800 rounded-full mb-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-linear ${isUrgent ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${100 - progress}%` }}
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Timer display */}
        <div className={`min-w-[72px] rounded-lg border px-3 py-2 text-center ${
          isUrgent ? 'border-red-500/50 bg-red-500/10' : 'border-zinc-700 bg-zinc-800/50'
        }`}>
          <span className={`text-xl font-mono font-bold tabular-nums ${
            isUrgent ? 'text-red-400 animate-pulse' : 'text-zinc-100'
          }`}>
            {timer.display}
          </span>
        </div>

        {/* Controls */}
        <div className="flex gap-1.5">
          {!timer.isRunning && !timer.isPaused && (
            <button onClick={() => timer.start()} className="min-h-touch rounded-lg bg-blue-500 px-3.5 py-2 text-sm font-bold text-white active:scale-95 transition-transform">
              Start
            </button>
          )}
          {timer.isRunning && !timer.isPaused && (
            <button onClick={timer.pause} className="min-h-touch rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-bold text-zinc-950 active:scale-95 transition-transform">
              Pause
            </button>
          )}
          {timer.isPaused && (
            <>
              <button onClick={timer.resume} className="min-h-touch rounded-lg bg-blue-500 px-3.5 py-2 text-sm font-bold text-white active:scale-95 transition-transform">Resume</button>
              <button onClick={timer.reset} className="min-h-touch rounded-lg bg-zinc-700 px-3.5 py-2 text-sm font-bold text-zinc-300 active:scale-95 transition-transform">Reset</button>
            </>
          )}
        </div>

        {/* Presets */}
        <div className="ml-auto flex gap-1 overflow-x-auto scrollbar-hide">
          {PRESETS.map(d => {
            const label = d >= 60 ? `${d / 60}m` : `${d}s`;
            const isActive = timer.duration === d;
            return (
              <button
                key={d}
                onClick={() => { timer.setDuration(d); timer.start(d); }}
                className={`min-h-touch rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                  isActive && !timer.isRunning ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-zinc-800 text-zinc-400 active:bg-zinc-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
