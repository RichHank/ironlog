// ── Debug Logger ──────────────────────────────────────────────────────────
// Ring-buffer log capture with localStorage persistence. Intercepts console.*
// so nothing is missed. Access the console via triple-tap on the IronLog title
// on the empty-state screen, or programmatically via toggleDebugConsole().

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  id: number;
  level: LogLevel;
  args: unknown[];
  timestamp: number;
  stack?: string;
}

export interface StateSnapshot {
  id: number;
  label: string;
  data: unknown;
  timestamp: number;
}

const MAX_ENTRIES = 500;
const PERSIST_KEY = 'il-debug-log';
const SNAPSHOT_KEY = 'il-debug-snapshots';

let idCounter = 0;
let entries: LogEntry[] = [];
let snapshots: StateSnapshot[] = [];
let listeners: Set<() => void> = new Set();
let _interceptInstalled = false;

// ── Persistence ──

function persist(): void {
  try {
    const slim = entries.slice(-200).map(e => ({
      id: e.id, level: e.level, timestamp: e.timestamp,
      args: e.args.map(a => {
        try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
        catch { return String(a); }
      }),
    }));
    localStorage.setItem(PERSIST_KEY, JSON.stringify(slim));
  } catch { /* quota */ }
}

function persistSnapshots(): void {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots.slice(-20)));
  } catch {}
}

function loadPersisted(): void {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LogEntry[];
      entries = parsed;
      idCounter = parsed.length > 0 ? Math.max(...parsed.map(e => e.id)) + 1 : 0;
    }
    const rawSnap = localStorage.getItem(SNAPSHOT_KEY);
    if (rawSnap) snapshots = JSON.parse(rawSnap) as StateSnapshot[];
  } catch {}
}

// ── Intercept ──

const ORIGINALS: Record<string, (...a: unknown[]) => void> = {};

function installIntercept(): void {
  if (_interceptInstalled) return;
  _interceptInstalled = true;
  for (const level of ['log', 'info', 'warn', 'error', 'debug'] as LogLevel[]) {
    ORIGINALS[level] = (console as any)[level];
    (console as any)[level] = (...args: unknown[]) => {
      ORIGINALS[level](...args);
      push(level, args);
    };
  }

  // Capture unhandled errors
  window.addEventListener('error', (e) => {
    push('error', [e.error?.stack ?? e.message ?? 'Unhandled error', e.error]);
  });
  window.addEventListener('unhandledrejection', (e) => {
    push('error', ['Unhandled rejection', e.reason]);
  });
}

// ── API ──

function push(level: LogLevel, args: unknown[]): void {
  const entry: LogEntry = {
    id: idCounter++,
    level,
    args,
    timestamp: Date.now(),
    stack: level === 'error' ? new Error().stack?.split('\n').slice(2).join('\n') : undefined,
  };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries = entries.slice(-MAX_ENTRIES);
  persist();
  listeners.forEach(fn => fn());
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getEntries(): LogEntry[] { return entries; }

export function getSnapshots(): StateSnapshot[] { return snapshots; }

export function snapshot(label: string, data: unknown): void {
  const s: StateSnapshot = { id: idCounter++, label, data, timestamp: Date.now() };
  snapshots.push(s);
  if (snapshots.length > 100) snapshots = snapshots.slice(-100);
  persistSnapshots();
  push('debug', [`[snapshot] ${label}`, data]);
}

export function clearLogs(): void {
  entries = [];
  snapshots = [];
  localStorage.removeItem(PERSIST_KEY);
  localStorage.removeItem(SNAPSHOT_KEY);
  listeners.forEach(fn => fn());
}

export function exportLogs(): string {
  const lines = entries.map(e => {
    const ts = new Date(e.timestamp).toISOString();
    const args = e.args.map(a => {
      try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
      catch { return String(a); }
    }).join(' ');
    return `[${ts}] ${e.level.toUpperCase()} ${args}${e.stack ? '\n' + e.stack : ''}`;
  });
  return lines.join('\n');
}

// Triple-tap detector
let tapCount = 0;
let tapTimer: ReturnType<typeof setTimeout> | null = null;

export function onDebugTrigger(cb: () => void): void {
  // Expose global toggle
  (window as any).toggleDebugConsole = () => cb();
}

export function handleDebugTap(): void {
  tapCount++;
  if (tapTimer) clearTimeout(tapTimer);
  if (tapCount >= 3) {
    tapCount = 0;
    const el = document.getElementById('debug-console');
    if (el) {
      el.classList.toggle('hidden');
    } else {
      // Fire any registered callback
      (window as any).__debugToggle?.();
    }
  }
  tapTimer = setTimeout(() => { tapCount = 0; }, 800);
}

export function registerDebugToggle(fn: () => void): void {
  (window as any).__debugToggle = fn;
  (window as any).toggleDebugConsole = fn;
}

// Init
loadPersisted();
installIntercept();
