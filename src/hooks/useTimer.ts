import { useState, useRef, useCallback, useEffect } from 'react';

export function useTimer(defaultDuration = 90) {
  const [display, setDisplay] = useState('0:00');
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const durationRef = useRef(defaultDuration);
  const targetRef = useRef(0);
  const rafRef = useRef(0);

  const tick = useCallback(() => {
    const remaining = Math.max(0, Math.ceil((targetRef.current - Date.now()) / 1000));
    setDisplaySeconds(remaining);
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    setDisplay(`${m}:${s.toString().padStart(2, '0')}`);
    if (remaining <= 0) {
      setIsRunning(false);
      setIsPaused(false);
      cancelAnimationFrame(rafRef.current);
    } else {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, []);

  const start = useCallback((duration?: number) => {
    const d = duration ?? durationRef.current;
    durationRef.current = d;
    targetRef.current = Date.now() + d * 1000;
    setIsRunning(true);
    setIsPaused(false);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    setIsPaused(true);
    setIsRunning(false);
    cancelAnimationFrame(rafRef.current);
    const remaining = Math.max(0, targetRef.current - Date.now());
    durationRef.current = Math.ceil(remaining / 1000);
  }, []);

  const resume = useCallback(() => {
    targetRef.current = Date.now() + durationRef.current * 1000;
    setIsRunning(true);
    setIsPaused(false);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setIsRunning(false);
    setIsPaused(false);
    setDisplay('0:00');
    setDisplaySeconds(0);
    durationRef.current = defaultDuration;
  }, [defaultDuration]);

  const setDuration = useCallback((d: number) => {
    durationRef.current = d;
  }, []);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return { display, displaySeconds, isRunning, isPaused, duration: durationRef.current, start, pause, resume, reset, setDuration };
}
