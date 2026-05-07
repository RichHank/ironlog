import { useMemo } from 'react';
import { WorkoutSession } from '../types';

type Props = {
  sessions: WorkoutSession[];
  onSelect: (id: string) => void;
};

export default function CalendarView({ sessions, onSelect }: Props) {
  const workoutDates = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>();
    for (const s of sessions) {
      const key = new Date(s.startedAt).toDateString();
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [sessions]);

  // Build calendar month data
  const today = new Date();
  const [year, month] = [today.getFullYear(), today.getMonth()];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = useMemo(() => {
    const days: { date: Date; isWorkout: boolean; sessions: WorkoutSession[] }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const key = date.toDateString();
      const daySessions = workoutDates.get(key) ?? [];
      days.push({ date, isWorkout: daySessions.length > 0, sessions: daySessions });
    }
    return days;
  }, [year, month, workoutDates, daysInMonth]);

  const monthName = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Activity heat calculation
  const maxSessions = Math.max(1, ...calendarDays.map(d => d.sessions.length));

  const getIntensity = (count: number): string => {
    if (count === 0) return 'bg-zinc-800/30';
    const pct = count / maxSessions;
    if (pct <= 0.25) return 'bg-blue-900/40';
    if (pct <= 0.5) return 'bg-blue-700/50';
    if (pct <= 0.75) return 'bg-blue-500/60';
    return 'bg-blue-400';
  };

  return (
    <div className="px-3 pt-4 sm:px-4">
      <div className="mb-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Calendar</p>
        <p className="text-lg font-black text-zinc-50">{monthName}</p>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map(d => (
          <p key={d} className="text-center text-[10px] font-medium text-zinc-600 uppercase">{d}</p>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for offset */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {calendarDays.map(({ date, isWorkout, sessions: daySessions }) => {
          const isToday = date.toDateString() === today.toDateString();
          const count = daySessions.length;
          const totalVolume = daySessions.reduce((s, w) =>
            s + w.exercises.reduce((es, e) =>
              es + e.sets.reduce((ss, set) => ss + (set.weight ?? 0) * (set.reps ?? 0), 0), 0
            ), 0
          );

          return (
            <div key={date.getTime()} className="relative">
              <button
                onClick={() => {
                  if (daySessions.length === 1) onSelect(daySessions[0].id);
                  else if (daySessions.length > 1) {
                    // Show list for multi-workout days — for simplicity pick first
                    onSelect(daySessions[0].id);
                  }
                }}
                disabled={!isWorkout}
                className={`aspect-square w-full rounded-lg flex flex-col items-center justify-center text-xs transition-colors ${
                  isWorkout ? `${getIntensity(count)} active:scale-95` : 'bg-zinc-800/20'
                } ${isToday ? 'ring-1 ring-blue-500' : ''}`}
              >
                <span className={`font-mono font-bold ${isWorkout ? 'text-white' : 'text-zinc-600'}`}>
                  {date.getDate()}
                </span>
                {isWorkout && count > 0 && (
                  <span className="text-[9px] text-zinc-200 mt-0.5">
                    {count > 1 ? `${count}w` : totalVolume > 0 ? `${(totalVolume / 1000).toFixed(0)}k` : '✓'}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 card p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Recent Workouts</p>
        <div className="flex flex-col gap-2">
          {sessions.slice(0, 10).map(s => {
            const sets = s.exercises.reduce((sum, e) => sum + e.sets.length, 0);
            const vol = s.exercises.reduce((sum, e) =>
              sum + e.sets.reduce((ss, set) => ss + (set.weight ?? 0) * (set.reps ?? 0), 0), 0
            );
            return (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className="flex items-center justify-between rounded-lg bg-zinc-800/30 px-3 py-2 text-left active:bg-zinc-700/30"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-200">
                    {s.name ?? new Date(s.startedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {s.exercises.map(e => e.name).join(', ')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-zinc-300">{sets} sets</p>
                  <p className="text-xs text-blue-400">{vol.toLocaleString()} lb</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
