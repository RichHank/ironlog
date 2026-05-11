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
    <div className="relative mx-auto mt-4 max-w-[340px]">
      {/* 80s Alarm Clock Casing */}
      <div className="relative rounded-t-xl rounded-b-md bg-[#1a1a24] border-t-2 border-x-2 border-[#ff2aa3]/40 border-b-[6px] border-b-[#0a0a0f] shadow-[0_0_50px_rgba(255,42,163,0.25),0_20px_40px_rgba(0,0,0,0.9)] pb-4 overflow-hidden">
        {/* Top bevel highlight */}
        <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-b from-[#2a2a35] to-transparent opacity-50" />
        
        {/* Casing accents */}
        <div className="absolute top-0 right-4 w-12 h-2 bg-[#ff2aa3] rounded-b-sm shadow-[0_0_10px_rgba(255,42,163,0.5)]" />

        <div className="px-4 pt-6 pb-2">
          {/* LED Display Screen */}
          <div className="relative bg-[#05050A] rounded-lg border-4 border-[#0a0a0f] p-3 shadow-[inset_0_0_25px_rgba(0,0,0,1)]">
            
            {/* Screen Header Indicators */}
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold text-[#ff2aa3] tracking-[0.2em]">REST.PROTOCOL</span>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shadow-inner ${timer.isRunning ? 'bg-[#ff2aa3] shadow-[0_0_8px_#ff2aa3] animate-pulse' : 'bg-[#330011]'}`} />
                <span className="text-[8px] text-[#ff2aa3]/60 tracking-widest uppercase">ACTIVE</span>
              </div>
            </div>

            {/* Giant LED Time */}
            <div className="flex justify-center items-center py-2 relative">
              {/* Background inactive segments illusion */}
              <span className="absolute font-mono text-[4.5rem] leading-none font-black tabular-nums tracking-widest text-[#330011] opacity-40 select-none z-0">
                88:88
              </span>
              <span className={`relative z-10 font-mono text-[4.5rem] leading-none font-black tabular-nums tracking-widest ${
                isUrgent 
                  ? 'text-[#fe4450] [text-shadow:0_0_15px_rgba(254,68,80,0.8),0_0_30px_rgba(254,68,80,0.4)]'
                  : 'text-[#ff2aa3] [text-shadow:0_0_15px_rgba(255,42,163,0.8),0_0_30px_rgba(255,42,163,0.4)]'
              } ${glitch ? 'animate-ping' : ''}`}>
                {timer.display}
              </span>
            </div>

            {/* Screen Footer Indicators */}
            <div className="flex justify-between items-end mt-2">
              <span className="text-[8px] text-[#00f5ff] tracking-widest uppercase truncate max-w-[60%]">
                {activeExercise ? activeExercise.name : 'AWAITING INPUT'}
              </span>
              <span className="text-[8px] text-[#ff2aa3]/80 tracking-widest uppercase">PWR OK</span>
            </div>
          </div>
        </div>

        {/* Chunky Hardware Buttons */}
        <div className="px-4 mt-2">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {!timer.isRunning && !timer.isPaused && (
              <button onClick={() => timer.start()} className="col-span-2 rounded-sm bg-[#2a2a35] border-b-[4px] border-[#0a0a0f] py-3 text-sm font-black tracking-wider text-[#00f5ff] transition-all active:translate-y-[3px] active:border-b-[1px] shadow-[0_4px_10px_rgba(0,0,0,0.4)]">
                START SEQUENCE
              </button>
            )}
            {timer.isRunning && !timer.isPaused && (
              <button onClick={timer.pause} className="col-span-2 rounded-sm bg-[#2a2a35] border-b-[4px] border-[#0a0a0f] py-3 text-sm font-black tracking-wider text-[#fede5d] transition-all active:translate-y-[3px] active:border-b-[1px] shadow-[0_4px_10px_rgba(0,0,0,0.4)]">
                PAUSE
              </button>
            )}
            {timer.isPaused && (
              <>
                <button onClick={timer.resume} className="rounded-sm bg-[#2a2a35] border-b-[4px] border-[#0a0a0f] py-3 text-sm font-black tracking-wider text-[#00f5ff] transition-all active:translate-y-[3px] active:border-b-[1px] shadow-[0_4px_10px_rgba(0,0,0,0.4)]">
                  RESUME
                </button>
                <button onClick={timer.reset} className="rounded-sm bg-[#2a2a35] border-b-[4px] border-[#0a0a0f] py-3 text-sm font-black tracking-wider text-[#fe4450] transition-all active:translate-y-[3px] active:border-b-[1px] shadow-[0_4px_10px_rgba(0,0,0,0.4)]">
                  RESET
                </button>
              </>
            )}
          </div>

          {/* Preset Buttons */}
          <div className="flex justify-between gap-1 border-t border-[#0a0a0f] pt-3">
            {PRESETS.map(d => {
              const label = d >= 60 ? `${d / 60}m` : `${d}s`;
              const isActive = timer.duration === d && !timer.isRunning;
              return (
                <button key={d} onClick={() => { timer.setDuration(d); timer.start(d); }}
                  className={`flex-1 rounded-sm border-b-[3px] border-[#0a0a0f] py-2 text-[10px] font-bold transition-all active:translate-y-[2px] active:border-b-[1px] ${
                    isActive
                      ? 'bg-[#332233] text-[#ff2aa3] shadow-[0_0_10px_rgba(255,42,163,0.3)_inset]'
                      : 'bg-[#1a1a24] text-[#887baa] hover:bg-[#2a2a35] hover:text-[#00f5ff]'
                  }`}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
