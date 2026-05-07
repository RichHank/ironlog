import { View } from '../App';

type Props = {
  view: View;
  onChange: (v: View) => void;
  hasActiveSession: boolean;
};

const TABS: { view: View; label: string; icon: string }[] = [
  { view: 'workout', label: 'Workout', icon: '🏋️' },
  { view: 'history', label: 'History', icon: '📋' },
  { view: 'calendar', label: 'Calendar', icon: '📅' },
  { view: 'analytics', label: 'Stats', icon: '📊' },
  { view: 'routines', label: 'Routines', icon: '📁' },
  { view: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function NavBar({ view, onChange, hasActiveSession }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#ff2aa3]/15 bg-[#0a0a0f]/95 safe-area-bottom backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center justify-around px-1">
        {TABS.map(tab => (
          <button
            key={tab.view}
            onClick={() => onChange(tab.view)}
            className={`relative flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium transition-all ${
              view === tab.view
                ? 'text-[#ff2aa3] [text-shadow:0_0_8px_rgba(255,42,163,0.5)]'
                : 'text-zinc-500'
            }`}
          >
            {tab.view === 'workout' && hasActiveSession && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ff2aa3] shadow-[0_0_6px_rgba(255,42,163,0.8)]" />
            )}
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
