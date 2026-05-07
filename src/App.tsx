import { useState, useCallback, useEffect, useMemo } from 'react';
import { WorkoutSession, WorkoutSet, ExerciseLog } from './types';
import { generateId, loadSession, saveSession, clearSession, loadHistory, addWorkout, saveHistory, recalcPRs, loadSettings } from './storage';
import { setupVisibilitySync } from './idb-storage';
import { useTimer } from './hooks/useTimer';
import { useIOSPWA, InstallPrompt } from './hooks/useIOSPWA';
import WorkoutView from './components/WorkoutView';
import RoutinesView from './components/RoutinesView';
import HistoryView from './components/HistoryView';
import HistoryDetail from './components/HistoryDetail';
import CalendarView from './components/CalendarView';
import AnalyticsView from './components/AnalyticsView';
import SettingsView from './components/SettingsView';
import NavBar from './components/NavBar';

export type View = 'workout' | 'history' | 'calendar' | 'analytics' | 'routines' | 'settings';

export default function App() {
  const [view, setView] = useState<View>('workout');
  const [session, setSession] = useState<WorkoutSession | null>(loadSession);
  const [history, setHistory] = useState<WorkoutSession[]>(loadHistory);
  const [historyDetailId, setHistoryDetailId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const settings = loadSettings();
  const timer = useTimer(settings.restTimerDuration);
  const iosPWA = useIOSPWA();

  // Setup IndexedDB visibility sync for iOS persistence
  useEffect(() => { setupVisibilitySync(); }, []);

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

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
    setTimeout(() => setToast(null), 1800);
  }, []);

  // Persist session changes
  useEffect(() => {
    if (session) saveSession(session);
  }, [session]);

  // ── Session management ──
  const ensureSession = useCallback((): WorkoutSession => {
    if (session) return session;
    const s: WorkoutSession = {
      id: generateId(), startedAt: Date.now(), completedAt: Date.now(),
      exercises: [], notes: undefined,
    };
    setSession(s);
    return s;
  }, [session]);

  const addExercise = useCallback((exerciseKey: string, name: string) => {
    setSession(prev => {
      const s = prev ?? { id: generateId(), startedAt: Date.now(), completedAt: Date.now(), exercises: [], notes: undefined };
      const ex: ExerciseLog = { id: generateId(), exerciseKey, name, sets: [] };
      return { ...s, exercises: [...s.exercises, ex] };
    });
    showToast(`Added ${name}`);
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
    setSession(prev => {
      if (!prev) return prev;
      const exercises = prev.exercises
        .map(ex => ex.id === exerciseId ? {
          ...ex,
          sets: ex.sets.filter(s => s.id !== setId),
        } : ex)
        .filter(ex => ex.sets.length > 0 || ex.notes);
      if (exercises.length === 0) {
        clearSession();
        return null;
      }
      return { ...prev, exercises };
    });
  }, []);

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
    setSession(prev => {
      if (!prev) return prev;
      const exercises = prev.exercises.filter(ex => ex.id !== exerciseId);
      if (exercises.length === 0) {
        clearSession();
        return null;
      }
      return { ...prev, exercises };
    });
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
    clearSession();
    timer.reset();
    recalcPRs(updated);
    showToast('Workout saved!');
    setView('history');
  }, [session, timer, showToast]);

  const discardWorkout = useCallback(() => {
    setSession(null);
    clearSession();
    timer.reset();
    showToast('Workout discarded');
  }, [timer, showToast]);

  const startFromRoutine = useCallback((exercises: { key: string; name: string }[]) => {
    const s: WorkoutSession = {
      id: generateId(), startedAt: Date.now(), completedAt: Date.now(), exercises: [], notes: undefined,
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
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-zinc-950">
      <main className="flex-1 overflow-y-auto pb-28">
        {view === 'workout' && (
          <WorkoutView
            session={session}
            history={history}
            timer={timer}
            onAddExercise={addExercise}
            onAddSet={addSet}
            onUpdateSet={updateSet}
            onDeleteSet={deleteSet}
            onUpdateSession={updateSessionNotes}
            onDeleteExercise={deleteExercise}
            onFinish={finishWorkout}
            onDiscard={discardWorkout}
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
        <div className="pointer-events-none fixed inset-x-0 bottom-36 z-50 flex justify-center">
          <div className="animate-slide-up rounded-full bg-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}

      {/* iOS Install Prompt */}
      {iosPWA.showPrompt && (
        <InstallPrompt onDismiss={iosPWA.dismissPermanently} />
      )}
    </div>
  );
}
