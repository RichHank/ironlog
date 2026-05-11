import { useState, useMemo } from 'react';
import { WorkoutSession } from '../types';
import { loadSettings } from '../storage';

type Props = {
  sessions: WorkoutSession[];
  onSelect: (id: string) => void;
};

export default function CalendarView({ sessions, onSelect }: Props) {
  const unit = loadSettings().weightUnit;
  const today = new Date();
  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());

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

  const prevMonth = () => {
    if (displayMonth === 0) { setDisplayMonth(11); setDisplayYear(y => y - 1); }
    else setDisplayMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (displayMonth === 11) { setDisplayMonth(0); setDisplayYear(y => y + 1); }
    else setDisplayMonth(m => m + 1);
  };

  const firstDay = new Date(displayYear, displayMonth, 1).getDay();
  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();

  const calendarDays = useMemo(() => {
    const days: { date: Date; isWorkout: boolean; sessions: WorkoutSession[] }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(displayYear, displayMonth, d);
      const key = date.toDateString();
      const daySessions = workoutDates.get(key) ?? [];
      days.push({ date, isWorkout: daySessions.length > 0, sessions: daySessions });
    }
    return days;
  }, [displayYear, displayMonth, workoutDates, daysInMonth]);

  const monthName = new Date(displayYear, displayMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const maxSessions = Math.max(1, ...calendarDays.map(d => d.sessions.length));

  const getIntensity = (count: number): string => {
    if (count === 0) return 'border-[#00f5ff]/20 bg-[#05050A]/60';
    const pct = count / maxSessions;
    if (pct <= 0.25) return 'bg-[#ff2aa3]/40 border-[#ff2aa3]/60 shadow-[0_0_5px_rgba(255,42,163,0.3)]';
    if (pct <= 0.5) return 'bg-[#ff2aa3]/60 border-[#ff2aa3]/80 shadow-[0_0_8px_rgba(255,42,163,0.5)]';
    if (pct <= 0.75) return 'bg-[#ff2aa3]/80 border-[#ff2aa3] shadow-[0_0_12px_rgba(255,42,163,0.6)]';
    return 'bg-[#ff2aa3] border-[#ff2aa3] shadow-[0_0_20px_rgba(255,42,163,0.9)]';
  };

  return (
    <div className="px-3 pt-4 sm:px-4">
      <div className="mb-4">
        <p className="text-xs text-vapor-muted uppercase tracking-wider">Calendar</p>
        <div className="flex items-center justify-between gap-2">
          <button onClick={prevMonth} className="min-h-touch rounded-lg bg-vapor-navy px-3 py-1.5 text-sm font-semibold text-vapor-light active:bg-zinc-700">
            ←
          </button>
          <p className="text-lg font-black text-vapor-pink">{monthName}</p>
          <button onClick={nextMonth} className="min-h-touch rounded-lg bg-vapor-navy px-3 py-1.5 text-sm font-semibold text-vapor-light active:bg-zinc-700">
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map(d => (
          <p key={d} className="text-center text-[10px] font-medium text-vapor-muted/80 uppercase">{d}</p>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
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
            <div key={date.getTime()}>
              <button
                onClick={() => { if (daySessions.length > 0) onSelect(daySessions[0].id); }}
                disabled={!isWorkout}
                className={`aspect-square w-full rounded-sm border flex flex-col items-center justify-center text-xs transition-colors backdrop-blur-sm ${
                  isWorkout ? `${getIntensity(count)} active:scale-95` : 'border-[#00f5ff]/20 bg-[#05050A]/80 hover:bg-[#00f5ff]/10'
                } ${isToday && !isWorkout ? 'border-[#00f5ff] shadow-[0_0_15px_rgba(0,245,255,0.6)]' : ''} ${isToday && isWorkout ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0f]' : ''}`}
              >
                <span className={`font-mono text-[14px] ${isWorkout ? 'text-white font-bold text-shadow-[0_0_5px_white]' : 'text-[#00f5ff]/60'}`}>
                  {date.getDate()}
                </span>
                {isWorkout && count > 0 && (
                  <span className="text-[9px] text-[#00f5ff] font-bold mt-0.5 mix-blend-screen drop-shadow-[0_0_2px_#00f5ff]">
                    {count > 1 ? `${count}w` : totalVolume > 0 ? `${(totalVolume / 1000).toFixed(0)}k` : '✓'}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 card p-4">
        <p className="text-xs text-vapor-muted uppercase tracking-wider mb-2">Recent Workouts</p>
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
                className="flex items-center justify-between rounded-lg bg-vapor-navy/30 px-3 py-2 text-left active:bg-zinc-700/30"
              >
                <div>
                  <p className="text-sm font-semibold text-vapor-cyan">
                    {s.name ?? new Date(s.startedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-vapor-muted">
                    {s.exercises.map(e => e.name).join(', ')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-vapor-light">{sets} sets</p>
                  <p className="text-xs text-vapor-cyan">{vol.toLocaleString()} {unit}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
