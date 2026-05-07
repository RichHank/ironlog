import { useState, useMemo, useCallback } from 'react';
import { BodyMeasurement } from '../types';
import { loadMeasurements, addMeasurement, saveMeasurements, generateId } from '../storage';

type Props = {
  onShowToast: (msg: string) => void;
};

export default function BodyMeasurements({ onShowToast }: Props) {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>(loadMeasurements);
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');

  const handleAdd = useCallback(() => {
    if (!weight) return;
    const m: BodyMeasurement = { id: generateId(), date: Date.now(), weight: Number(weight), note: note || undefined };
    const updated = addMeasurement(m);
    setMeasurements(updated);
    setWeight('');
    setNote('');
    onShowToast('Weight logged');
  }, [weight, note, onShowToast]);

  const handleDelete = useCallback((id: string) => {
    const updated = measurements.filter(m => m.id !== id);
    setMeasurements(updated);
    saveMeasurements(updated);
    onShowToast('Entry deleted');
  }, [measurements, onShowToast]);

  const chartData = useMemo(() => {
    const sorted = [...measurements].sort((a, b) => a.date - b.date);
    return sorted.slice(-30).filter(m => m.weight !== undefined);
  }, [measurements]);

  const maxWeight = Math.max(...chartData.map(m => m.weight ?? 0), 1);
  const minWeight = Math.min(...chartData.map(m => m.weight ?? 0), maxWeight);

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="card p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Log Body Weight</p>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Weight (lb)</label>
            <input type="number" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)}
              placeholder="e.g. 180" className="input-field w-full text-right font-mono" />
          </div>
          <button onClick={handleAdd} disabled={!weight} className="btn-primary min-h-touch px-5 py-2.5 text-sm">Log</button>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="card p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Weight Trend</p>
          <div className="flex items-end gap-0.5 h-32">
            {chartData.map((m, i) => {
              const range = maxWeight - minWeight || 1;
              const height = ((m.weight! - minWeight) / range) * 90 + 10;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className="w-full rounded-t bg-blue-500 min-h-[2px]" style={{ height: `${height}%` }} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-zinc-600">{new Date(chartData[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            <span className="text-xs font-mono text-blue-400">{minWeight}–{maxWeight} lb</span>
            <span className="text-[9px] text-zinc-600">{new Date(chartData[chartData.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      )}

      {/* History list */}
      {measurements.length > 0 && (
        <div className="card p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">History</p>
          <div className="divide-y divide-zinc-800/50">
            {measurements.slice(0, 20).map(m => (
              <div key={m.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-semibold text-zinc-200">{m.weight} lb</p>
                  <p className="text-xs text-zinc-500">{new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <button onClick={() => handleDelete(m.id)} className="text-xs text-zinc-600 hover:text-red-400">Del</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
