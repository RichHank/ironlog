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
  /** Diagnostic: which MIMEs were tried and what canShare returned for each. */
  trace: string;
}

// Chrome's Web Share API enforces an MIME allowlist for files. The
// official FIT MIME isn't on it, so canShare({files}) returns false
// silently. Try a chain of MIMEs in order of fidelity → permissiveness.
// Garmin Connect Mobile's intent filter matches the .fit extension,
// so receiver behavior is identical regardless of which MIME shipped.
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

export async function shareWorkoutAsFit(session: WorkoutSession): Promise<ShareOutcome> {
  const settings = loadSettings();
  const bytes = encodeWorkoutAsFit(session, { weightUnit: settings.weightUnit });
  const filename = fitFilenameFor(session);
  const nav = navigator as SharingNavigator;

  const trace: string[] = [];
  const hasShare = !!nav.share;
  const hasCanShare = !!nav.canShare;
  trace.push(`share=${hasShare} canShare=${hasCanShare}`);

  if (hasShare && hasCanShare) {
    for (const mime of SHARE_MIMES) {
      const file = fileFor(bytes, filename, mime);
      const can = nav.canShare!({ files: [file] });
      trace.push(`${mime}:${can ? 'ok' : 'no'}`);
      if (!can) continue;
      try {
        await nav.share!({ files: [file], title: 'IronLog Workout' });
        return { result: 'shared', trace: trace.join(' ') };
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return { result: 'cancelled', trace: trace.join(' ') };
        }
        trace.push(`share-err:${err instanceof Error ? err.name : 'unknown'}`);
      }
    }
  }

  const blob = new Blob([bytes as BlobPart], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { result: 'downloaded', trace: trace.join(' ') };
}
