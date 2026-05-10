// Share a workout as a .FIT file.
//
// On mobile, the native share sheet surfaces Garmin Connect Mobile
// as a target, which ingests the file with full structured strength
// data. From there, Garmin Connect's existing integrations fan out
// to Strava, Apple Health (iOS), and Health Connect (Android) for free.
//
// On desktop and on browsers without Web Share Level 2, we fall back
// to a plain download.

import type { WorkoutSession } from './types';
import { encodeWorkoutAsFit, fitFilenameFor } from './fit';
import { loadSettings } from './storage';

export interface ShareOutcome {
  result: 'shared' | 'downloaded' | 'cancelled';
  platform: 'android' | 'ios' | 'other';
  /** Diagnostic: which MIMEs canShare accepted, plus any errors. */
  trace: string;
}

function detectPlatform(): 'android' | 'ios' | 'other' {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/ipad|iphone|ipod/i.test(ua)) return 'ios';
  return 'other';
}

// Try MIMEs in order of fidelity → permissiveness. Garmin Connect Mobile's
// Android intent filter matches the .fit extension, so the receiver
// behavior is identical regardless of which MIME ends up on the wire.
const SHARE_MIMES = [
  'application/vnd.ant.fit',
  'application/octet-stream',
  'application/zip',
  'text/plain',
] as const;

type SharingNavigator = Navigator & {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
};

function fileFor(bytes: Uint8Array, filename: string, mime: string): File {
  return new File([new Blob([bytes as BlobPart], { type: mime })], filename, { type: mime });
}

function triggerDownload(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// CRITICAL: this is a non-async function and runs synchronously up to
// the navigator.share() call. The Promise from share() is then chained
// via .then/.catch. This preserves Chrome's transient user activation
// across the whole click-to-share path. Wrapping any of this in
// `async/await` causes Chrome to throw NotAllowedError because each
// `await` is treated as having let activation expire.
export function shareWorkoutAsFit(session: WorkoutSession): Promise<ShareOutcome> {
  const settings = loadSettings();
  const bytes = encodeWorkoutAsFit(session, { weightUnit: settings.weightUnit });
  const filename = fitFilenameFor(session);
  const platform = detectPlatform();
  const nav = navigator as SharingNavigator;

  // Garmin Connect on Android only registers ACTION_VIEW (open with), never
  // ACTION_SEND (share sheet). The Web Share API fires ACTION_SEND, so Garmin
  // Connect will never appear in the Android share sheet regardless of MIME
  // type. Skip the share sheet on Android and download directly so the user
  // can open the file from Downloads with "Open with Garmin Connect."
  if (platform === 'android') {
    triggerDownload(bytes, filename);
    return Promise.resolve({ result: 'downloaded', platform, trace: 'android-direct-download' });
  }

  // Navigator methods need `this` bound to navigator. Detaching them into
  // bare consts (`const share = nav.share`) strips the binding and every
  // call throws TypeError: Illegal invocation. .bind(nav) reattaches it.
  const share = nav.share?.bind(nav);
  const canShare = nav.canShare?.bind(nav);
  const trace: string[] = [`share=${!!share} canShare=${!!canShare}`];

  if (!share || !canShare) {
    triggerDownload(bytes, filename);
    return Promise.resolve({ result: 'downloaded', platform, trace: trace.join(' ') });
  }

  let chosen: File | null = null;
  for (const mime of SHARE_MIMES) {
    const file = fileFor(bytes, filename, mime);
    const can = canShare({ files: [file] });
    trace.push(`${mime}:${can ? 'ok' : 'no'}`);
    if (can) { chosen = file; break; }
  }

  if (chosen === null) {
    triggerDownload(bytes, filename);
    return Promise.resolve({ result: 'downloaded', platform, trace: trace.join(' ') });
  }

  return share({ files: [chosen], title: 'IronLog Workout' })
    .then((): ShareOutcome => ({ result: 'shared', platform, trace: trace.join(' ') }))
    .catch((err: unknown): ShareOutcome => {
      if (err instanceof Error && err.name === 'AbortError') {
        return { result: 'cancelled', platform, trace: trace.join(' ') };
      }
      trace.push(`share-err:${err instanceof Error ? err.name : 'unknown'}`);
      triggerDownload(bytes, filename);
      return { result: 'downloaded', platform, trace: trace.join(' ') };
    });
}
