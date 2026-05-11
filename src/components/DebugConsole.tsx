import { useState, useEffect, useRef, useCallback } from 'react';
import { LogEntry, LogLevel, getEntries, getSnapshots, subscribe, clearLogs, exportLogs, snapshot, StateSnapshot, registerDebugToggle } from '../debugLogger';

const LEVEL_COLORS: Record<LogLevel, string> = {
  log: '#a0a0b0',
  info: '#00f5ff',
  warn: '#fede5d',
  error: '#fe4450',
  debug: '#887baa',
};

const LEVEL_LABELS: Record<LogLevel, string> = {
  log: 'LOG',
  info: 'INF',
  warn: 'WRN',
  error: 'ERR',
  debug: 'DBG',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

function formatArg(a: unknown): string {
  if (a === null) return 'null';
  if (a === undefined) return 'undefined';
  if (typeof a === 'string') return a;
  if (typeof a === 'number' || typeof a === 'boolean') return String(a);
  try { return JSON.stringify(a, null, 2); }
  catch { return String(a); }
}

export default function DebugConsole() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<LogEntry[]>(getEntries());
  const [snapshots, setSnapshots] = useState<StateSnapshot[]>(getSnapshots());
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'log' | 'state'>('log');
  const [stateLabel, setStateLabel] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScroll = useRef(true);

  useEffect(() => {
    registerDebugToggle(() => setOpen(prev => !prev));
    return subscribe(() => {
      setEntries(getEntries());
      setSnapshots(getSnapshots());
    });
  }, []);

  useEffect(() => {
    if (autoScroll.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    autoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }, []);

  const takeSnapshot = () => {
    const label = stateLabel || `Snapshot ${new Date().toLocaleTimeString()}`;
    // Capture key app state
    const data: Record<string, unknown> = {};
    try { data.session = JSON.parse(localStorage.getItem('il-current') ?? 'null'); } catch {}
    try { data.history = JSON.parse(localStorage.getItem('il-history') ?? '[]'); } catch {}
    try { data.settings = JSON.parse(localStorage.getItem('il-settings') ?? '{}'); } catch {}
    data.url = window.location.href;
    data.userAgent = navigator.userAgent;
    data.viewport = `${window.innerWidth}x${window.innerHeight}`;
    data.memory = (performance as any).memory ? {
      used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB',
      limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024) + 'MB',
    } : undefined;
    snapshot(label, data);
    setStateLabel('');
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed right-2 bottom-28 z-[70] rounded-full h-9 w-9 flex items-center justify-center bg-[#12121A]/90 border border-[#ff2aa3]/20 text-[10px] text-[#887baa] font-mono backdrop-blur-sm hover:border-[#ff2aa3]/50 hover:text-[#ff2aa3] active:scale-90 transition-all"
        title="Debug Console"
      >
        {'</>'}
      </button>
    );
  }

  const filtered = entries.filter(e => {
    if (filter !== 'all' && e.level !== filter) return false;
    if (search) {
      const txt = e.args.map(formatArg).join(' ').toLowerCase();
      if (!txt.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const counts = {
    all: entries.length,
    log: entries.filter(e => e.level === 'log').length,
    info: entries.filter(e => e.level === 'info').length,
    warn: entries.filter(e => e.level === 'warn').length,
    error: entries.filter(e => e.level === 'error').length,
    debug: entries.filter(e => e.level === 'debug').length,
  };

  return (
    <div id="debug-console" className="fixed inset-x-0 bottom-0 z-[80] flex flex-col" style={{ height: '55vh' }}>
      {/* Drag handle */}
      <div className="flex-shrink-0 flex justify-center pt-2 pb-1 bg-[#0a0a0f]/95 border-t border-[#ff2aa3]/20 rounded-t-xl backdrop-blur-xl">
        <div className="w-10 h-1 rounded-full bg-zinc-700" />
      </div>

      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-zinc-800/50">
        <span className="text-[10px] font-mono text-[#ff2aa3] uppercase tracking-[0.2em] font-bold">Debug</span>

        {/* Tabs */}
        <div className="flex ml-2 gap-0.5">
          {(['log', 'state'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-2 py-0.5 text-[10px] rounded font-mono ${tab === t ? 'bg-[#ff2aa3]/20 text-[#ff2aa3]' : 'text-vapor-muted hover:text-zinc-300'}`}
            >
              {t === 'log' ? 'Log' : 'State'}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Filter chips */}
        {tab === 'log' && (
          <div className="flex gap-0.5">
            {(['all', 'error', 'warn', 'info', 'log', 'debug'] as const).map(l => (
              <button
                key={l}
                onClick={() => setFilter(l)}
                className={`px-1.5 py-0.5 text-[9px] rounded font-mono ${filter === l ? 'bg-zinc-700 text-white' : 'text-vapor-muted'}`}
              >
                {l.toUpperCase()}{l !== 'all' ? ` ${counts[l]}` : ''}
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <button onClick={() => { clearLogs(); setEntries([]); setSnapshots([]); }} className="text-[9px] text-vapor-muted hover:text-red-400 font-mono px-1">Clr</button>
        <button onClick={() => { const txt = exportLogs(); navigator.clipboard?.writeText(txt); }} className="text-[9px] text-vapor-muted hover:text-[#00f5ff] font-mono px-1">Copy</button>
        <button onClick={() => setOpen(false)} className="text-[9px] text-vapor-muted hover:text-white font-mono px-1 ml-1">X</button>
      </div>

      {/* Search (log tab only) */}
      {tab === 'log' && (
        <div className="flex-shrink-0 px-3 py-1.5 bg-[#0a0a0f]/95">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter logs..."
            className="w-full rounded border border-zinc-700/50 bg-[#12121A] px-2 py-1 text-[10px] font-mono text-[#f0e6ff] placeholder:text-zinc-500 focus:border-[#ff2aa3]/50 focus:outline-none"
          />
        </div>
      )}

      {/* Body */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-[#09090b]/98 px-2 py-1 font-mono text-[11px] leading-relaxed"
      >
        {tab === 'log' && filtered.map(e => (
          <div key={e.id} className="py-0.5 border-b border-zinc-900/50 hover:bg-zinc-900/30 px-1 rounded">
            <span className="text-vapor-muted/80 mr-2">{formatTime(e.timestamp)}</span>
            <span style={{ color: LEVEL_COLORS[e.level] }} className="font-bold mr-2">{LEVEL_LABELS[e.level]}</span>
            <span className="text-vapor-light">
              {e.args.map((a, i) => (
                <span key={i} className="break-all">{i > 0 ? ' ' : ''}{formatArg(a)}</span>
              ))}
            </span>
            {e.stack && (
              <pre className="text-[9px] text-vapor-muted/80 mt-0.5 ml-20 overflow-x-auto whitespace-pre-wrap">{e.stack}</pre>
            )}
          </div>
        ))}

        {tab === 'log' && filtered.length === 0 && (
          <div className="text-center text-vapor-muted/80 mt-8">No log entries</div>
        )}

        {tab === 'state' && (
          <div className="p-2">
            {/* Snapshot capture */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={stateLabel}
                onChange={e => setStateLabel(e.target.value)}
                placeholder="Snapshot label..."
                className="flex-1 rounded border border-zinc-700/50 bg-[#12121A] px-2 py-1 text-[10px] font-mono text-[#f0e6ff] placeholder:text-zinc-500 focus:border-[#00f5ff]/50 focus:outline-none"
              />
              <button
                onClick={takeSnapshot}
                className="rounded bg-[#ff2aa3]/20 border border-[#ff2aa3]/40 px-3 py-1 text-[10px] font-mono text-[#ff2aa3] hover:bg-[#ff2aa3]/30 active:scale-95"
              >
                Snap
              </button>
            </div>

            {/* Live state view */}
            <div className="mb-3">
              <p className="text-[10px] text-vapor-muted uppercase tracking-wider mb-1">Current localStorage</p>
              <pre className="text-[10px] text-vapor-muted bg-[#12121A] rounded p-2 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap border border-zinc-800/50">
                {['il-current', 'il-history', 'il-settings', 'il-prs'].map(k => {
                  try {
                    const v = localStorage.getItem(k);
                    const parsed = v ? JSON.parse(v) : null;
                    const summary = k === 'il-history'
                      ? `[${Array.isArray(parsed) ? parsed.length : 0} workouts]`
                      : k === 'il-current'
                        ? (parsed ? `${parsed.exercises?.length ?? 0} exercises` : 'null')
                        : JSON.stringify(parsed, null, 1);
                    return `${k}: ${summary}\n`;
                  } catch { return `${k}: <parse error>\n`; }
                }).join('')}
              </pre>
            </div>

            {/* Snapshots list */}
            <p className="text-[10px] text-vapor-muted uppercase tracking-wider mb-1">Snapshots ({snapshots.length})</p>
            {snapshots.slice().reverse().map(s => (
              <details key={s.id} className="mb-1.5">
                <summary className="text-[10px] text-vapor-muted cursor-pointer hover:text-zinc-200 font-mono">
                  {formatTime(s.timestamp)} — {s.label}
                </summary>
                <pre className="text-[9px] text-vapor-muted bg-[#12121A] rounded p-2 mt-1 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap border border-zinc-800/50">
                  {JSON.stringify(s.data, null, 2)}
                </pre>
              </details>
            ))}
            {snapshots.length === 0 && (
              <p className="text-vapor-muted/80 text-[10px]">No snapshots yet. Capture one above.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
