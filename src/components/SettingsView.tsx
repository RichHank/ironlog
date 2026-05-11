import { useState } from 'react';
import { exportAllJSON, exportHistoryCSV, downloadFile, clearAllData, loadSettings, saveSettings, loadHistory, saveHistory, loadRoutines, saveRoutines } from '../storage';
import { todayStamp } from '../utils';
import BodyMeasurements from './BodyMeasurements';
import PlateCalculator from './PlateCalculator';
import StravaSection from './StravaSection';
import { getVaporSynth } from '../vaporSynth';

type Props = {
  onShowToast: (msg: string) => void;
};

type Tab = 'prefs' | 'body' | 'plates' | 'strava' | 'data';

export default function SettingsView({ onShowToast }: Props) {
  const [settings, setSettings] = useState(loadSettings);
  const [tab, setTab] = useState<Tab>('prefs');
  const [musicMuted, setMusicMuted] = useState(() => getVaporSynth().isMuted());

  const toggleMusic = () => {
    const synth = getVaporSynth();
    const next = !synth.isMuted();
    synth.setMuted(next);
    setMusicMuted(next);
    if (!next) synth.start().catch(() => {});
  };

  const handleExport = () => {
    downloadFile(`ironlog-${todayStamp()}.json`, exportAllJSON(), 'application/json');
    onShowToast('Data exported');
  };

  const handleExportCSV = () => {
    downloadFile(`ironlog-${todayStamp()}.csv`, exportHistoryCSV(), 'text/csv');
    onShowToast('CSV exported');
  };

  const handleClear = () => {
    if (window.confirm('Delete all workout data? This cannot be undone.')) {
      clearAllData();
      onShowToast('All data cleared');
      window.location.reload();
    }
  };

  const updateSetting = <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);
  };

  return (
    <div className="px-3 pt-4 sm:px-4">
      <div className="mb-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Settings</p>
        <p className="text-lg font-black text-zinc-50">Preferences & Tools</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-hide">
        {([
          { key: 'prefs', label: 'Preferences' },
          { key: 'body', label: 'Body Weight' },
          { key: 'plates', label: 'Plate Calc' },
          { key: 'strava', label: 'Strava' },
          { key: 'data', label: 'Data' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold ${tab === t.key ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'prefs' && (
        <div className="space-y-4">
          <div className="card p-4">
            <p className="text-sm font-semibold text-zinc-50 mb-3">Weight Unit</p>
            <div className="flex gap-2">
              {(['lb', 'kg'] as const).map(u => (
                <button key={u} onClick={() => updateSetting('weightUnit', u)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${settings.weightUnit === u ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                  {u === 'lb' ? 'Pounds (lb)' : 'Kilograms (kg)'}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <p className="text-sm font-semibold text-zinc-50 mb-3">Default Rest Timer</p>
            <div className="flex gap-2 flex-wrap">
              {[60, 90, 120, 150, 180].map(d => (
                <button key={d} onClick={() => updateSetting('restTimerDuration', d)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${settings.restTimerDuration === d ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                  {d >= 60 ? `${d/60}m` : `${d}s`}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-50">Vaporwave background loop</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Procedurally generated chiptune + pad. Plays after first tap.</p>
              </div>
              <button
                onClick={toggleMusic}
                className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold ${musicMuted ? 'bg-zinc-800 text-zinc-400' : 'bg-[#ff2aa3] text-white shadow-[0_0_12px_rgba(255,42,163,0.4)]'}`}
              >
                {musicMuted ? 'Off' : 'On'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'body' && <BodyMeasurements onShowToast={onShowToast} />}

      {tab === 'plates' && <PlateCalculator unit={settings.weightUnit} />}

      {tab === 'strava' && <StravaSection onShowToast={onShowToast} />}

      {tab === 'data' && (
        <div className="space-y-4">
          <div className="card p-4">
            <p className="text-sm font-semibold text-zinc-50 mb-3">Export</p>
            <div className="flex flex-col gap-2">
              <button onClick={handleExport} className="btn-secondary w-full text-sm py-3 text-left pl-4">
                Export All Data (JSON)
              </button>
              <button onClick={handleExportCSV} className="btn-secondary w-full text-sm py-3 text-left pl-4">
                Export History (CSV)
              </button>
            </div>
          </div>

          <div className="card p-4">
            <p className="text-sm font-semibold text-zinc-50 mb-3">Import</p>
            <div className="flex flex-col gap-2">
              <label className="btn-secondary w-full text-sm py-3 text-left pl-4 cursor-pointer">
                Import Data (JSON)
                <input type="file" accept=".json" className="hidden" onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    if (data.history) {
                      const { loadHistory, saveHistory, loadRoutines, saveRoutines, loadPRs, savePRs, loadMeasurements, saveMeasurements } = await import('../storage');
                      const hist = loadHistory();
                      const merged = [...data.history, ...hist].filter((s: { id: string }, i: number, arr: { id: string }[]) => arr.findIndex(x => x.id === s.id) === i);
                      saveHistory(merged);
                      if (data.routines) { const r = loadRoutines(); const mr = [...data.routines, ...r].filter((rt: { id: string }, i: number, arr: { id: string }[]) => arr.findIndex(x => x.id === rt.id) === i); saveRoutines(mr); }
                      if (data.prs) { const existingPRs = loadPRs(); const mergedPRs = [...data.prs, ...existingPRs].filter((p: { id: string }, i: number, arr: { id: string }[]) => arr.findIndex(x => x.id === p.id) === i); savePRs(mergedPRs); }
                      if (data.measurements) { const existingMeas = loadMeasurements(); const mergedMeas = [...data.measurements, ...existingMeas].filter((m: { id: string }, i: number, arr: { id: string }[]) => arr.findIndex(x => x.id === m.id) === i); saveMeasurements(mergedMeas); }
                      onShowToast('Data imported');
                      window.location.reload();
                    }
                  } catch { onShowToast('Invalid import file'); }
                }} />
              </label>
            </div>
          </div>

          <div className="card p-4">
            <p className="text-sm font-semibold text-zinc-50 mb-3">Danger Zone</p>
            <button onClick={handleClear} className="btn-danger w-full text-sm py-3 text-left pl-4">
              Clear All Data
            </button>
          </div>
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}
