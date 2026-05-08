import { useState, useCallback } from 'react';
import { ExerciseLog, WorkoutSet, SetType } from '../types';
import { weightPlaceholder } from '../utils';
import { loadSettings } from '../storage';

type Props = {
  exercise: ExerciseLog;
  onAdd: (set: Omit<WorkoutSet, 'id' | 'completedAt'>) => void;
};

const SET_TYPES: { value: SetType; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'warmup', label: 'Warmup' },
  { value: 'drop', label: 'Drop' },
  { value: 'failure', label: 'Failure' },
];

export default function AddSetForm({ exercise, onAdd }: Props) {
  const lastSet = exercise.sets.length > 0 ? exercise.sets[exercise.sets.length - 1] : null;
  const [weight, setWeight] = useState(lastSet?.weight?.toString() ?? '');
  const [reps, setReps] = useState(lastSet?.reps?.toString() ?? '');
  const [rpe, setRpe] = useState('');
  const [type, setType] = useState<SetType>('normal');

  const handleSubmit = useCallback(() => {
    if (!reps || reps === '0') return;
    onAdd({
      weight: weight ? Number(weight) : null,
      reps: Number(reps),
      rpe: rpe ? Number(rpe) : null,
      type,
    });
    setRpe('');
  }, [weight, reps, rpe, type, onAdd]);

  return (
    <div className="mt-3 border-t border-zinc-800/50 pt-3">
      <div className="flex items-end gap-2 flex-wrap">
        <div className="flex-1 min-w-[80px]">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Weight {lastSet?.weight ? `(last: ${lastSet.weight})` : ''}</label>
          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            placeholder={weightPlaceholder(exercise.exerciseKey, loadSettings().weightUnit)}
            className="input-field w-full text-right font-mono"
          />
        </div>
        <div className="flex-1 min-w-[60px]">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Reps {lastSet?.reps ? `(last: ${lastSet.reps})` : ''}</label>
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={e => setReps(e.target.value)}
            placeholder="0"
            className="input-field w-full text-right font-mono"
          />
        </div>
        <div className="w-14">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider">RPE</label>
          <input
            type="number"
            inputMode="decimal"
            value={rpe}
            onChange={e => setRpe(e.target.value)}
            placeholder="-"
            className="input-field w-full text-right font-mono"
          />
        </div>
        <button
          onClick={handleSubmit}
          className="min-h-touch rounded-lg bg-blue-500 px-5 py-2.5 font-bold text-white active:scale-95 transition-transform"
        >
          Log
        </button>
      </div>
      {/* Set type selector */}
      <div className="mt-2 flex gap-1">
        {SET_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
              type === t.value
                ? t.value === 'normal' ? 'bg-blue-500 text-white'
                : t.value === 'warmup' ? 'bg-amber-500 text-white'
                : t.value === 'drop' ? 'bg-purple-500 text-white'
                : 'bg-red-500 text-white'
                : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
