import { useState, useMemo, useCallback } from 'react';
import { EXERCISE_CATEGORIES, EXERCISES, searchExercises, getExercisesByCategory, getMuscleGroups, ExerciseDef } from '../exerciseData';
import { generateId } from '../storage';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (key: string, name: string) => void;
  recentExercises?: string[];
};

const CUSTOM_KEY = 'il-custom-exercises';

function loadCustomExercises(): ExerciseDef[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCustomExercise(ex: ExerciseDef): void {
  const current = loadCustomExercises().filter(c => c.key !== ex.key);
  current.unshift(ex);
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(current));
}

export default function ExerciseSelector({ open, onClose, onSelect, recentExercises = [] }: Props) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'categories' | 'muscles'>('categories');
  const [category, setCategory] = useState<string>('All');
  const [muscle, setMuscle] = useState<string>('All');
  const [customExercises, setCustomExercises] = useState<ExerciseDef[]>(loadCustomExercises);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('Chest');
  const [customEquipment, setCustomEquipment] = useState('Barbell');

  const muscleGroups = useMemo(() => getMuscleGroups(), []);
  const allExercises = useMemo(() => [...EXERCISES, ...customExercises], [customExercises]);

  const results = useMemo(() => {
    if (query.trim()) {
      const q = query.toLowerCase();
      const builtIn = searchExercises(q);
      const custom = customExercises.filter(e => e.name.toLowerCase().includes(q));
      return [...builtIn, ...custom];
    }
    if (tab === 'muscles' && muscle !== 'All') {
      return allExercises.filter(e =>
        e.primaryMuscles.some(m => m.toLowerCase() === muscle.toLowerCase()) ||
        e.secondaryMuscles.some(m => m.toLowerCase() === muscle.toLowerCase())
      );
    }
    if (tab === 'categories' && category !== 'All') {
      return [...getExercisesByCategory(category), ...customExercises.filter(e => e.category === category)];
    }
    return allExercises;
  }, [query, tab, category, muscle, allExercises, customExercises]);

  const recent = useMemo(() => {
    if (query.trim() || (category !== 'All' && tab === 'categories') || (muscle !== 'All' && tab === 'muscles')) return [];
    return recentExercises.slice(0, 8).map(key => allExercises.find(e => e.key === key)).filter(Boolean) as ExerciseDef[];
  }, [query, category, muscle, tab, recentExercises, allExercises]);

  const handleCreateCustom = useCallback(() => {
    if (!customName.trim()) return;
    const key = 'custom-' + generateId().slice(0, 8);
    const ex: ExerciseDef = {
      key, name: customName.trim(), category: customCategory,
      primaryMuscles: [customCategory], secondaryMuscles: [], equipment: customEquipment,
    };
    saveCustomExercise(ex);
    setCustomExercises(loadCustomExercises());
    setShowCustomForm(false);
    setCustomName('');
    onSelect(key, customName.trim());
    onClose();
  }, [customName, customCategory, customEquipment, onSelect, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-vapor-black animate-fade-in">
      <div className="safe-area-top border-b border-vapor-purple bg-vapor-black px-4 pb-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-bold text-vapor-pink">Add Exercise</h2>
          <div className="flex gap-2">
            {!showCustomForm && <button onClick={() => setShowCustomForm(true)} className="btn-secondary min-h-touch px-3 py-1.5 text-xs">+ Custom</button>}
            <button onClick={onClose} className="btn-secondary min-h-touch px-3 py-1.5 text-sm">Cancel</button>
          </div>
        </div>
        {showCustomForm ? (
          <div className="space-y-2">
            <input type="text" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Exercise name" autoFocus className="input-field w-full text-sm" />
            <div className="flex gap-2">
              <select value={customCategory} onChange={e => setCustomCategory(e.target.value)} className="input-field flex-1 text-sm">
                {EXERCISE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={customEquipment} onChange={e => setCustomEquipment(e.target.value)} className="input-field flex-1 text-sm">
                {['Barbell','Dumbbell','Cable','Machine','Bodyweight','Kettlebell','Other'].map(eq => <option key={eq} value={eq}>{eq}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCustomForm(false)} className="btn-secondary flex-1 text-sm py-2">Cancel</button>
              <button onClick={handleCreateCustom} disabled={!customName.trim()} className="btn-primary flex-1 text-sm py-2">Create</button>
            </div>
          </div>
        ) : (
          <input type="text" inputMode="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search exercises..." autoFocus className="input-field w-full" />
        )}
      </div>

      {!query && !showCustomForm && (
        <div className="px-4 pt-2">
          <div className="flex gap-1 mb-2">
            {(['categories', 'muscles'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize ${tab === t ? 'bg-vapor-pink text-white' : 'bg-vapor-navy text-vapor-muted'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-1 overflow-x-auto py-1 scrollbar-hide">
            {tab === 'categories' ? (
              ['All', ...EXERCISE_CATEGORIES].map(cat => (
                <button key={cat} onClick={() => setCategory(cat)} className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${category === cat ? 'bg-vapor-pink text-white' : 'bg-vapor-navy text-vapor-muted'}`}>
                  {cat}
                </button>
              ))
            ) : (
              ['All', ...muscleGroups].map(m => (
                <button key={m} onClick={() => setMuscle(m)} className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${muscle === m ? 'bg-vapor-pink text-white' : 'bg-vapor-navy text-vapor-muted'}`}>
                  {m}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {/* Recent exercises */}
        {recent.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-vapor-muted uppercase tracking-wider mb-2">Recent</p>
            <div className="space-y-1">
              {recent.map(ex => (
                <button key={ex.key} onClick={() => { onSelect(ex.key, ex.name); onClose(); }}
                  className="flex w-full items-center justify-between rounded-lg bg-vapor-navy/30 px-3 py-2 text-left active:bg-zinc-700/30">
                  <div>
                    <p className="text-sm font-semibold text-white">{ex.name}</p>
                    <p className="text-xs text-vapor-muted">{ex.category} · {ex.equipment}</p>
                  </div>
                  <span className="text-xs text-vapor-cyan">+ Add</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {results.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-vapor-muted">No exercises found</p>
            <button onClick={() => { setShowCustomForm(true); setCustomName(query); }} className="mt-2 text-sm text-vapor-cyan font-semibold">
              + Create "{query}"
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {results.map(ex => (
              <button key={ex.key} onClick={() => { onSelect(ex.key, ex.name); onClose(); }}
                className="flex w-full items-center justify-between py-3 text-left active:bg-zinc-800/30">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{ex.name}</p>
                    {ex.key.startsWith('custom-') && <span className="chip bg-amber-500/10 text-vapor-yellow text-[10px]">Custom</span>}
                  </div>
                  <p className="text-xs text-vapor-muted">{ex.category} · {ex.equipment} · {ex.primaryMuscles.join(', ')}</p>
                </div>
                <span className="text-xs text-vapor-muted/80 ml-2 flex-shrink-0">+ Add</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
