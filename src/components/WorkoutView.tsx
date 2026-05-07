import { useState, useCallback, useMemo } from 'react';
import { WorkoutSession, WorkoutSet, ExerciseLog } from '../types';
import { getExercise } from '../exerciseData';
import { est1RM, formatTime } from '../utils';
import ExerciseSelector from './ExerciseSelector';
import AddSetForm from './AddSetForm';
import RestTimer from './RestTimer';

type Props = {
  session: WorkoutSession | null;
  timer: ReturnType<typeof import('../hooks/useTimer').useTimer>;
  onAddExercise: (key: string, name: string) => void;
  onAddSet: (exerciseId: string, set: Omit<WorkoutSet, 'id' | 'completedAt'>) => void;
  onUpdateSet: (exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
  onDeleteSet: (exerciseId: string, setId: string) => void;
  onReorderExercises: (ids: string[]) => void;
  onDeleteExercise: (id: string) => void;
  onFinish: () => void;
  onDiscard: () => void;
  onShowToast: (msg: string) => void;
};

export default function WorkoutView({
  session, timer, onAddExercise, onAddSet, onUpdateSet, onDeleteSet,
  onDeleteExercise, onFinish, onDiscard, onShowToast,
}: Props) {
  const [showSelector, setShowSelector] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [editingSet, setEditingSet] = useState<{ exerciseId: string; setId: string } | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<WorkoutSet>>({});

  const hasEntries = session && (session.exercises.length > 0 || (session.exercises.some(e => e.sets.length > 0)));

  const totalSets = useMemo(() =>
    session?.exercises.reduce((s, e) => s + e.sets.length, 0) ?? 0
  , [session]);

  const totalVolume = useMemo(() =>
    session?.exercises.reduce((s, e) =>
      s + e.sets.reduce((ss, set) => ss + (set.weight ?? 0) * (set.reps ?? 0), 0), 0
    ) ?? 0
  , [session]);

  const activeExercise = useMemo(() =>
    session?.exercises.length ? session.exercises[session.exercises.length - 1] : null
  , [session]);

  const startEdit = (exerciseId: string, set: WorkoutSet) => {
    setEditingSet({ exerciseId, setId: set.id });
    setEditDraft({ weight: set.weight, reps: set.reps, rpe: set.rpe, type: set.type, note: set.note });
  };

  const saveEdit = () => {
    if (!editingSet) return;
    onUpdateSet(editingSet.exerciseId, editingSet.setId, editDraft);
    setEditingSet(null);
    setEditDraft({});
  };

  const toggleExercise = (id: string) => {
    setExpandedExercise(prev => prev === id ? null : id);
  };

  const handleHaptic = () => {
    if (window.navigator?.vibrate) window.navigator.vibrate(5);
  };

  if (!hasEntries) {
    return (
      <div className="flex flex-col items-center justify-center px-6 pt-20 animate-fade-in">
        <div className="text-center">
          <span className="text-6xl">🏋️</span>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-zinc-50">Start Your Workout</h2>
          <p className="mt-2 text-sm text-zinc-400">Add an exercise to begin logging sets</p>
          <button
            onClick={() => { setShowSelector(true); handleHaptic(); }}
            className="mt-6 min-h-touch rounded-xl bg-blue-500 px-6 py-3 font-bold text-white active:scale-95 transition-transform"
          >
            + Add Exercise
          </button>
        </div>
        <ExerciseSelector
          open={showSelector}
          onClose={() => setShowSelector(false)}
          onSelect={(key, name) => { onAddExercise(key, name); setShowSelector(false); setExpandedExercise(session?.exercises[session.exercises.length - 1]?.id ?? null); }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-3 pt-4 sm:px-4">
      {/* Header stats */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Active Workout</p>
          <p className="text-lg font-black text-zinc-50">{totalSets} set{totalSets !== 1 ? 's' : ''} · {totalVolume.toLocaleString()} lb</p>
          <p className="text-xs text-zinc-500">{formatTime(session!.startedAt)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onDiscard} className="btn-secondary min-h-touch px-3 py-1.5 text-xs">Discard</button>
          <button onClick={onFinish} className="btn-primary min-h-touch px-3 py-1.5 text-xs">Finish</button>
        </div>
      </div>

      {/* Exercises */}
      {session!.exercises.map((ex, idx) => {
        const isActive = idx === session!.exercises.length - 1;
        const isExpanded = expandedExercise === ex.id || isActive;
        const exVolume = ex.sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0);
        const lastSet = ex.sets.length > 0 ? ex.sets[ex.sets.length - 1] : null;
        const prev1rm = lastSet?.weight && lastSet?.reps ? est1RM(lastSet.weight, lastSet.reps) : 0;

        return (
          <div key={ex.id} className={`card overflow-hidden ${isActive ? 'border-blue-500/40 ring-1 ring-blue-500/20' : ''}`}>
            {/* Exercise header */}
            <button
              onClick={() => toggleExercise(ex.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left active:bg-zinc-800/40"
            >
              <div className="min-w-0">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Exercise {idx + 1}</p>
                <p className="truncate text-base font-bold text-zinc-50">{ex.name}</p>
              </div>
              <div className="ml-2 flex items-center gap-2 flex-shrink-0">
                <span className="chip bg-zinc-800 text-zinc-400">{ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}</span>
                {exVolume > 0 && <span className="chip bg-blue-500/10 text-blue-400">{exVolume.toLocaleString()} lb</span>}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-zinc-800 px-4 pb-3">
                {/* Previous workout comparison */}
                {idx === 0 && lastSet && (
                  <div className="mt-3 rounded-lg bg-zinc-800/50 px-3 py-2 text-xs text-zinc-400">
                    <span>Last set: {lastSet.weight}lb × {lastSet.reps} reps</span>
                    {prev1rm > 0 && <span className="ml-3">Est. 1RM: {prev1rm} lb</span>}
                  </div>
                )}

                {/* Sets table */}
                {ex.sets.length > 0 && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-zinc-500 uppercase tracking-wider">
                          <th className="py-1.5 pr-2 text-left font-medium">Set</th>
                          <th className="py-1.5 px-2 text-right font-medium">Weight</th>
                          <th className="py-1.5 px-2 text-right font-medium">Reps</th>
                          <th className="py-1.5 px-2 text-right font-medium hidden sm:table-cell">RPE</th>
                          <th className="py-1.5 px-2 text-right font-medium">1RM</th>
                          <th className="py-1.5 pl-2 text-right font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {ex.sets.map((set, si) => {
                          const isEditing = editingSet?.exerciseId === ex.id && editingSet?.setId === set.id;
                          const set1rm = set.weight && set.reps ? est1RM(set.weight, set.reps) : 0;
                          return isEditing ? (
                            <tr key={set.id} className="border-t border-zinc-800/40">
                              <td className="py-1.5 pr-2 text-zinc-400">{si + 1}</td>
                              <td className="py-1.5 px-1">
                                <input type="number" inputMode="decimal" value={editDraft.weight ?? ''}
                                  onChange={e => setEditDraft(p => ({ ...p, weight: e.target.value ? Number(e.target.value) : null }))}
                                  className="w-16 input-field px-1.5 py-1 text-right text-xs font-mono" placeholder="BW" />
                              </td>
                              <td className="py-1.5 px-1">
                                <input type="number" inputMode="numeric" value={editDraft.reps ?? ''}
                                  onChange={e => setEditDraft(p => ({ ...p, reps: e.target.value ? Number(e.target.value) : null }))}
                                  className="w-12 input-field px-1.5 py-1 text-right text-xs font-mono" />
                              </td>
                              <td className="py-1.5 px-1 hidden sm:table-cell">
                                <input type="number" inputMode="decimal" value={editDraft.rpe ?? ''}
                                  onChange={e => setEditDraft(p => ({ ...p, rpe: e.target.value ? Number(e.target.value) : null }))}
                                  className="w-12 input-field px-1.5 py-1 text-right text-xs font-mono" />
                              </td>
                              <td className="py-1.5 px-1"></td>
                              <td className="py-1.5 pl-1">
                                <div className="flex justify-end gap-1">
                                  <button onClick={saveEdit} className="rounded bg-blue-500 px-2 py-1 text-xs font-bold text-white">Save</button>
                                  <button onClick={() => setEditingSet(null)} className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-300">Cancel</button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            <tr key={set.id} className="border-t border-zinc-800/40 hover:bg-zinc-800/30">
                              <td className="py-1.5 pr-2">
                                <span className={`inline-flex items-center gap-1 text-zinc-400`}>
                                  {si + 1}
                                  {set.type !== 'normal' && (
                                    <span className={`chip text-[10px] ${
                                      set.type === 'warmup' ? 'bg-amber-500/10 text-amber-400' :
                                      set.type === 'drop' ? 'bg-purple-500/10 text-purple-400' :
                                      'bg-red-500/10 text-red-400'
                                    }`}>{set.type}</span>
                                  )}
                                </span>
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono font-semibold text-zinc-200">
                                {set.weight !== null ? set.weight : 'BW'}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono font-semibold text-zinc-200">{set.reps ?? '-'}</td>
                              <td className="py-1.5 px-2 text-right font-mono text-zinc-500 hidden sm:table-cell">
                                {set.rpe ? `@${set.rpe}` : '-'}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono text-xs text-blue-400">
                                {set1rm > 0 ? set1rm : ''}
                              </td>
                              <td className="py-1.5 pl-2">
                                <div className="flex justify-end gap-1">
                                  <button onClick={() => startEdit(ex.id, set)} className="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:text-zinc-300">Edit</button>
                                  <button onClick={() => onDeleteSet(ex.id, set.id)} className="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:text-red-400">Del</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Add set form */}
                <AddSetForm
                  exercise={ex}
                  onAdd={(set) => {
                    onAddSet(ex.id, set);
                    timer.start();
                  }}
                />

                {/* Delete exercise */}
                <button
                  onClick={() => onDeleteExercise(ex.id)}
                  className="mt-3 text-xs text-zinc-600 hover:text-red-400"
                >
                  Remove exercise
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Add Exercise Button */}
      <button
        onClick={() => { setShowSelector(true); handleHaptic(); }}
        className="card flex min-h-touch items-center justify-center gap-2 py-3 font-semibold text-blue-400 active:bg-zinc-800/40"
      >
        + Add Exercise
      </button>

      {/* Rest Timer */}
      <RestTimer timer={timer} activeExercise={activeExercise} />

      {/* Bottom spacer for nav */}
      <div className="h-4" />

      <ExerciseSelector
        open={showSelector}
        onClose={() => setShowSelector(false)}
        onSelect={(key, name) => {
          onAddExercise(key, name);
          setShowSelector(false);
        }}
      />
    </div>
  );
}
