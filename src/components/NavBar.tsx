import { View } from '../App';
import { DumbbellIcon, ClipboardIcon, CalendarIcon, ChartIcon, FolderIcon, GearIcon } from './Icons';

type Props = {
  view: View;
  onChange: (v: View) => void;
  hasActiveSession: boolean;
};

const TABS: { view: View; label: string; Icon: typeof DumbbellIcon }[] = [
  { view: 'workout', label: 'Workout', Icon: DumbbellIcon },
  { view: 'history', label: 'History', Icon: ClipboardIcon },
  { view: 'calendar', label: 'Calendar', Icon: CalendarIcon },
  { view: 'analytics', label: 'Stats', Icon: ChartIcon },
  { view: 'routines', label: 'Routines', Icon: FolderIcon },
  { view: 'settings', label: 'Settings', Icon: GearIcon },
];

export default function NavBar({ view, onChange, hasActiveSession }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#ff2aa3]/20 bg-[#0a0a0f]/95 safe-area-bottom backdrop-blur-xl"
      style={{ boxShadow: '0 -4px 20px rgba(255,42,163,0.06)' }}>
      <div className="mx-auto flex max-w-lg items-center justify-around px-1">
        {TABS.map(tab => (
          <button
            key={tab.view}
            onClick={() => onChange(tab.view)}
            className={`relative flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium transition-all ${
              view === tab.view
                ? 'text-[#ff2aa3] [text-shadow:0_0_8px_rgba(255,42,163,0.6),0_0_16px_rgba(255,42,163,0.3)]'
                : 'text-zinc-600 hover:text-zinc-400'
            }`}
          >
            {tab.view === 'workout' && hasActiveSession && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ff2aa3] shadow-[0_0_8px_rgba(255,42,163,0.9)] animate-pulse" />
            )}
            <tab.Icon className={`w-6 h-6 ${view === tab.view ? 'drop-shadow-[0_0_6px_rgba(255,42,163,0.5)]' : ''}`} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
