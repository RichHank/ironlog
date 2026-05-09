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

export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

// Chrome's Web Share API enforces an MIME allowlist for files. The
// official FIT MIME isn't on it, so canShare({files}) returns false
// and the share sheet never appears. octet-stream is on the allowlist
// and Garmin Connect Mobile's intent filter matches the .fit extension
// regardless, so the receiver behavior is identical.
const SHARE_MIMES = ['application/vnd.ant.fit', 'application/octet-stream'] as const;

type SharingNavigator = Navigator & {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
};

// Cast: TS lib types Uint8Array as Uint8Array<ArrayBufferLike> which
// doesn't structurally satisfy BlobPart's ArrayBufferView<ArrayBuffer>,
// but Blob accepts any ArrayBufferView at runtime.
function fileFor(bytes: Uint8Array, filename: string, mime: string): File {
  return new File([new Blob([bytes as BlobPart], { type: mime })], filename, { type: mime });
}

async function tryShare(
  nav: SharingNavigator,
  file: File,
): Promise<ShareResult | null> {
  if (!nav.share || !nav.canShare) return null;
  const shareData: ShareData = { files: [file], title: 'IronLog Workout' };
  if (!nav.canShare(shareData)) return null;
  try {
    await nav.share(shareData);
    return 'shared';
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
    return null;
  }
}

export async function shareWorkoutAsFit(session: WorkoutSession): Promise<ShareResult> {
  const settings = loadSettings();
  const bytes = encodeWorkoutAsFit(session, { weightUnit: settings.weightUnit });
  const filename = fitFilenameFor(session);
  const nav = navigator as SharingNavigator;

  for (const mime of SHARE_MIMES) {
    const result = await tryShare(nav, fileFor(bytes, filename, mime));
    if (result) return result;
  }

  // Download fallback. MIME doesn't matter here — the receiver opens by
  // file extension.
  const blob = new Blob([bytes as BlobPart], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
