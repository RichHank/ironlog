import { useState, useMemo, useEffect } from 'react';
import { WorkoutSession, WorkoutSet } from '../types';
import { loadSettings } from '../storage';
import { est1RM, formatTime, formatWeightCell } from '../utils';
import { playClick, playSuccess, playError, playPowerUp } from '../audio';
import ExerciseSelector from './ExerciseSelector';
import AddSetForm from './AddSetForm';
import RestTimer from './RestTimer';
import VoiceButton from './VoiceButton';
import { SynthwaveSun } from './Icons';
import { useVoiceCommands } from '../hooks/useVoiceCommands';
import type { View } from '../App';

type Props = {
  session: WorkoutSession | null;
  history: WorkoutSession[];
  timer: ReturnType<typeof import('../hooks/useTimer').useTimer>;
  onAddExercise: (key: string, name: string) => void;
  onAddExerciseWithSets: (key: string, name: string, sets: Omit<WorkoutSet, 'id' | 'completedAt'>[]) => void;
  onAddSet: (exerciseId: string, set: Omit<WorkoutSet, 'id' | 'completedAt'>) => void;
  onUpdateSet: (exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
  onDeleteSet: (exerciseId: string, setId: string) => void;
  onUpdateSession?: (updates: Partial<WorkoutSession>) => void;
  onDeleteExercise: (id: string) => void;
  onSaveRoutine: () => void;
  onFinish: () => void;
  onDiscard: () => void;
  onUndoLast: () => void;
  onNavigate: (view: View) => void;
  onShowToast: (msg: string) => void;
};

export default function WorkoutView({
  session, history, timer, onAddExercise, onAddExerciseWithSets, onAddSet, onUpdateSet, onDeleteSet,
  onUpdateSession, onDeleteExercise, onSaveRoutine, onFinish, onDiscard, onUndoLast, onNavigate, onShowToast,
}: Props) {
  const unit = loadSettings().weightUnit;
  const [showSelector, setShowSelector] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [editingSet, setEditingSet] = useState<{ exerciseId: string; setId: string } | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<WorkoutSet>>({});
  const [sessionNotes, setSessionNotes] = useState(session?.notes ?? '');

  // Sync notes when switching to a different session (prevents cross-contamination)
  useEffect(() => {
    setSessionNotes(session?.notes ?? '');
  }, [session?.id]);

  const hasEntries = session && (session.exercises.length > 0 || (session.exercises.some(e => e.sets.length > 0)));

  // Look up previous workout data per exercise
  const prevWorkoutLookup = useMemo(() => {
    if (!session || history.length === 0) return new Map<string, { weight: number | null; reps: number | null; e1rm: number }>();
    const map = new Map<string, { weight: number | null; reps: number | null; e1rm: number }>();
    for (const s of history) {
      for (const ex of s.exercises) {
        if (!map.has(ex.exerciseKey) && ex.sets.length > 0) {
          const last = ex.sets[ex.sets.length - 1];
          map.set(ex.exerciseKey, {
            weight: last.weight, reps: last.reps,
            e1rm: last.weight && last.reps ? est1RM(last.weight, last.reps) : 0,
          });
        }
      }
    }
    return map;
  }, [history, session]);

  // Look up full previous sets list per exercise
  const prevWorkoutSetsLookup = useMemo(() => {
    if (!session || history.length === 0) return new Map<string, WorkoutSet[]>();
    const map = new Map<string, WorkoutSet[]>();
    for (const s of history) {
      for (const ex of s.exercises) {
        if (!map.has(ex.exerciseKey) && ex.sets.length > 0) {
          map.set(ex.exerciseKey, ex.sets);
        }
      }
    }
    return map;
  }, [history, session]);

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

  const voice = useVoiceCommands({
    session,
    onAddExercise,
    onAddExerciseWithSets,
    onAddSet,
    onUpdateSet,
    onDeleteSet,
    onDeleteExercise,
    onUpdateSession: (updates) => onUpdateSession?.(updates),
    onFinish,
    onDiscard,
    onUndoLast,
    onNavigate,
    onShowToast,
    timer: { start: timer.start, pause: timer.pause, resume: timer.resume, reset: timer.reset },
  });

  if (!hasEntries) {
    return (
      <div className="flex flex-col items-center justify-center px-6 pt-16 animate-fade-in relative z-20">
        <div className="vapor-logo-container">
          <h1 className="ironlog-title" data-text="IRONLOG">IRONLOG</h1>
          <h2 className="bodynet-subtitle">BODYNET_88</h2>
        </div>
        
        <button
          onClick={() => { playPowerUp(); setShowSelector(true); handleHaptic(); }}
          className="btn-primary mt-12 text-xl px-10 py-4 shadow-[0_0_30px_rgba(0,245,255,0.4)] hover:shadow-[0_0_50px_rgba(0,245,255,0.7)]"
        >
          INITIATE PROTOCOL
        </button>
        <div className="mt-8 flex items-center gap-4 w-full max-w-[200px]">
          <div className="h-px flex-1 bg-[#00f5ff]/30" />
          <span className="text-[12px] text-[#00f5ff]/80 tracking-[0.2em] font-bold">OR</span>
          <div className="h-px flex-1 bg-[#00f5ff]/30" />
        </div>
        <VoiceButton onResult={voice.execute} className="mt-8 transform scale-125" />
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
          <p className="text-xs text-vapor-muted uppercase tracking-wider">Active Workout</p>
          <p className="text-lg font-black text-[#f0e6ff]">
            <span className="text-glow-cyan">{totalSets}</span> set{totalSets !== 1 ? 's' : ''} · <span className="text-glow-cyan">{totalVolume.toLocaleString()}</span> {unit}
          </p>
          <p className="text-xs text-[#887baa]">{formatTime(session!.startedAt)}</p>
        </div>
        <div className="flex gap-2 items-center">
          <VoiceButton onResult={voice.execute} />
          <button onClick={() => { playSuccess(); onSaveRoutine(); }} className="btn-secondary min-h-touch px-3 py-1.5 text-xs">Save Routine</button>
          <button onClick={() => { playError(); onDiscard(); }} className="btn-secondary min-h-touch px-3 py-1.5 text-xs">Discard</button>
          <button onClick={() => { playSuccess(); onFinish(); }} className="btn-primary min-h-touch px-3 py-1.5 text-xs">Finish</button>
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
          <div key={ex.id} className={`card overflow-hidden ${isActive ? 'border-vapor-cyan/40 ring-1 ring-vapor-cyan/20' : ''}`}>
            {/* Exercise header */}
            <button
              onClick={() => { playClick(); toggleExercise(ex.id); }}
              className="flex w-full items-center justify-between px-4 py-3 text-left active:bg-zinc-800/40"
            >
              <div className="min-w-0">
                <p className="text-xs text-vapor-muted uppercase tracking-wider">Exercise {idx + 1}</p>
                <p className="truncate text-base font-bold text-[#00f5ff] uppercase tracking-widest text-shadow-[0_0_8px_#00f5ff]">{ex.name}.NODE</p>
              </div>
              <div className="ml-2 flex items-center gap-2 flex-shrink-0">
                {ex.sets.length === 0 ? (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      playClick();
                      const num = window.prompt(`How many sets for ${ex.name}?`);
                      if (!num) return;
                      const count = parseInt(num, 10);
                      if (!isNaN(count) && count > 0 && count <= 20) {
                        playSuccess();
                        for (let i = 0; i < count; i++) {
                          onAddSet(ex.id, { type: 'normal', weight: null, reps: null, rpe: null });
                        }
                      }
                    }}
                    className="chip bg-[#00f5ff]/20 text-[#00f5ff] hover:bg-[#00f5ff]/40 transition-colors uppercase cursor-pointer shadow-[0_0_10px_rgba(0,245,255,0.3)]"
                  >
                    0 SETS
                  </button>
                ) : (
                  <span className="chip bg-vapor-navy text-vapor-muted uppercase">{ex.sets.length} SET{ex.sets.length !== 1 ? 'S' : ''}</span>
                )}
                {exVolume > 0 && <span className="chip bg-vapor-pink/15 text-vapor-cyan">{exVolume.toLocaleString()} {unit}</span>}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-vapor-purple px-4 pb-3">
                {/* Previous workout comparison */}
                {(() => {
                  const prev = prevWorkoutLookup.get(ex.exerciseKey);
                  if (!prev) return null;
                  return (
                    <div className="mt-3 rounded-lg bg-vapor-navy/50 px-3 py-2 text-xs text-vapor-muted">
                      <span>
                        Previous: {formatWeightCell(prev.weight, ex.exerciseKey)}{prev.weight !== null ? unit : ''} × {prev.reps ?? '?'} reps
                        {prev.e1rm > 0 && <span className="ml-2">· Est. 1RM: {prev.e1rm} {unit}</span>}
                      </span>
                    </div>
                  );
                })()}

                {/* Sets table */}
                {ex.sets.length > 0 && (
                  <div className="mt-2 mb-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-vapor-muted uppercase tracking-wider">
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
                            <tr key={set.id} className="border-t border-vapor-purple/40">
                              <td className="py-1.5 pr-2 text-vapor-muted">{si + 1}</td>
                              <td className="py-1.5 px-1">
                                <input type="number" inputMode="decimal" value={editDraft.weight ?? ''}
                                  onChange={e => setEditDraft(p => ({ ...p, weight: e.target.value ? Math.min(Number(e.target.value), 9999) : null }))}
                                  className="w-16 input-field px-1.5 py-1 text-right text-xs font-mono" placeholder="BW" />
                              </td>
                              <td className="py-1.5 px-1">
                                <input type="number" inputMode="numeric" value={editDraft.reps ?? ''}
                                  onChange={e => setEditDraft(p => ({ ...p, reps: e.target.value ? Math.min(Number(e.target.value), 9999) : null }))}
                                  className="w-12 input-field px-1.5 py-1 text-right text-xs font-mono" />
                              </td>
                              <td className="py-1.5 px-1 hidden sm:table-cell">
                                <input type="number" inputMode="decimal" value={editDraft.rpe ?? ''}
                                  onChange={e => setEditDraft(p => ({ ...p, rpe: e.target.value ? Math.min(Number(e.target.value), 10) : null }))}
                                  className="w-12 input-field px-1.5 py-1 text-right text-xs font-mono" />
                              </td>
                              <td className="py-1.5 px-1"></td>
                              <td className="py-1.5 pl-1">
                                <div className="flex justify-end gap-1">
                                  <button onClick={() => { playSuccess(); saveEdit(); }} className="rounded bg-vapor-pink px-2 py-1 text-xs font-bold text-white">Save</button>
                                  <button onClick={() => { playClick(); setEditingSet(null); }} className="rounded bg-zinc-700 px-2 py-1 text-xs text-vapor-light">Cancel</button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            <tr key={set.id} className="border-t border-vapor-purple/40 hover:bg-zinc-800/30">
                              <td className="py-1.5 pr-2">
                                <span className={`inline-flex items-center gap-1 text-vapor-muted`}>
                                  {si + 1}
                                  {set.type !== 'normal' && (
                                    <span className={`chip text-[10px] ${
                                      set.type === 'warmup' ? 'bg-amber-500/10 text-vapor-yellow' :
                                      set.type === 'drop' ? 'bg-purple-500/10 text-vapor-violet' :
                                      'bg-red-500/10 text-vapor-red'
                                    }`}>{set.type}</span>
                                  )}
                                </span>
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono font-semibold text-vapor-cyan">
                                {formatWeightCell(set.weight, ex.exerciseKey)}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono font-semibold text-vapor-cyan">{set.reps ?? '-'}</td>
                              <td className="py-1.5 px-2 text-right font-mono text-vapor-muted hidden sm:table-cell">
                                {set.rpe ? `@${set.rpe}` : '-'}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono text-xs text-vapor-cyan">
                                {set1rm > 0 ? set1rm : ''}
                              </td>
                              <td className="py-1.5 pl-2">
                                <div className="flex justify-end gap-1">
                                  <button onClick={() => { playClick(); startEdit(ex.id, set); }} className="rounded px-1.5 py-0.5 text-xs text-vapor-muted hover:text-zinc-300">Edit</button>
                                  <button onClick={() => { playError(); onDeleteSet(ex.id, set.id); }} className="min-h-touch min-w-[44px] rounded px-2 py-1.5 text-xs text-vapor-muted hover:text-red-400 flex items-center justify-center">Del</button>
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
                  prevSets={prevWorkoutSetsLookup.get(ex.exerciseKey)}
                  onAdd={(set) => {
                    playSuccess();
                    onAddSet(ex.id, set);
                    timer.start();
                  }}
                />

                {/* Delete exercise */}
                <button
                  onClick={() => { playError(); onDeleteExercise(ex.id); }}
                  className="mt-3 min-h-touch text-xs text-vapor-muted/80 hover:text-red-400"
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
        onClick={() => { playClick(); setShowSelector(true); handleHaptic(); }}
        className="card flex min-h-touch items-center justify-center gap-2 py-3 font-semibold text-vapor-cyan active:bg-zinc-800/40"
      >
        + Add Exercise
      </button>

      {/* Workout Notes */}
      <div className="card p-4">
        <p className="text-xs text-vapor-muted uppercase tracking-wider mb-2">Workout Notes</p>
        <textarea
          value={sessionNotes}
          onChange={e => setSessionNotes(e.target.value)}
          onBlur={() => onUpdateSession?.({ notes: sessionNotes || undefined })}
          placeholder="How did this workout feel? Any notes..."
          rows={2}
          className="input-field w-full resize-none text-sm"
        />
      </div>

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
