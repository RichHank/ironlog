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

const FIT_MIME = 'application/vnd.ant.fit';

export async function shareWorkoutAsFit(session: WorkoutSession): Promise<ShareResult> {
  const settings = loadSettings();
  const bytes = encodeWorkoutAsFit(session, { weightUnit: settings.weightUnit });
  const filename = fitFilenameFor(session);
  // Cast: TS lib types Uint8Array as Uint8Array<ArrayBufferLike> which
  // doesn't structurally satisfy BlobPart's ArrayBufferView<ArrayBuffer>,
  // but Blob accepts any ArrayBufferView at runtime.
  const blob = new Blob([bytes as BlobPart], { type: FIT_MIME });

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  if (nav.share && nav.canShare) {
    try {
      const file = new File([blob], filename, { type: FIT_MIME });
      const shareData: ShareData = { files: [file], title: 'IronLog Workout' };
      if (nav.canShare(shareData)) {
        await nav.share(shareData);
        return 'shared';
      }
    } catch (err) {
      // User dismissing the share sheet throws AbortError — not a failure.
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
      // Anything else: drop through to the download path.
    }
  }

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
