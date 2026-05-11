import { useEffect, useRef, useState } from 'react';
import { ExerciseLog } from '../types';

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
  // Screen wake-lock is held by App.tsx for the whole active session,
  // so it covers the timer view and the dead time between sets.
  const prevSeconds = useRef(timer.displaySeconds);
  const [glitch, setGlitch] = useState(false);

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
          <p className="text-xs text-vapor-muted truncate ml-2">{activeExercise.name}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Analog Neon Clock */}
        <div className={`relative w-[70px] h-[70px] flex-shrink-0 flex items-center justify-center rounded-full border-[3px] shadow-inner bg-[#05050A] ${
          isUrgent ? 'border-[#fe4450]/60 shadow-[0_0_15px_rgba(254,68,80,0.4)]' : 'border-[#00f5ff]/40 shadow-[0_0_15px_rgba(0,245,255,0.2)]'
        }`}>
          {/* Tick marks */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
             <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,42,163,0.3)" strokeWidth="4" strokeDasharray="2 11.8" />
          </svg>
          {/* Sweeping Hand */}
          <div 
            className={`absolute w-1.5 h-[40%] rounded-full origin-bottom z-10 ${
              isUrgent ? 'bg-[#fe4450] shadow-[0_0_10px_rgba(254,68,80,0.8)]' : 'bg-[#ff2aa3] shadow-[0_0_10px_rgba(255,42,163,0.8)]'
            }`}
            style={{ 
               bottom: '50%', 
               left: 'calc(50% - 3px)', 
               transform: `rotate(${timer.duration > 0 ? 360 - ((timer.displaySeconds / timer.duration) * 360) : 0}deg)`,
               transition: timer.isRunning ? 'transform 1s linear' : 'none'
            }}
          />
          {/* Center Pin */}
          <div className="absolute w-2.5 h-2.5 rounded-full bg-[#00f5ff] shadow-[0_0_8px_rgba(0,245,255,0.9)] z-20" />
        </div>

        {/* Digital display */}
        <div className={`min-w-[90px] rounded-sm border px-3 py-2 text-center transition-all duration-200 ${
          isUrgent
            ? 'border-[#fe4450]/60 bg-[#fe4450]/10 shadow-[0_0_20px_rgba(254,68,80,0.3)]'
            : 'border-[#00f5ff]/30 bg-[#00f5ff]/5 shadow-[0_0_12px_rgba(0,245,255,0.1)]'
        } ${glitch ? 'animate-pulse' : ''}`}>
          <span className={`text-2xl font-mono font-bold tabular-nums tracking-widest ${
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
                className="min-h-touch rounded-lg border border-vapor-magenta/50 bg-vapor-navy/50 px-4 py-2 text-sm font-bold text-vapor-muted active:scale-95 transition-transform hover:border-zinc-600">
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
                    : 'border border-zinc-700/50 text-vapor-muted hover:border-[#00f5ff]/30 hover:text-[#00f5ff]'
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
