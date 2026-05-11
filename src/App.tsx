import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { WorkoutSession, WorkoutSet, ExerciseLog } from './types';
import { generateId, loadSession, saveSession, clearSession, loadHistory, addWorkout, saveHistory, recalcPRs, updatePRsAfterAdd, loadSettings, hydrateFromIDB } from './storage';
import { setupVisibilitySync } from './idb-storage';
import { readOAuthCallback, completeOAuth, clearOAuthCallback, loadTokens, pushWorkout } from './strava';
import type { ShareOutcome } from './share';
import { getVaporSynth } from './vaporSynth';
import { useTimer } from './hooks/useTimer';
import { useIOSPWA, InstallPrompt } from './hooks/useIOSPWA';
import { useWakeLock } from './hooks/useWakeLock';
import WorkoutView from './components/WorkoutView';
import RoutinesView from './components/RoutinesView';
import HistoryView from './components/HistoryView';
import HistoryDetail from './components/HistoryDetail';
import CalendarView from './components/CalendarView';
import AnalyticsView from './components/AnalyticsView';
import SettingsView from './components/SettingsView';
import NavBar from './components/NavBar';
import BootMascot from './components/BootMascot';
import DebugConsole from './components/DebugConsole';
import { formatWeightCell } from './utils';

export type View = 'workout' | 'history' | 'calendar' | 'analytics' | 'routines' | 'settings';

export default function App() {
  const [view, setView] = useState<View>('workout');
  const [session, setSession] = useState<WorkoutSession | null>(loadSession);
  const [history, setHistory] = useState<WorkoutSession[]>(loadHistory);
  const [historyDetailId, setHistoryDetailId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; action?: { label: string; onClick: () => void } } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDeletedSet = useRef<{ exerciseId: string; setId: string; set: WorkoutSet } | null>(null);

  const settings = loadSettings();
  const timer = useTimer(settings.restTimerDuration);
  const iosPWA = useIOSPWA();
  const wakeLock = useWakeLock();

  // Hold the screen-wake lock for the whole duration of an active workout.
  // The dead time between sets (chalking up, untangling a band) is when iOS
  // would otherwise dim the screen — exactly when users want it on.
  useEffect(() => {
    if (session) wakeLock.acquire(); else wakeLock.release();
  }, [session, wakeLock]);

  // Setup IndexedDB visibility sync for iOS persistence (best-effort flush
  // on hide; the canonical persistence path is the write-through in
  // saveSession/saveHistory etc.)
  useEffect(() => { setupVisibilitySync(); }, []);

  // Cold-start hydration. localStorage may have been evicted by iOS but IDB
  // is durable — pull from IDB on mount and overlay anything we find that's
  // newer/non-empty. Without this, an evicted-localStorage user would open
  // to an empty app even though all their data is sitting in IDB.
  useEffect(() => {
    let cancelled = false;
    hydrateFromIDB().then(idb => {
      if (cancelled) return;
      setSession(prev => prev ?? idb.session);
      setHistory(prev => prev.length > 0 ? prev : idb.history);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Vaporwave background music — auto-start on first user gesture (browser autoplay policy)
  useEffect(() => {
    const synth = getVaporSynth();
    const kickoff = () => {
      synth.start().catch(() => {});
      window.removeEventListener('pointerdown', kickoff);
      window.removeEventListener('keydown', kickoff);
    };
    window.addEventListener('pointerdown', kickoff, { once: true });
    window.addEventListener('keydown', kickoff, { once: true });
    return () => {
      window.removeEventListener('pointerdown', kickoff);
      window.removeEventListener('keydown', kickoff);
    };
  }, []);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    // Only init PushManager if installed as PWA
    if ((navigator as Navigator & { standalone?: boolean }).standalone && 'PushManager' in window) {
      // Push subscription would go here
    }
  }, []);

  const showToast = useCallback((msg: string, action?: { label: string; onClick: () => void }) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message: msg, action });
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
    const duration = action ? 4000 : 1800;
    toastTimer.current = setTimeout(() => setToast(null), duration);
  }, []);

  // Handle Strava OAuth redirect (?code=&state=)
  useEffect(() => {
    const cb = readOAuthCallback();
    if (!cb) return;
    let cancelled = false;
    completeOAuth(cb)
      .then(t => {
        if (cancelled) return;
        const who = t.athlete?.firstname ? `Connected to Strava as ${t.athlete.firstname}` : 'Connected to Strava';
        showToast(who);
        setView('settings');
      })
      .catch(err => {
        if (cancelled) return;
        showToast(`Strava connect failed: ${err.message ?? err}`);
      })
      .finally(() => {
        if (!cancelled) clearOAuthCallback();
      });
    return () => { cancelled = true; };
  }, [showToast]);

  // Persist session changes
  useEffect(() => {
    if (session) saveSession(session);
  }, [session]);

  const addExercise = useCallback((exerciseKey: string, name: string) => {
    setSession(prev => {
      const s = prev ?? { id: generateId(), startedAt: Date.now(), completedAt: 0, exercises: [], notes: undefined };
      const ex: ExerciseLog = { id: generateId(), exerciseKey, name, sets: [] };
      return { ...s, exercises: [...s.exercises, ex] };
    });
    showToast(`Added ${name}`);
  }, [showToast]);

  const addExerciseWithSets = useCallback((exerciseKey: string, name: string, sets: Omit<WorkoutSet, 'id' | 'completedAt'>[]) => {
    setSession(prev => {
      const s = prev ?? { id: generateId(), startedAt: Date.now(), completedAt: 0, exercises: [], notes: undefined };
      const ex: ExerciseLog = {
        id: generateId(), exerciseKey, name,
        sets: sets.map(set => ({ ...set, id: generateId(), completedAt: Date.now() })),
      };
      return { ...s, exercises: [...s.exercises, ex] };
    });
    showToast(`Voice: ${name} ${sets.map(s => `${formatWeightCell(s.weight, exerciseKey)}×${s.reps}`).join(', ')}`);
  }, [showToast]);

  const addSet = useCallback((exerciseId: string, set: Omit<WorkoutSet, 'id' | 'completedAt'>) => {
    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map(ex =>
          ex.id === exerciseId ? {
            ...ex,
            sets: [...ex.sets, { ...set, id: generateId(), completedAt: Date.now() }],
          } : ex
        ),
      };
    });
  }, []);

  const updateSet = useCallback((exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => {
    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map(ex =>
          ex.id === exerciseId ? {
            ...ex,
            sets: ex.sets.map(s => s.id === setId ? { ...s, ...updates } : s),
          } : ex
        ),
      };
    });
  }, []);

  const deleteSet = useCallback((exerciseId: string, setId: string) => {
    let foundSet: WorkoutSet | null = null;
    setSession(prev => {
      if (!prev) return prev;
      for (const ex of prev.exercises) {
        if (ex.id === exerciseId) {
          const set = ex.sets.find(s => s.id === setId);
          if (set) foundSet = set;
          break;
        }
      }
      return {
        ...prev,
        exercises: prev.exercises.map(ex =>
          ex.id === exerciseId
            ? { ...ex, sets: ex.sets.filter(s => s.id !== setId) }
            : ex
        ),
      };
    });
    if (foundSet) {
      lastDeletedSet.current = { exerciseId, setId, set: foundSet };
      showToast('Set deleted', {
        label: 'Undo',
        onClick: () => {
          const info = lastDeletedSet.current;
          if (!info) return;
          setSession(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              exercises: prev.exercises.map(ex =>
                ex.id === info.exerciseId
                  ? { ...ex, sets: [...ex.sets, info.set] }
                  : ex
              ),
            };
          });
          lastDeletedSet.current = null;
          showToast('Set restored');
        },
      });
    }
  }, [showToast]);

  const reorderExercises = useCallback((exerciseIds: string[]) => {
    setSession(prev => {
      if (!prev) return prev;
      const byId = new Map(prev.exercises.map(ex => [ex.id, ex]));
      const reordered = exerciseIds.map(id => byId.get(id)!).filter(Boolean);
      return { ...prev, exercises: reordered };
    });
  }, []);

  const updateSessionNotes = useCallback((updates: Partial<WorkoutSession>) => {
    setSession(prev => prev ? { ...prev, ...updates } : prev);
  }, []);

  const deleteExercise = useCallback((exerciseId: string) => {
    let shouldClear = false;
    setSession(prev => {
      if (!prev) return prev;
      const exercises = prev.exercises.filter(ex => ex.id !== exerciseId);
      if (exercises.length === 0) {
        shouldClear = true;
        return null;
      }
      return { ...prev, exercises };
    });
    if (shouldClear) {
      clearSession();
    }
  }, []);

  const finishWorkout = useCallback(() => {
    if (!session) return;
    const completed: WorkoutSession = {
      ...session,
      completedAt: Date.now(),
      duration: Math.round((Date.now() - session.startedAt) / 60000),
    };
    const updated = addWorkout(completed);
    setHistory(updated);
    setSession(null);
    updatePRsAfterAdd(completed);
    clearSession();
    timer.reset();
    showToast('Workout saved!');
    setView('history');

    // Auto-push to Strava if connected (fire-and-forget)
    loadTokens().then(t => {
      if (!t) return;
      pushWorkout(completed)
        .then(({ id }) => {
          setHistory(prev => {
            const next = prev.map(s => s.id === completed.id ? { ...s, stravaActivityId: id } : s);
            saveHistory(next);
            return next;
          });
          showToast('Pushed to Strava');
        })
        .catch(err => showToast(`Strava push failed: ${err.message ?? err}`));
    });
  }, [session, timer, showToast]);

  const pushHistoryToStrava = useCallback(async (sessionId: string) => {
    const target = history.find(s => s.id === sessionId);
    if (!target) return;
    const t = await loadTokens();
    if (!t) {
      showToast('Connect Strava in Settings first');
      return;
    }
    try {
      const { id } = await pushWorkout(target);
      setHistory(prev => {
        const next = prev.map(s => s.id === sessionId ? { ...s, stravaActivityId: id } : s);
        saveHistory(next);
        return next;
      });
      showToast('Pushed to Strava');
    } catch (err) {
      showToast(`Strava push failed: ${err instanceof Error ? err.message : err}`);
    }
  }, [history, showToast]);

  const handleShareDone = useCallback(({ result }: ShareOutcome) => {
    if (result === 'shared') showToast('Shared!');
    else if (result === 'cancelled') showToast('Cancelled');
    else showToast('FIT file downloaded');
  }, [showToast]);

  const discardWorkout = useCallback(() => {
    setSession(null);
    clearSession();
    timer.reset();
    showToast('Workout discarded');
  }, [timer, showToast]);

  const undoLast = useCallback(() => {
    setSession(prev => {
      if (!prev) return prev;
      for (let i = prev.exercises.length - 1; i >= 0; i--) {
        const ex = prev.exercises[i];
        if (ex.sets.length > 0) {
          return {
            ...prev,
            exercises: prev.exercises.map((e, idx) => idx === i ? { ...e, sets: e.sets.slice(0, -1) } : e),
          };
        }
      }
      return prev;
    });
  }, []);

  const startFromRoutine = useCallback((exercises: { key: string; name: string }[]) => {
    const s: WorkoutSession = {
      id: generateId(), startedAt: Date.now(), completedAt: 0, exercises: [], notes: undefined,
    };
    for (const ex of exercises) {
      s.exercises.push({ id: generateId(), exerciseKey: ex.key, name: ex.name, sets: [] });
    }
    setSession(s);
    setView('workout');
  }, []);

  const deleteHistoryWorkout = useCallback((id: string) => {
    const updated = history.filter(s => s.id !== id);
    setHistory(updated);
    saveHistory(updated);
    recalcPRs(updated);
    setHistoryDetailId(null);
    showToast('Workout deleted');
  }, [history, showToast]);

  const updateHistorySet = useCallback((sessionId: string, exerciseId: string, set: WorkoutSet) => {
    const updated = history.map(s => {
      if (s.id !== sessionId) return s;
      return {
        ...s,
        exercises: s.exercises.map(ex =>
          ex.id === exerciseId ? {
            ...ex,
            sets: ex.sets.map(st => st.id === set.id ? set : st),
          } : ex
        ),
      };
    });
    setHistory(updated);
    saveHistory(updated);
    recalcPRs(updated);
  }, [history]);

  const deleteHistorySet = useCallback((sessionId: string, exerciseId: string, setId: string) => {
    const updated = history.map(s => {
      if (s.id !== sessionId) return s;
      const exercises = s.exercises
        .map(ex => ex.id === exerciseId ? {
          ...ex,
          sets: ex.sets.filter(st => st.id !== setId),
        } : ex)
        .filter(ex => ex.sets.length > 0 || ex.notes);
      if (exercises.length === 0) return null;
      return { ...s, exercises };
    }).filter((s): s is WorkoutSession => s !== null);

    if (!updated.some(s => s.id === sessionId)) {
      showToast('Workout deleted (last set removed)');
      setHistoryDetailId(null);
    } else {
      showToast('Set deleted');
    }
    setHistory(updated);
    saveHistory(updated);
    recalcPRs(updated);
  }, [history, showToast]);

  const historyDetail = useMemo(() =>
    historyDetailId ? history.find(s => s.id === historyDetailId) ?? null : null
  , [history, historyDetailId]);

  if (historyDetail) {
    return (
      <HistoryDetail
        session={historyDetail}
        onBack={() => setHistoryDetailId(null)}
        onDelete={deleteHistoryWorkout}
        onUpdateSet={updateHistorySet}
        onDeleteSet={deleteHistorySet}
        onPushToStrava={pushHistoryToStrava}
        onShareDone={handleShareDone}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-vapor-black relative z-[1]">
      <main className="flex-1 overflow-y-auto pb-28">
        {view === 'workout' && (
          <WorkoutView
            session={session}
            history={history}
            timer={timer}
            onAddExercise={addExercise}
            onAddExerciseWithSets={addExerciseWithSets}
            onAddSet={addSet}
            onUpdateSet={updateSet}
            onDeleteSet={deleteSet}
            onUpdateSession={updateSessionNotes}
            onDeleteExercise={deleteExercise}
            onFinish={finishWorkout}
            onDiscard={discardWorkout}
            onUndoLast={undoLast}
            onNavigate={setView}
            onShowToast={showToast}
          />
        )}
        {view === 'routines' && (
          <RoutinesView
            onStart={startFromRoutine}
            onShowToast={showToast}
          />
        )}
        {view === 'history' && (
          <HistoryView
            sessions={history}
            onSelect={id => setHistoryDetailId(id)}
          />
        )}
        {view === 'calendar' && (
          <CalendarView sessions={history} onSelect={id => setHistoryDetailId(id)} />
        )}
        {view === 'analytics' && (
          <AnalyticsView sessions={history} />
        )}
        {view === 'settings' && (
          <SettingsView onShowToast={showToast} />
        )}
      </main>

      <NavBar view={view} onChange={setView} hasActiveSession={!!session && session.exercises.some(e => e.sets.length > 0)} />

      {toast && (
        <div className="pointer-events-auto fixed inset-x-0 bottom-36 z-50 flex justify-center">
          <div className="animate-float-up rounded-full bg-gradient-to-r from-[#ff2aa3] to-[#ff2e88] px-5 py-2 text-sm font-semibold text-white shadow-[0_0_15px_rgba(255,42,163,0.4)] flex items-center gap-3">
            <span>{toast.message}</span>
            {toast.action && (
              <button onClick={toast.action.onClick} className="font-bold underline underline-offset-2 hover:text-white/80 whitespace-nowrap">
                {toast.action.label}
              </button>
            )}
          </div>
        </div>
      )}

      {/* iOS Install Prompt */}
      {iosPWA.showPrompt && (
        <InstallPrompt onDismiss={iosPWA.dismissPermanently} />
      )}

      <BootMascot />
      <DebugConsole />
    </div>
  );
}
