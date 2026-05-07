import { WorkoutSession, WorkoutSet } from '../types';
import { formatDate, formatTime, formatDuration, est1RM } from '../utils';

type Props = {
  session: WorkoutSession;
  onBack: () => void;
  onDelete: (id: string) => void;
  onUpdateSet: (sessionId: string, exerciseId: string, set: WorkoutSet) => void;
};

export default function HistoryDetail({ session, onBack, onDelete, onUpdateSet }: Props) {
  const totalSets = session.exercises.reduce((s, e) => s + e.sets.length, 0);
  const totalVolume = session.exercises.reduce((s, e) =>
    s + e.sets.reduce((ss, set) => ss + (set.weight ?? 0) * (set.reps ?? 0), 0), 0
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-zinc-950">
      {/* Header */}
      <div className="safe-area-top border-b border-zinc-800 bg-zinc-950 px-4 pb-3">
        <div className="flex items-center justify-between gap-3 mb-1">
          <button onClick={onBack} className="min-h-touch text-blue-400 font-semibold text-sm">← Back</button>
          <button onClick={() => onDelete(session.id)} className="btn-danger min-h-touch px-3 py-1.5 text-xs">Delete</button>
        </div>
        <h2 className="text-xl font-black text-zinc-50">{session.name ?? formatDate(session.startedAt)}</h2>
        <div className="mt-1 flex gap-4 text-xs text-zinc-500">
          <span>{formatDate(session.startedAt)} · {formatTime(session.startedAt)}</span>
          {session.duration && <span>{formatDuration(session.duration)}</span>}
          <span>{totalSets} set{totalSets !== 1 ? 's' : ''}</span>
          <span className="text-blue-400 font-semibold">{totalVolume.toLocaleString()} lb</span>
        </div>
      </div>

      {/* Exercises */}
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
                  {exVolume > 0 && <span className="chip bg-blue-500/10 text-blue-400">{exVolume.toLocaleString()} lb</span>}
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
                    </tr>
                  </thead>
                  <tbody>
                    {ex.sets.map((set, si) => {
                      const e1rm = set.weight && set.reps ? est1RM(set.weight, set.reps) : 0;
                      return (
                        <tr key={set.id} className="border-t border-zinc-800/40">
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
                          <td className="py-1.5 px-2 text-right font-mono text-zinc-200">{set.weight ?? 'BW'}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-zinc-200">{set.reps ?? '-'}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-zinc-500">{set.rpe ? `@${set.rpe}` : '-'}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-blue-400">{e1rm > 0 ? e1rm : ''}</td>
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
