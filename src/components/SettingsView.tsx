import { useState } from 'react';
import { exportAllJSON, exportHistoryCSV, downloadFile, clearAllData, loadSettings, saveSettings } from '../storage';
import { todayStamp } from '../utils';

type Props = {
  onShowToast: (msg: string) => void;
};

export default function SettingsView({ onShowToast }: Props) {
  const [settings, setSettings] = useState(loadSettings);

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
        <p className="text-lg font-black text-zinc-50">Preferences</p>
      </div>

      {/* Unit preference */}
      <div className="card p-4 mb-4">
        <p className="text-sm font-semibold text-zinc-50 mb-3">Weight Unit</p>
        <div className="flex gap-2">
          {(['lb', 'kg'] as const).map(u => (
            <button
              key={u}
              onClick={() => updateSetting('weightUnit', u)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                settings.weightUnit === u ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {u === 'lb' ? 'Pounds (lb)' : 'Kilograms (kg)'}
            </button>
          ))}
        </div>
      </div>

      {/* Default rest timer */}
      <div className="card p-4 mb-4">
        <p className="text-sm font-semibold text-zinc-50 mb-3">Default Rest Timer</p>
        <div className="flex gap-2 flex-wrap">
          {[60, 90, 120, 150, 180].map(d => (
            <button
              key={d}
              onClick={() => updateSetting('restTimerDuration', d)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                settings.restTimerDuration === d ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {d >= 60 ? `${d/60}m` : `${d}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Data management */}
      <div className="card p-4 mb-4">
        <p className="text-sm font-semibold text-zinc-50 mb-3">Data</p>
        <div className="flex flex-col gap-2">
          <button onClick={handleExport} className="btn-secondary w-full text-sm py-3 text-left pl-4">
            📦 Export All Data (JSON)
          </button>
          <button onClick={handleExportCSV} className="btn-secondary w-full text-sm py-3 text-left pl-4">
            📊 Export History (CSV)
          </button>
          <button onClick={handleClear} className="btn-danger w-full text-sm py-3 text-left pl-4">
            🗑 Clear All Data
          </button>
        </div>
      </div>

      {/* About */}
      <div className="card p-4 mb-4">
        <p className="text-sm font-semibold text-zinc-50 mb-3">About</p>
        <div className="space-y-2 text-sm text-zinc-400">
          <p><strong className="text-zinc-200">IronLog</strong> v1.0.0</p>
          <p>A workout tracker PWA built for iOS.</p>
          <p className="text-xs text-zinc-500 mt-2">
            Data stored locally on your device. Install to home screen for best experience.
          </p>
        </div>
      </div>
    </div>
  );
}
