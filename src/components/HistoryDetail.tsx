import { useState } from 'react';
import { WorkoutSession, WorkoutSet } from '../types';
import { formatDate, formatTime, formatDuration, est1RM, formatWeightCell } from '../utils';
import { loadSettings } from '../storage';
import { shareWorkoutAsFit, type ShareOutcome } from '../share';

type Props = {
  session: WorkoutSession;
  onBack: () => void;
  onDelete: (id: string) => void;
  onUpdateSet: (sessionId: string, exerciseId: string, set: WorkoutSet) => void;
  onPushToStrava: (sessionId: string) => Promise<void>;
  onShareDone: (outcome: ShareOutcome) => void;
};

export default function HistoryDetail({ session, onBack, onDelete, onUpdateSet, onPushToStrava, onShareDone }: Props) {
  const unit = loadSettings().weightUnit;
  const [editing, setEditing] = useState<{ exId: string; setId: string } | null>(null);
  const [draft, setDraft] = useState<{ weight: string; reps: string; rpe: string }>({ weight: '', reps: '', rpe: '' });
  const [pushing, setPushing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showGarminHelp, setShowGarminHelp] = useState(false);

  const handlePush = async () => {
    setPushing(true);
    try { await onPushToStrava(session.id); } finally { setPushing(false); }
  };

  // CRITICAL: this is a non-async handler so navigator.share() runs in the
  // same synchronous tick as the user's tap, preserving Chrome's transient
  // user activation. Wrapping the chain in async/await across multiple
  // functions caused share() to throw NotAllowedError on Pixel/Chrome.
  const handleShare = () => {
    setSharing(true);
    let settled = false;
    const settle = (outcome: ShareOutcome) => {
      if (settled) return;
      settled = true;
      setSharing(false);
      onShareDone(outcome);
    };
    // Watchdog — if share() neither resolves nor rejects within 15s
    // (e.g. silently swallowed by the PWA standalone context), unstick
    // the button and report a timeout so we can see what's going on.
    const watchdog = window.setTimeout(() => {
      settle({ result: 'downloaded', platform: 'other', trace: 'timeout:share-never-settled' });
    }, 15000);
    try {
      shareWorkoutAsFit(session)
        .then((outcome) => {
          window.clearTimeout(watchdog);
          if (outcome.result === 'downloaded' && outcome.platform === 'android') {
            setSharing(false);
            setShowGarminHelp(true);
          } else {
            settle(outcome);
          }
        })
        .catch((err: unknown) => {
          window.clearTimeout(watchdog);
          settle({
            result: 'downloaded',
            platform: 'other',
            trace: `chain-err:${err instanceof Error ? err.name : 'unknown'}`,
          });
        });
    } catch (err: unknown) {
      window.clearTimeout(watchdog);
      settle({
        result: 'downloaded',
        platform: 'other',
        trace: `sync-throw:${err instanceof Error ? err.name + ':' + err.message : 'unknown'}`,
      });
    }
  };

  const totalSets = session.exercises.reduce((s, e) => s + e.sets.length, 0);
  const totalVolume = session.exercises.reduce((s, e) =>
    s + e.sets.reduce((ss, set) => ss + (set.weight ?? 0) * (set.reps ?? 0), 0), 0
  );

  const startEdit = (exId: string, set: WorkoutSet) => {
    setEditing({ exId, setId: set.id });
    setDraft({ weight: set.weight?.toString() ?? '', reps: set.reps?.toString() ?? '', rpe: set.rpe?.toString() ?? '' });
  };

  const saveEdit = () => {
    if (!editing) return;
    const ex = session.exercises.find(e => e.id === editing.exId);
    const set = ex?.sets.find(s => s.id === editing.setId);
    if (!set) return;
    onUpdateSet(session.id, editing.exId, {
      ...set,
      weight: draft.weight ? Number(draft.weight) : null,
      reps: draft.reps ? Number(draft.reps) : null,
      rpe: draft.rpe ? Number(draft.rpe) : null,
    });
    setEditing(null);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-zinc-950">
      <div className="safe-area-top border-b border-zinc-800 bg-zinc-950 px-4 pb-3">
        <div className="flex items-center justify-between gap-3 mb-1">
          <button onClick={onBack} className="min-h-touch text-blue-400 font-semibold text-sm">← Back</button>
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              disabled={sharing}
              title="Generate a .FIT file and share to Garmin Connect (or download)"
              className="min-h-touch rounded-lg bg-zinc-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            >
              {sharing ? '…' : 'Send .FIT'}
            </button>
            {session.stravaActivityId ? (
              <a
                href={`https://www.strava.com/activities/${session.stravaActivityId}`}
                target="_blank"
                rel="noreferrer"
                className="min-h-touch rounded-lg bg-[#fc4c02] px-3 py-1.5 text-xs font-bold text-white"
              >
                On Strava ↗
              </a>
            ) : (
              <button
                onClick={handlePush}
                disabled={pushing}
                className="min-h-touch rounded-lg bg-[#fc4c02] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              >
                {pushing ? 'Pushing…' : 'Push to Strava'}
              </button>
            )}
            <button onClick={() => onDelete(session.id)} className="btn-danger min-h-touch px-3 py-1.5 text-xs">Delete</button>
          </div>
        </div>
        {showGarminHelp && (
          <div className="mt-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-3 text-xs text-cyan-300">
            <p className="font-bold mb-1">FIT file downloaded!</p>
            <p className="mb-2 text-cyan-400/80">Garmin Connect doesn&apos;t accept shared files on Android. To import:</p>
            <ol className="list-decimal list-inside space-y-1 text-cyan-400/80 mb-3">
              <li>Open your <span className="text-cyan-300 font-semibold">Downloads</span> folder</li>
              <li>Tap the <span className="text-cyan-300 font-semibold">.fit</span> file</li>
              <li>Choose <span className="text-cyan-300 font-semibold">Open with → Garmin Connect</span></li>
            </ol>
            <div className="flex gap-2">
              <a
                href="https://connect.garmin.com/modern/import-data"
                target="_blank"
                rel="noreferrer"
                className="rounded bg-cyan-600 px-3 py-1.5 font-bold text-white"
              >
                Or upload at Garmin Connect ↗
              </a>
              <button
                onClick={() => setShowGarminHelp(false)}
                className="rounded bg-zinc-700 px-3 py-1.5 text-zinc-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        <h2 className="text-xl font-black text-zinc-50">{session.name ?? formatDate(session.startedAt)}</h2>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-500">
          <span>{formatDate(session.startedAt)} · {formatTime(session.startedAt)}</span>
          {session.duration && <span>{formatDuration(session.duration)}</span>}
          <span>{totalSets} set{totalSets !== 1 ? 's' : ''}</span>
          <span className="text-blue-400 font-semibold">{totalVolume.toLocaleString()} {unit}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {session.exercises.map((ex, ei) => {
          const exVolume = ex.sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0);
          return (
            <div key={ex.id} className="mt-4 card p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Exercise {ei + 1}</p>
                  <p className="text-base font-bold text-zinc-50">{ex.name}</p>
                </div>
                <div className="flex gap-2">
                  <span className="chip bg-zinc-800 text-zinc-400">{ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}</span>
                  {exVolume > 0 && <span className="chip bg-blue-500/10 text-blue-400">{exVolume.toLocaleString()} {unit}</span>}
                </div>
              </div>

              {ex.sets.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-zinc-500 uppercase tracking-wider">
                      <th className="py-1.5 pr-2 text-left font-medium">Set</th>
                      <th className="py-1.5 px-2 text-right font-medium">Weight</th>
                      <th className="py-1.5 px-2 text-right font-medium">Reps</th>
                      <th className="py-1.5 px-2 text-right font-medium">RPE</th>
                      <th className="py-1.5 px-2 text-right font-medium">1RM</th>
                      <th className="py-1.5 px-1 text-right font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ex.sets.map((set, si) => {
                      const e1rm = set.weight && set.reps ? est1RM(set.weight, set.reps) : 0;
                      const isEditing = editing?.exId === ex.id && editing?.setId === set.id;
                      return isEditing ? (
                        <tr key={set.id} className="border-t border-zinc-800/40">
                          <td className="py-1.5 pr-2 text-zinc-400">{si + 1}</td>
                          <td className="py-1.5 px-1">
                            <input type="number" inputMode="decimal" value={draft.weight}
                              onChange={e => setDraft(p => ({ ...p, weight: e.target.value }))}
                              className="w-16 input-field px-1.5 py-1 text-right text-xs font-mono" placeholder="BW" />
                          </td>
                          <td className="py-1.5 px-1">
                            <input type="number" inputMode="numeric" value={draft.reps}
                              onChange={e => setDraft(p => ({ ...p, reps: e.target.value }))}
                              className="w-12 input-field px-1.5 py-1 text-right text-xs font-mono" />
                          </td>
                          <td className="py-1.5 px-1">
                            <input type="number" inputMode="decimal" value={draft.rpe}
                              onChange={e => setDraft(p => ({ ...p, rpe: e.target.value }))}
                              className="w-12 input-field px-1.5 py-1 text-right text-xs font-mono" />
                          </td>
                          <td className="py-1.5 px-1"></td>
                          <td className="py-1.5 px-1">
                            <div className="flex gap-1">
                              <button onClick={saveEdit} className="rounded bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">Save</button>
                              <button onClick={() => setEditing(null)} className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">Cancel</button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={set.id} className="border-t border-zinc-800/40 group">
                          <td className="py-1.5 pr-2 text-zinc-400">
                            {si + 1}
                            {set.type !== 'normal' && (
                              <span className={`ml-1.5 chip text-[10px] ${
                                set.type === 'warmup' ? 'bg-amber-500/10 text-amber-400' :
                                set.type === 'drop' ? 'bg-purple-500/10 text-purple-400' :
                                'bg-red-500/10 text-red-400'
                              }`}>{set.type}</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono text-zinc-200">{formatWeightCell(set.weight, ex.exerciseKey)}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-zinc-200">{set.reps ?? '-'}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-zinc-500">{set.rpe ? `@${set.rpe}` : '-'}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-blue-400">{e1rm > 0 ? e1rm : ''}</td>
                          <td className="py-1.5 px-1 text-right">
                            <button onClick={() => startEdit(ex.id, set)} className="text-xs text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {ex.notes && (
                <p className="mt-3 rounded-lg bg-zinc-800/50 px-3 py-2 text-xs text-zinc-400">{ex.notes}</p>
              )}
            </div>
          );
        })}

        {session.notes && (
          <div className="mt-4 card p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-zinc-300">{session.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
