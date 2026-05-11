import { useState, useCallback } from 'react';
import { ExerciseLog, WorkoutSet, SetType } from '../types';
import { weightPlaceholder } from '../utils';
import { loadSettings } from '../storage';

type Props = {
  exercise: ExerciseLog;
  onAdd: (set: Omit<WorkoutSet, 'id' | 'completedAt'>) => void;
  prevSets?: WorkoutSet[];
};

const SET_TYPES: { value: SetType; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'warmup', label: 'Warmup' },
  { value: 'drop', label: 'Drop' },
  { value: 'failure', label: 'Failure' },
];

export default function AddSetForm({ exercise, onAdd, prevSets }: Props) {
  const lastSet = exercise.sets.length > 0 ? exercise.sets[exercise.sets.length - 1] : null;
  const [weight, setWeight] = useState(lastSet?.weight?.toString() ?? '');
  const [reps, setReps] = useState(lastSet?.reps?.toString() ?? '');
  const [rpe, setRpe] = useState('');
  const [type, setType] = useState<SetType>('normal');

  const currentSetIndex = exercise.sets.length;
  const prevSetForThisIndex = prevSets && prevSets[currentSetIndex];
  const unit = loadSettings().weightUnit;

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

  const handleCopyPrev = () => {
    if (prevSetForThisIndex) {
      if (prevSetForThisIndex.weight !== null && prevSetForThisIndex.weight !== undefined) {
        setWeight(prevSetForThisIndex.weight.toString());
      } else {
        setWeight('');
      }
      if (prevSetForThisIndex.reps !== null && prevSetForThisIndex.reps !== undefined) {
        setReps(prevSetForThisIndex.reps.toString());
      }
      if (prevSetForThisIndex.rpe !== null && prevSetForThisIndex.rpe !== undefined) {
        setRpe(prevSetForThisIndex.rpe.toString());
      }
    }
  };

  return (
    <div className="mt-3 border-t border-zinc-800/50 pt-3">
      {prevSetForThisIndex && (
        <button
          onClick={handleCopyPrev}
          className="mt-0.5 mb-2.5 px-2 py-1 rounded border border-[#ff2aa3]/10 bg-[#ff2aa3]/5 hover:bg-[#ff2aa3]/10 hover:border-[#ff2aa3]/20 flex items-center justify-between gap-1.5 text-[10px] text-[#ff2aa3]/50 font-mono tracking-wider italic animate-pulse cursor-pointer w-full text-left transition-colors"
          title="Click to auto-fill these values"
        >
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff2aa3]/50 shadow-[0_0_4px_#ff2aa3]" />
            <span>
              PREV.SET_{currentSetIndex + 1}: {prevSetForThisIndex.weight !== null && prevSetForThisIndex.weight !== undefined ? `${prevSetForThisIndex.weight}${unit}` : 'BW'} × {prevSetForThisIndex.reps ?? '?'} REPS
              {prevSetForThisIndex.rpe ? ` @ RPE ${prevSetForThisIndex.rpe}` : ''}
            </span>
          </span>
          <span className="text-[9px] text-vapor-muted uppercase text-shadow-[0_0_4px_rgba(255,42,163,0.2)]">TAP TO FILL ⇲</span>
        </button>
      )}

      <div className="flex items-end gap-2 flex-wrap">
        <div className="flex-1 min-w-[80px]">
          <label className="text-[10px] text-vapor-muted uppercase tracking-wider">Weight {lastSet?.weight ? `(last: ${lastSet.weight})` : ''}</label>
          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            placeholder={prevSetForThisIndex?.weight !== null && prevSetForThisIndex?.weight !== undefined ? prevSetForThisIndex.weight.toString() : weightPlaceholder(exercise.exerciseKey, unit)}
            className="input-field w-full text-right font-mono"
          />
        </div>
        <div className="flex-1 min-w-[60px]">
          <label className="text-[10px] text-vapor-muted uppercase tracking-wider">Reps {lastSet?.reps ? `(last: ${lastSet.reps})` : ''}</label>
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={e => setReps(e.target.value)}
            placeholder={prevSetForThisIndex?.reps !== null && prevSetForThisIndex?.reps !== undefined ? prevSetForThisIndex.reps.toString() : '0'}
            className="input-field w-full text-right font-mono"
          />
        </div>
        <div className="w-14">
          <label className="text-[10px] text-vapor-muted uppercase tracking-wider">RPE</label>
          <input
            type="number"
            inputMode="decimal"
            value={rpe}
            onChange={e => setRpe(e.target.value)}
            placeholder={prevSetForThisIndex?.rpe !== null && prevSetForThisIndex?.rpe !== undefined ? prevSetForThisIndex.rpe.toString() : '-'}
            className="input-field w-full text-right font-mono"
          />
        </div>
        <button
          onClick={handleSubmit}
          className="min-h-touch rounded-lg bg-vapor-pink px-5 py-2.5 font-bold text-white active:scale-95 transition-transform"
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
                ? t.value === 'normal' ? 'bg-vapor-pink text-white'
                : t.value === 'warmup' ? 'bg-vapor-yellow text-white'
                : t.value === 'drop' ? 'bg-vapor-violet text-white'
                : 'bg-vapor-red text-white'
                : 'bg-vapor-navy text-vapor-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
