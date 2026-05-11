import { useState, useCallback } from 'react';
import { Routine } from '../types';
import { loadRoutines, upsertRoutine, deleteRoutine } from '../storage';
import RoutineEditor from './RoutineEditor';

type Props = {
  onStart: (exercises: { key: string; name: string }[]) => void;
  onShowToast: (msg: string) => void;
};

export default function RoutinesView({ onStart, onShowToast }: Props) {
  const [routines, setRoutines] = useState<Routine[]>(loadRoutines);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);

  const handleSave = useCallback((routine: Routine) => {
    setRoutines(upsertRoutine(routine));
    setShowEditor(false);
    setEditing(null);
    onShowToast('Routine saved');
  }, [onShowToast]);

  const handleDelete = useCallback((id: string) => {
    setRoutines(deleteRoutine(id));
    onShowToast('Routine deleted');
  }, [onShowToast]);

  const handleStart = useCallback((routine: Routine) => {
    const exercises = routine.exercises.map(ex => ({ key: ex.exerciseKey, name: ex.name }));
    onStart(exercises);
    // Update lastUsedAt
    const updated = { ...routine, lastUsedAt: Date.now(), updatedAt: Date.now() };
    setRoutines(upsertRoutine(updated));
    onShowToast(`Started ${routine.name}`);
  }, [onStart, onShowToast]);

  const handleEdit = useCallback((routine: Routine) => {
    setEditing(routine);
    setShowEditor(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditing(null);
    setShowEditor(true);
  }, []);

  return (
    <div className="px-3 pt-4 sm:px-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-vapor-muted uppercase tracking-wider">Routines</p>
          <p className="text-lg font-black text-vapor-pink">{routines.length} saved</p>
        </div>
        <button onClick={handleCreate} className="btn-primary text-sm">+ New</button>
      </div>

      {routines.length === 0 ? (
        <div className="py-16 text-center">
          <div className="flex justify-center mb-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ff2aa3" strokeWidth="1" className="w-20 h-20 drop-shadow-[0_0_15px_rgba(255,42,163,0.8)]">
              <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" />
              <line x1="3" y1="8" x2="21" y2="8" strokeWidth="1" />
            </svg>
          </div>
          <p className="mt-3 text-sm text-vapor-muted">No routines yet</p>
          <p className="text-xs text-vapor-muted mt-1">Create a template to quickly start workouts</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {routines.map(routine => (
            <div key={routine.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-vapor-pink truncate">{routine.name}</h3>
                  <p className="text-xs text-vapor-muted mt-0.5">
                    {routine.exercises.length} exercise{routine.exercises.length !== 1 ? 's' : ''}
                    {routine.lastUsedAt ? ` · Last used ${new Date(routine.lastUsedAt).toLocaleDateString()}` : ''}
                  </p>
                </div>
              </div>
              {/* Exercise list */}
              <div className="mt-3 space-y-1">
                {routine.exercises.map((ex, i) => (
                  <div key={ex.id} className="flex items-center justify-between rounded-lg bg-vapor-navy/50 px-3 py-2 text-sm">
                    <span className="text-vapor-light">{i + 1}. {ex.name}</span>
                    <span className="text-xs text-vapor-muted">{ex.plannedSets.length} set{ex.plannedSets.length !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
              {routine.notes && <p className="mt-2 text-xs text-vapor-muted">{routine.notes}</p>}
              <div className="mt-3 flex gap-2">
                <button onClick={() => handleStart(routine)} className="flex-1 btn-primary text-sm py-2">Start</button>
                <button onClick={() => handleEdit(routine)} className="btn-secondary text-sm py-2">Edit</button>
                <button onClick={() => handleDelete(routine.id)} className="btn-danger text-sm py-2">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showEditor && (
        <RoutineEditor
          routine={editing}
          onSave={handleSave}
          onClose={() => { setShowEditor(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
