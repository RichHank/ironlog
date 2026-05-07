import { useRef, useCallback, useEffect } from 'react';

// Screen Wake Lock with video-based fallback (NoSleep.js approach).
// iOS Safari 18.4+ supports Wake Lock API; older versions need video trick.

let wakeLock: WakeLockSentinel | null = null;
let videoEl: HTMLVideoElement | null = null;

async function requestWakeLock(): Promise<boolean> {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
      return true;
    } catch { /* fall through to video fallback */ }
  }
  return false;
}

function startVideoKeepAwake(): void {
  if (videoEl) return;
  videoEl = document.createElement('video');
  videoEl.setAttribute('playsinline', '');
  videoEl.setAttribute('muted', '');
  videoEl.setAttribute('loop', '');
  videoEl.style.position = 'fixed';
  videoEl.style.bottom = '0';
  videoEl.style.right = '0';
  videoEl.style.width = '1px';
  videoEl.style.height = '1px';
  videoEl.style.opacity = '0.01';
  videoEl.style.pointerEvents = 'none';
  // Minimal valid MP4 (black frame, ~1s)
  videoEl.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAAhtZGF0AAAAAAAB';
  document.body.appendChild(videoEl);
  videoEl.play().catch(() => {});
}

function stopVideoKeepAwake(): void {
  if (videoEl) {
    videoEl.pause();
    videoEl.remove();
    videoEl = null;
  }
}

async function releaseWakeLock(): Promise<void> {
  try { if (wakeLock) { await wakeLock.release(); wakeLock = null; } } catch {}
  stopVideoKeepAwake();
}

export function useWakeLock() {
  const active = useRef(false);

  const acquire = useCallback(async () => {
    if (active.current) return;
    active.current = true;
    const locked = await requestWakeLock();
    if (!locked) startVideoKeepAwake();
  }, []);

  const release = useCallback(async () => {
    active.current = false;
    await releaseWakeLock();
  }, []);

  useEffect(() => () => { releaseWakeLock(); }, []);

  return { acquire, release };
}
