// Custom neon SVG icons — no emojis

type IconProps = { className?: string; glow?: boolean };

export function DumbbellIcon({ className }: IconProps) {
  return <img src={`${import.meta.env.BASE_URL}icons/nav_workout.png`} alt="Workout" className={className} />;
}

export function ClipboardIcon({ className }: IconProps) {
  return <img src={`${import.meta.env.BASE_URL}icons/nav_history.png`} alt="History" className={className} />;
}

export function CalendarIcon({ className }: IconProps) {
  return <img src={`${import.meta.env.BASE_URL}icons/nav_calendar.png`} alt="Calendar" className={className} />;
}

export function ChartIcon({ className }: IconProps) {
  return <img src={`${import.meta.env.BASE_URL}icons/nav_stats.png`} alt="Stats" className={className} />;
}

export function FolderIcon({ className }: IconProps) {
  return <img src={`${import.meta.env.BASE_URL}icons/nav_routines.png`} alt="Routines" className={className} />;
}

export function GearIcon({ className }: IconProps) {
  return <img src={`${import.meta.env.BASE_URL}icons/nav_settings.png`} alt="Settings" className={className} />;
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ── Synthwave Sun (CSS art component) ──
export function SynthwaveSun() {
  return (
    <div className="relative w-full max-w-[320px] mx-auto" style={{ height: '220px' }}>
      {/* Perspective grid floor */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-24 overflow-hidden">
        <div
          className="w-full h-full"
          style={{
            background: `
              linear-gradient(0deg, rgba(255,42,163,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,245,255,0.06) 1px, transparent 1px)
            `,
            backgroundSize: '20px 8px, 20px 20px',
            transform: 'perspective(200px) rotateX(60deg)',
            transformOrigin: 'bottom center',
          }}
        />
      </div>

      {/* Sun body */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-gradient-to-t from-[#ff2aa3] via-[#ff8b39] to-[#fede5d] shadow-[0_0_60px_rgba(255,42,163,0.5),0_0_120px_rgba(255,107,57,0.3)] animate-neon-pulse" />

      {/* Sun slices (horizontal bars across the lower half of the sun) */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-40 h-20 overflow-hidden rounded-b-full">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[2px] bg-[#0a0a0f]/40" style={{ marginTop: i * 2 }} />
        ))}
      </div>

      {/* Dumbbell silhouette in front of sun */}
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 text-[#0a0a0f]">
        <svg viewBox="0 0 100 60" width="100" height="60" fill="currentColor">
          <rect x="2" y="10" width="18" height="40" rx="4" />
          <rect x="80" y="10" width="18" height="40" rx="4" />
          <rect x="20" y="20" width="60" height="20" rx="3" />
        </svg>
      </div>
    </div>
  );
}
