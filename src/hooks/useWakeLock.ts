import { useRef, useCallback, useEffect } from 'react';

// Screen Wake Lock API to prevent screen dimming during workout sets.
// Falls back to a silent audio loop if Wake Lock is rejected (iOS WebKit limitation).

let wakeLock: WakeLockSentinel | null = null;
let audioCtx: AudioContext | null = null;
let silentBuffer: AudioBuffer | null = null;
let silentSource: AudioBufferSourceNode | null = null;

async function requestWakeLock(): Promise<boolean> {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
      return true;
    } catch {
      // Fall through to audio fallback
    }
  }
  return false;
}

async function startSilentAudio(): Promise<boolean> {
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    // 0.1s silent buffer at a very low sample rate
    const sampleRate = audioCtx.sampleRate;
    const length = Math.floor(sampleRate * 0.1);
    silentBuffer = audioCtx.createBuffer(1, length, sampleRate);

    // Loop the silent buffer
    silentSource = audioCtx.createBufferSource();
    silentSource.buffer = silentBuffer;
    silentSource.loop = true;
    silentSource.connect(audioCtx.destination);
    silentSource.start();
    return true;
  } catch {
    return false;
  }
}

function stopSilentAudio(): void {
  try {
    if (silentSource) {
      silentSource.stop();
      silentSource.disconnect();
      silentSource = null;
    }
  } catch {}
}

async function releaseWakeLock(): Promise<void> {
  try {
    if (wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {}
  stopSilentAudio();
}

export function useWakeLock() {
  const active = useRef(false);

  const acquire = useCallback(async () => {
    if (active.current) return;
    active.current = true;

    const locked = await requestWakeLock();
    if (!locked) {
      await startSilentAudio();
    }
  }, []);

  const release = useCallback(async () => {
    active.current = false;
    await releaseWakeLock();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      active.current = false;
      releaseWakeLock();
      if (audioCtx) {
        audioCtx.close().catch(() => {});
        audioCtx = null;
      }
    };
  }, []);

  return { acquire, release };
}
