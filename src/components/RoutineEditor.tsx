import { useState, useEffect } from 'react';
import { Routine, RoutineExercise, PlannedSet } from '../types';
import { generateId } from '../storage';
import { EXERCISES, searchExercises } from '../exerciseData';

type Props = {
  routine: Routine | null;
  onSave: (routine: Routine) => void;
  onClose: () => void;
};

function emptyRoutine(): Routine {
  return {
    id: generateId(),
    name: '',
    exercises: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export default function RoutineEditor({ routine, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<Routine>(routine ? { ...routine } : emptyRoutine());
  const [showExSearch, setShowExSearch] = useState(false);
  const [exQuery, setExQuery] = useState('');

  useEffect(() => {
    if (routine) setDraft({ ...routine });
  }, [routine]);

  const addExercise = (key: string, name: string) => {
    const ex: RoutineExercise = {
      id: generateId(),
      exerciseKey: key,
      name,
      plannedSets: [{ id: generateId(), weight: null, reps: null, type: 'normal' }],
    };
    setDraft(prev => ({ ...prev, exercises: [...prev.exercises, ex] }));
    setShowExSearch(false);
    setExQuery('');
  };

  const removeExercise = (id: string) => {
    setDraft(prev => ({
      ...prev,
      exercises: prev.exercises.filter(e => e.id !== id),
    }));
  };

  const addPlannedSet = (exId: string) => {
    setDraft(prev => ({
      ...prev,
      exercises: prev.exercises.map(e =>
        e.id === exId ? {
          ...e,
          plannedSets: [...e.plannedSets, { id: generateId(), weight: null, reps: null, type: 'normal' as const }],
        } : e
      ),
    }));
  };

  const updatePlannedSet = (exId: string, setId: string, updates: Partial<PlannedSet>) => {
    setDraft(prev => ({
      ...prev,
      exercises: prev.exercises.map(e =>
        e.id === exId ? {
          ...e,
          plannedSets: e.plannedSets.map(s => s.id === setId ? { ...s, ...updates } : s),
        } : e
      ),
    }));
  };

  const removePlannedSet = (exId: string, setId: string) => {
    setDraft(prev => ({
      ...prev,
      exercises: prev.exercises.map(e =>
        e.id === exId ? {
          ...e,
          plannedSets: e.plannedSets.filter(s => s.id !== setId || e.plannedSets.length === 1),
        } : e
      ),
    }));
  };

  const handleSave = () => {
    if (!draft.name.trim()) return;
    onSave({ ...draft, updatedAt: Date.now() });
  };

  const exResults = exQuery ? searchExercises(exQuery).slice(0, 15) : EXERCISES.slice(0, 30);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-vapor-black animate-fade-in">
      <div className="safe-area-top border-b border-vapor-purple bg-vapor-black px-4 pb-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-bold text-vapor-pink">{routine ? 'Edit Routine' : 'New Routine'}</h2>
          <button onClick={onClose} className="btn-secondary min-h-touch px-3 py-1.5 text-sm">Cancel</button>
        </div>
        <input
          type="text"
          value={draft.name}
          onChange={e => setDraft(p => ({ ...p, name: e.target.value }))}
          placeholder="Routine name (e.g. Push Day)"
          autoFocus
          className="input-field w-full text-base font-bold"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-28">
        {/* Exercises */}
        {draft.exercises.map((ex, ei) => (
          <div key={ex.id} className="mt-3 card p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-sm font-bold text-vapor-pink">{ei + 1}. {ex.name}</p>
              <button onClick={() => removeExercise(ex.id)} className="text-xs text-vapor-muted/80 hover:text-red-400">Remove</button>
            </div>
            {/* Planned sets */}
            <div className="space-y-2">
              {ex.plannedSets.map((set, si) => (
                <div key={set.id} className="flex items-center gap-2">
                  <span className="text-xs text-vapor-muted w-12">Set {si + 1}</span>
                  <input
                    type="number" inputMode="decimal"
                    value={set.weight ?? ''}
                    onChange={e => updatePlannedSet(ex.id, set.id, { weight: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Weight"
                    className="input-field flex-1 px-2 py-1.5 text-xs font-mono text-right"
                  />
                  <span className="text-xs text-vapor-muted/80">×</span>
                  <input
                    type="number" inputMode="numeric"
                    value={set.reps ?? ''}
                    onChange={e => updatePlannedSet(ex.id, set.id, { reps: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Reps"
                    className="input-field w-16 px-2 py-1.5 text-xs font-mono text-right"
                  />
                  {ex.plannedSets.length > 1 && (
                    <button onClick={() => removePlannedSet(ex.id, set.id)} className="text-xs text-vapor-muted/80 hover:text-red-400 px-1">×</button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => addPlannedSet(ex.id)}
              className="mt-2 text-xs text-vapor-cyan font-medium"
            >
              + Add set
            </button>
          </div>
        ))}

        {/* Add exercise button */}
        <button
          onClick={() => setShowExSearch(true)}
          className="mt-3 card flex min-h-touch w-full items-center justify-center gap-2 py-3 font-semibold text-vapor-cyan active:bg-zinc-800/40"
        >
          + Add Exercise
        </button>

        {/* Exercise search modal */}
        {showExSearch && (
          <div className="fixed inset-0 z-[60] flex flex-col bg-vapor-black animate-fade-in">
            <div className="safe-area-top border-b border-vapor-purple px-4 pb-3">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-lg font-bold text-vapor-pink">Add Exercise</h3>
                <button onClick={() => setShowExSearch(false)} className="btn-secondary min-h-touch px-3 py-1.5 text-sm">Cancel</button>
              </div>
              <input
                type="text"
                inputMode="search"
                value={exQuery}
                onChange={e => setExQuery(e.target.value)}
                placeholder="Search..."
                autoFocus
                className="input-field w-full"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-8">
              {exResults.map(ex => (
                <button
                  key={ex.key}
                  onClick={() => addExercise(ex.key, ex.name)}
                  className="flex w-full items-center justify-between py-3 text-left active:bg-zinc-800/30 border-b border-zinc-800/30"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{ex.name}</p>
                    <p className="text-xs text-vapor-muted">{ex.category} · {ex.equipment}</p>
                  </div>
                  <span className="text-xs text-vapor-muted/80">Add</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-[70] safe-area-bottom border-t border-vapor-purple bg-vapor-black px-4 py-3 shadow-[0_-4px_20px_rgba(255,42,163,0.14)]">
        <button
          onClick={handleSave}
          disabled={!draft.name.trim()}
          className="btn-primary w-full text-base py-3"
        >
          Save Routine
        </button>
      </div>
    </div>
  );
}
