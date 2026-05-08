import { useState, useRef, useCallback, useEffect } from 'react';

export const TIMER_STORAGE_KEY = 'ironlog:restTimer';

export interface PersistedTimer {
  active: boolean;
  paused: boolean;
  completed?: boolean;
  targetEndTime: number;       // ms epoch — the absolute clock target
  durationSeconds: number;
  startedAt: number;
  pausedRemainingMs: number | null;
  label?: string;
}

export interface DerivedTimerState {
  remainingMs: number;
  remainingSec: number;
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
  duration: number;
}

export function readPersistedTimer(): PersistedTimer | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedTimer) : null;
  } catch {
    return null;
  }
}

export function writePersistedTimer(t: PersistedTimer | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (t) localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(t));
    else localStorage.removeItem(TIMER_STORAGE_KEY);
  } catch {
    /* quota or unavailable */
  }
}

export function deriveTimerState(persisted: PersistedTimer | null, defaultDuration: number, now: number = Date.now()): DerivedTimerState {
  if (!persisted?.active) {
    return { remainingMs: 0, remainingSec: 0, isRunning: false, isPaused: false, isComplete: false, duration: defaultDuration };
  }
  const duration = persisted.durationSeconds;
  if (persisted.paused && persisted.pausedRemainingMs !== null) {
    const ms = Math.max(0, persisted.pausedRemainingMs);
    return { remainingMs: ms, remainingSec: Math.ceil(ms / 1000), isRunning: false, isPaused: true, isComplete: false, duration };
  }
  const remainingMs = persisted.targetEndTime - now;
  if (remainingMs > 0) {
    return { remainingMs, remainingSec: Math.ceil(remainingMs / 1000), isRunning: true, isPaused: false, isComplete: false, duration };
  }
  return { remainingMs: 0, remainingSec: 0, isRunning: false, isPaused: false, isComplete: true, duration };
}

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function useTimer(defaultDuration = 90) {
  const [, setTick] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const durationRef = useRef(defaultDuration);
  const refresh = useCallback(() => setTick((n) => (n + 1) % 1_000_000), []);

  const persisted = readPersistedTimer();
  if (persisted?.active) durationRef.current = persisted.durationSeconds;
  const state = deriveTimerState(persisted, durationRef.current);

  // Idempotently mark expired timers as completed so the persisted state
  // matches what the UI is already displaying.
  useEffect(() => {
    const p = readPersistedTimer();
    if (p?.active && !p.paused && !p.completed && p.targetEndTime <= Date.now()) {
      writePersistedTimer({ ...p, completed: true });
    }
  });

  // setInterval is for repaint only. The remaining time is recomputed from
  // Date.now() vs targetEndTime on every render — never decremented.
  useEffect(() => {
    if (state.isRunning && intervalRef.current === null) {
      intervalRef.current = window.setInterval(refresh, 250);
    } else if (!state.isRunning && intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.isRunning, refresh]);

  // Resync whenever the page becomes visible / focused / restored from bfcache.
  useEffect(() => {
    const onSync = () => refresh();
    document.addEventListener('visibilitychange', onSync);
    window.addEventListener('focus', onSync);
    window.addEventListener('pageshow', onSync);
    window.addEventListener('storage', onSync);
    return () => {
      document.removeEventListener('visibilitychange', onSync);
      window.removeEventListener('focus', onSync);
      window.removeEventListener('pageshow', onSync);
      window.removeEventListener('storage', onSync);
    };
  }, [refresh]);

  const start = useCallback((d?: number, label?: string) => {
    const seconds = d ?? durationRef.current;
    durationRef.current = seconds;
    writePersistedTimer({
      active: true,
      paused: false,
      completed: false,
      targetEndTime: Date.now() + seconds * 1000,
      durationSeconds: seconds,
      startedAt: Date.now(),
      pausedRemainingMs: null,
      label,
    });
    refresh();
  }, [refresh]);

  const pause = useCallback(() => {
    const p = readPersistedTimer();
    if (!p?.active || p.paused || p.completed) return;
    const remain = Math.max(0, p.targetEndTime - Date.now());
    writePersistedTimer({ ...p, paused: true, pausedRemainingMs: remain });
    refresh();
  }, [refresh]);

  const resume = useCallback(() => {
    const p = readPersistedTimer();
    if (!p?.active || !p.paused || p.pausedRemainingMs === null) return;
    writePersistedTimer({
      ...p,
      paused: false,
      targetEndTime: Date.now() + p.pausedRemainingMs,
      pausedRemainingMs: null,
    });
    refresh();
  }, [refresh]);

  const reset = useCallback(() => {
    writePersistedTimer(null);
    refresh();
  }, [refresh]);

  const setDuration = useCallback((d: number) => {
    durationRef.current = d;
  }, []);

  return {
    display: fmtTime(state.remainingSec),
    displaySeconds: state.remainingSec,
    remainingMs: state.remainingMs,
    isRunning: state.isRunning,
    isPaused: state.isPaused,
    isComplete: state.isComplete,
    duration: state.duration,
    start,
    pause,
    resume,
    reset,
    cancelTimer: reset,
    clearCompletedTimer: reset,
    setDuration,
  };
}
