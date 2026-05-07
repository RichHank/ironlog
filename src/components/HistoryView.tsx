import { WorkoutSession } from '../types';
import { groupByDate, formatDate } from '../utils';

type Props = {
  sessions: WorkoutSession[];
  onSelect: (id: string) => void;
};

function workoutSummary(session: WorkoutSession): { sets: number; volume: number; exercises: string } {
  let sets = 0, volume = 0;
  const names: string[] = [];
  for (const ex of session.exercises) {
    sets += ex.sets.length;
    for (const set of ex.sets) {
      volume += (set.weight ?? 0) * (set.reps ?? 0);
    }
    if (ex.sets.length > 0) names.push(ex.name);
  }
  return { sets, volume, exercises: names.join(', ') };
}

export default function HistoryView({ sessions, onSelect }: Props) {
  const grouped = groupByDate(sessions);

  if (sessions.length === 0) {
    return (
      <div className="px-3 pt-4 sm:px-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">History</p>
        <div className="py-16 text-center">
          <span className="text-4xl">📋</span>
          <p className="mt-3 text-sm text-zinc-400">No workouts yet</p>
          <p className="text-xs text-zinc-500 mt-1">Complete a workout to see it here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pt-4 sm:px-4">
      <div className="mb-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">History</p>
        <p className="text-lg font-black text-zinc-50">{sessions.length} workout{sessions.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex flex-col gap-4">
        {Array.from(grouped.entries()).map(([date, group]) => (
          <div key={date}>
            <p className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">{date}</p>
            <div className="flex flex-col gap-2">
              {group.map(session => {
                const { sets, volume, exercises } = workoutSummary(session);
                return (
                  <button
                    key={session.id}
                    onClick={() => onSelect(session.id)}
                    className="card p-4 text-left active:bg-zinc-800/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-zinc-50 truncate">
                          {session.name ?? formatDate(session.startedAt)}
                        </p>
                        <p className="text-xs text-zinc-500 truncate mt-0.5">{exercises}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 text-right">
                        <div>
                          <p className="text-xs text-zinc-600">Sets</p>
                          <p className="text-sm font-bold text-zinc-300">{sets}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-600">Vol</p>
                          <p className="text-sm font-bold text-blue-400">{volume.toLocaleString()}</p>
                        </div>
                        {session.duration && (
                          <div>
                            <p className="text-xs text-zinc-600">Time</p>
                            <p className="text-sm font-bold text-zinc-400">{session.duration}m</p>
                          </div>
                        )}
                        <span className="text-zinc-600">→</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
