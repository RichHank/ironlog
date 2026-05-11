import { useState, useMemo } from 'react';

// Standard plate weights in lb (per plate, assuming 45lb bar)
const PLATES_LB = [45, 35, 25, 10, 5, 2.5];
const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

type Props = {
  unit: 'lb' | 'kg';
};

export default function PlateCalculator({ unit }: Props) {
  const [targetWeight, setTargetWeight] = useState('');
  const [barWeight, setBarWeight] = useState(unit === 'lb' ? 45 : 20);

  const plates = unit === 'lb' ? PLATES_LB : PLATES_KG;

  const result = useMemo(() => {
    const target = Number(targetWeight);
    if (!target || target <= barWeight) return null;

    let remaining = (target - barWeight) / 2; // divide by 2 (two sides of bar)
    const counts: { plate: number; count: number }[] = [];

    for (const plate of plates) {
      const count = Math.floor(remaining / plate);
      if (count > 0) {
        counts.push({ plate, count });
        remaining -= count * plate;
      }
    }

    const totalPlates = counts.reduce((s, c) => s + c.count * 2, 0);
    const actualWeight = barWeight + counts.reduce((s, c) => s + c.plate * c.count * 2, 0);

    return { counts, totalPlates, actualWeight, remaining: Math.round(remaining * 100) / 100 };
  }, [targetWeight, barWeight, plates]);

  return (
    <div className="card p-4">
      <p className="text-xs text-vapor-muted uppercase tracking-wider mb-3">Plate Calculator</p>
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="text-[10px] text-vapor-muted uppercase tracking-wider">Target Weight ({unit})</label>
          <input type="number" inputMode="decimal" value={targetWeight}
            onChange={e => setTargetWeight(e.target.value)}
            placeholder="e.g. 225" className="input-field w-full text-right font-mono" />
        </div>
        <div className="w-20">
          <label className="text-[10px] text-vapor-muted uppercase tracking-wider">Bar</label>
          <input type="number" inputMode="numeric" value={barWeight}
            onChange={e => setBarWeight(Number(e.target.value))}
            className="input-field w-full text-right font-mono" />
        </div>
      </div>

      {result ? (
        <div>
          <p className="text-sm font-semibold text-vapor-cyan mb-2">
            Total: {result.actualWeight} {unit} ({result.totalPlates} plates)
          </p>
          {result.counts.length === 0 ? (
            <p className="text-xs text-vapor-muted">Target weight equals bar weight — no plates needed</p>
          ) : (
            <div className="space-y-1">
              {result.counts.map(({ plate, count }) => (
                <div key={plate} className="flex items-center gap-2">
                  <div className="flex-1 h-5 bg-vapor-navy rounded overflow-hidden">
                    <div className="h-full bg-vapor-pink rounded" style={{ width: `${(count / 10) * 100}%` }} />
                  </div>
                  <span className="text-xs font-mono text-vapor-light w-16 text-right">{count}× per side</span>
                  <span className="text-xs font-bold text-vapor-cyan w-10 text-right">{plate}{unit}</span>
                </div>
              ))}
              {result.remaining > 0 && (
                <p className="text-xs text-vapor-yellow mt-1">
                  Can't exactly hit {targetWeight}{unit}. Closest: {result.actualWeight}{unit} (off by {result.remaining}{unit})
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-vapor-muted">Enter a target weight to calculate plates</p>
      )}
    </div>
  );
}
