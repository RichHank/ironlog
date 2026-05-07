import { useState, useMemo } from 'react';
import { EXERCISE_CATEGORIES, EXERCISES, searchExercises, getExercisesByCategory, ExerciseDef } from '../exerciseData';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (key: string, name: string) => void;
};

export default function ExerciseSelector({ open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('All');

  const results = useMemo(() => {
    if (query.trim()) return searchExercises(query);
    if (category === 'All') return EXERCISES;
    return getExercisesByCategory(category);
  }, [query, category]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 animate-fade-in">
      {/* Header */}
      <div className="safe-area-top border-b border-zinc-800 bg-zinc-950 px-4 pb-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-bold text-zinc-50">Add Exercise</h2>
          <button onClick={onClose} className="btn-secondary min-h-touch px-3 py-1.5 text-sm">Cancel</button>
        </div>
        <input
          type="text"
          inputMode="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search exercises..."
          autoFocus
          className="input-field w-full"
        />
      </div>

      {/* Category tabs */}
      {!query && (
        <div className="flex gap-1 overflow-x-auto px-4 py-2 scrollbar-hide">
          {['All', ...EXERCISE_CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                category === cat ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {results.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">No exercises found</p>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {results.map(ex => (
              <button
                key={ex.key}
                onClick={() => onSelect(ex.key, ex.name)}
                className="flex w-full items-center justify-between py-3 text-left active:bg-zinc-800/30"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{ex.name}</p>
                  <p className="text-xs text-zinc-500">
                    {ex.category} · {ex.equipment} · {ex.primaryMuscles.join(', ')}
                  </p>
                </div>
                <span className="text-xs text-zinc-600 ml-2 flex-shrink-0">+ Add</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
