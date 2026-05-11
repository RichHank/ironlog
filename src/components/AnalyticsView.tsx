import { useMemo, useState } from 'react';
import { WorkoutSession } from '../types';
import { loadPRs, recalcPRs } from '../storage';
import { est1RM, getExerciseVolumeOverTime, getExerciseHistory, muscleGroupVolume } from '../utils';
import { EXERCISES } from '../exerciseData';

type Props = {
  sessions: WorkoutSession[];
};

export default function AnalyticsView({ sessions }: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [prVersion, setPrVersion] = useState(0);
  const prs = useMemo(() => loadPRs(), [sessions, prVersion]);

  const filteredSessions = useMemo(() => {
    if (selectedPeriod === 'all') return sessions;
    const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
    const cutoff = Date.now() - days * 86400000;
    return sessions.filter(s => s.startedAt > cutoff);
  }, [sessions, selectedPeriod]);

  const stats = useMemo(() => {
    let totalWorkouts = filteredSessions.length;
    let totalSets = 0, totalVolume = 0;
    for (const s of filteredSessions) {
      for (const ex of s.exercises) {
        totalSets += ex.sets.length;
        for (const set of ex.sets) {
          totalVolume += (set.weight ?? 0) * (set.reps ?? 0);
        }
      }
    }
    return { totalWorkouts, totalSets, totalVolume };
  }, [filteredSessions]);

  const muscleVolumes = useMemo(() => muscleGroupVolume(filteredSessions), [filteredSessions]);
  const topMuscles = useMemo(() =>
    Array.from(muscleVolumes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
  , [muscleVolumes]);

  const maxVol = Math.max(1, ...topMuscles.map(([, v]) => v));

  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const exerciseTrend = useMemo(() =>
    selectedExercise ? getExerciseVolumeOverTime(selectedExercise, sessions).slice(-14) : []
  , [selectedExercise, sessions]);

  const exercisePRs = useMemo(() =>
    selectedExercise ? prs.filter(p => p.exerciseKey === selectedExercise) : []
  , [selectedExercise, prs]);

  return (
    <div className="px-3 pt-4 sm:px-4 pb-4">
      <div className="mb-4">
        <p className="text-xs text-vapor-muted uppercase tracking-wider">Analytics</p>
        <p className="text-lg font-black text-vapor-pink">Training Stats</p>
      </div>

      {/* Period selector */}
      <div className="flex gap-1 mb-4">
        {(['7d', '30d', '90d', 'all'] as const).map(p => (
          <button
            key={p}
            onClick={() => setSelectedPeriod(p)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
              selectedPeriod === p ? 'bg-vapor-pink text-white' : 'bg-vapor-navy text-vapor-muted'
            }`}
          >
            {p === 'all' ? 'All' : p === '7d' ? 'Week' : p === '30d' ? 'Month' : 'Quarter'}
          </button>
        ))}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card p-3 text-center">
          <p className="text-xs text-vapor-muted uppercase tracking-wider">Workouts</p>
          <p className="text-xl font-black text-vapor-pink mt-1">{stats.totalWorkouts}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-vapor-muted uppercase tracking-wider">Sets</p>
          <p className="text-xl font-black text-vapor-pink mt-1">{stats.totalSets}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-vapor-muted uppercase tracking-wider">Volume</p>
          <p className="text-lg font-black text-vapor-cyan mt-1">{stats.totalVolume.toLocaleString()}</p>
        </div>
      </div>

      {/* Muscle group distribution */}
      <div className="card p-4 mb-4">
        <p className="text-xs text-vapor-muted uppercase tracking-wider mb-3">Muscle Group Volume</p>
        <div className="space-y-2">
          {topMuscles.map(([muscle, volume]) => (
            <div key={muscle} className="flex items-center gap-3">
              <p className="text-xs text-vapor-muted w-20 flex-shrink-0">{muscle}</p>
              <div className="flex-1 h-4 bg-vapor-navy rounded-full overflow-hidden">
                <div
                  className="h-full bg-vapor-pink rounded-full transition-all"
                  style={{ width: `${(volume / maxVol) * 100}%` }}
                />
              </div>
              <p className="text-xs font-mono text-vapor-light w-16 text-right">{volume.toLocaleString()}</p>
            </div>
          ))}
          {topMuscles.length === 0 && (
            <p className="text-xs text-vapor-muted text-center py-4">No data for this period</p>
          )}
        </div>
      </div>

      {/* Exercise selector for trend */}
      <div className="card p-4 mb-4">
        <p className="text-xs text-vapor-muted uppercase tracking-wider mb-2">Exercise Trend</p>
        <select
          value={selectedExercise ?? ''}
          onChange={e => setSelectedExercise(e.target.value || null)}
          className="input-field w-full mb-3"
        >
          <option value="">Select an exercise...</option>
          {EXERCISES.filter(ex => sessions.some(s => s.exercises.some(se => se.exerciseKey === ex.key))).map(ex => (
            <option key={ex.key} value={ex.key}>{ex.name}</option>
          ))}
        </select>

        {selectedExercise && exerciseTrend.length > 0 && (
          <div>
            {/* Simple bar chart */}
            <div className="flex items-end gap-0.5 h-24">
              {exerciseTrend.map((point, i) => {
                const maxPointVol = Math.max(...exerciseTrend.map(p => p.volume), 1);
                const height = (point.volume / maxPointVol) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div
                      className="w-full rounded-t bg-vapor-pink transition-all min-h-[2px]"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-vapor-muted/80">{exerciseTrend[0]?.date}</span>
              <span className="text-[9px] text-vapor-muted/80">{exerciseTrend[exerciseTrend.length - 1]?.date}</span>
            </div>
          </div>
        )}
        {selectedExercise && exerciseTrend.length === 0 && (
          <p className="text-xs text-vapor-muted py-4 text-center">No data for this exercise</p>
        )}

        {/* PRs for selected exercise */}
        {selectedExercise && exercisePRs.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-vapor-muted uppercase tracking-wider mb-2">Personal Records</p>
            <div className="space-y-2">
              {exercisePRs.map(pr => (
                <div key={pr.id} className="flex items-center justify-between rounded-lg bg-vapor-navy/50 px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-vapor-cyan">
                      {pr.type === 'max_weight' ? 'Max Weight' :
                       pr.type === 'max_reps' ? 'Max Reps' :
                       pr.type === 'max_volume' ? 'Max Volume' : 'Est. 1RM'}
                    </p>
                    <p className="text-[10px] text-vapor-muted">{new Date(pr.achievedAt).toLocaleDateString()}</p>
                  </div>
                  <p className="text-sm font-bold text-vapor-cyan">
                    {pr.value.toLocaleString()} {pr.unit}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recalculate PRs button */}
      <button
        onClick={() => { recalcPRs(sessions); setPrVersion(v => v + 1); }}
        className="btn-secondary w-full text-sm py-3"
      >
        Recalculate PRs
      </button>
    </div>
  );
}
