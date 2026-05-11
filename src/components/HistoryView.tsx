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
        <p className="text-xs text-vapor-muted uppercase tracking-wider">History</p>
        <div className="py-16 text-center">
          <div className="flex justify-center mb-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="#00f5ff" strokeWidth="1" className="w-20 h-20 drop-shadow-[0_0_15px_rgba(0,245,255,0.8)]">
              <rect x="5" y="3" width="14" height="19" rx="2" />
              <line x1="8" y1="7" x2="16" y2="7" />
              <line x1="8" y1="11" x2="16" y2="11" />
              <line x1="8" y1="15" x2="12" y2="15" />
              <path d="M9 3V1h6v2" />
            </svg>
          </div>
          <p className="mt-3 text-sm text-vapor-muted">No workouts yet</p>
          <p className="text-xs text-vapor-muted mt-1">Complete a workout to see it here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pt-4 sm:px-4">
      <div className="mb-4">
        <p className="text-xs text-vapor-muted uppercase tracking-wider">History</p>
        <p className="text-lg font-black text-vapor-pink">{sessions.length} workout{sessions.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex flex-col gap-4">
        {Array.from(grouped.entries()).map(([date, group]) => (
          <div key={date}>
            <p className="mb-2 text-xs font-semibold text-vapor-muted uppercase tracking-wider">{date}</p>
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
                        <p className="text-sm font-bold text-vapor-pink truncate">
                          {session.name ?? formatDate(session.startedAt)}
                        </p>
                        <p className="text-xs text-vapor-muted truncate mt-0.5">{exercises}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 text-right">
                        <div>
                          <p className="text-xs text-vapor-muted/80">Sets</p>
                          <p className="text-sm font-bold text-vapor-light">{sets}</p>
                        </div>
                        <div>
                          <p className="text-xs text-vapor-muted/80">Vol</p>
                          <p className="text-sm font-bold text-vapor-cyan">{volume.toLocaleString()}</p>
                        </div>
                        {session.duration && (
                          <div>
                            <p className="text-xs text-vapor-muted/80">Time</p>
                            <p className="text-sm font-bold text-vapor-muted">{session.duration}m</p>
                          </div>
                        )}
                        <span className="text-vapor-muted/80">→</span>
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
