// Custom neon SVG icons — no emojis

type IconProps = { className?: string; glow?: boolean };

export function DumbbellIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <path d="M6.5 6.5v11M17.5 6.5v11" />
      <rect x="2" y="8" width="5" height="8" rx="1.5" />
      <rect x="17" y="8" width="5" height="8" rx="1.5" />
      <line x1="8" y1="10" x2="16" y2="10" strokeWidth="2.5" />
      <line x1="8" y1="14" x2="16" y2="14" strokeWidth="2.5" />
    </svg>
  );
}

export function ClipboardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="5" y="3" width="14" height="19" rx="2" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="16" y2="11" />
      <line x1="8" y1="15" x2="12" y2="15" />
      <path d="M9 3V1h6v2" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <rect x="8" y="13" width="2" height="2" rx="0.5" fill="currentColor" />
      <rect x="14" y="13" width="2" height="2" rx="0.5" fill="currentColor" />
    </svg>
  );
}

export function ChartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="13" width="4" height="8" rx="1" fill="currentColor" fillOpacity="0.3" />
      <rect x="10" y="7" width="4" height="14" rx="1" fill="currentColor" fillOpacity="0.3" />
      <rect x="17" y="3" width="4" height="18" rx="1" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}

export function FolderIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" />
      <line x1="3" y1="8" x2="21" y2="8" strokeWidth="1.2" opacity="0.5" />
    </svg>
  );
}

export function GearIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
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
