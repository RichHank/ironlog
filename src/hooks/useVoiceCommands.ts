import { useCallback, useRef, useState } from 'react';
import { classifyIntent, ClassifiedIntent } from '../voiceCommands';
import { parseWorkoutInputSmart } from '../aiParser';
import { WorkoutSession, WorkoutSet } from '../types';
import { EXERCISES } from '../exerciseData';
import { formatWeightCell } from '../utils';
import { playSuccessChime, playErrorBuzz, speak } from '../voiceFeedback';
import type { View } from '../App';

const LOW_CONFIDENCE_THRESHOLD = 0.65;

export interface VoiceCommandHandlers {
  session: WorkoutSession | null;
  onAddExercise: (key: string, name: string) => void;
  onAddExerciseWithSets: (key: string, name: string, sets: Omit<WorkoutSet, 'id' | 'completedAt'>[]) => void;
  onAddSet: (exerciseId: string, set: Omit<WorkoutSet, 'id' | 'completedAt'>) => void;
  onUpdateSet: (exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
  onDeleteSet: (exerciseId: string, setId: string) => void;
  onDeleteExercise: (id: string) => void;
  onUpdateSession: (updates: Partial<WorkoutSession>) => void;
  onFinish: () => void;
  onDiscard: () => void;
  onUndoLast: () => void;
  onNavigate: (view: View) => void;
  onShowToast: (msg: string) => void;
  timer: { start: () => void; pause: () => void; resume: () => void; reset: () => void };
}

export interface VoiceFeedback {
  raw: string;
  confidence: number;
  source: 'rule' | 'ai' | 'mixed';
  ok: boolean;
  message: string;
}

export function useVoiceCommands(handlers: VoiceCommandHandlers) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<VoiceFeedback | null>(null);
  const lockRef = useRef(false);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const execute = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;
    if (lockRef.current) return;
    lockRef.current = true;
    setIsProcessing(true);
    try {
      const h = handlersRef.current;
      const sessionSnapshot = h.session;
      const classified = classifyIntent(transcript);
      const result = await dispatch(classified, h, sessionSnapshot);
      setLastFeedback({
        raw: classified.raw,
        confidence: classified.confidence,
        source: result.source,
        ok: result.ok,
        message: result.message,
      });
      if (result.ok) {
        playSuccessChime();
        if (classified.confidence < LOW_CONFIDENCE_THRESHOLD || result.source === 'ai') {
          speak(result.message);
        }
      } else {
        playErrorBuzz();
        speak(result.message || "Didn't catch that.");
      }
    } finally {
      lockRef.current = false;
      setIsProcessing(false);
    }
  }, []);

  return { execute, isProcessing, lastFeedback };
}

interface DispatchResult { ok: boolean; message: string; source: 'rule' | 'ai' | 'mixed' }

async function dispatch(c: ClassifiedIntent, h: VoiceCommandHandlers, session: WorkoutSession | null): Promise<DispatchResult> {
  const { intent } = c;
  switch (intent.type) {
    case 'undo_last':
      h.onUndoLast();
      return { ok: true, message: 'Undone', source: 'rule' };

    case 'finish_workout':
      if (!session || session.exercises.length === 0) {
        h.onShowToast('No active workout');
        return { ok: false, message: 'No active workout', source: 'rule' };
      }
      h.onFinish();
      return { ok: true, message: 'Workout saved', source: 'rule' };

    case 'discard_workout':
      h.onDiscard();
      return { ok: true, message: 'Workout discarded', source: 'rule' };

    case 'timer_control':
      h.timer[intent.action]();
      h.onShowToast(`Timer ${intent.action}`);
      return { ok: true, message: `Timer ${intent.action}`, source: 'rule' };

    case 'navigate':
      h.onNavigate(intent.view);
      h.onShowToast(`→ ${intent.view}`);
      return { ok: true, message: intent.view, source: 'rule' };

    case 'add_note': {
      const existing = session?.notes ?? '';
      h.onUpdateSession({ notes: existing ? `${existing}\n${intent.text}` : intent.text });
      h.onShowToast('Note added');
      return { ok: true, message: 'Note added', source: 'rule' };
    }

    case 'add_exercise': {
      const wanted = intent.name.toLowerCase().trim();
      const match = EXERCISES.find(e => e.name.toLowerCase() === wanted)
                 || EXERCISES.find(e => e.name.toLowerCase().includes(wanted))
                 || EXERCISES.find(e => wanted.includes(e.name.toLowerCase()));
      if (match) {
        h.onAddExercise(match.key, match.name);
        return { ok: true, message: `Added ${match.name}`, source: 'rule' };
      }
      const key = wanted.replace(/\s+/g, '-');
      const titled = intent.name.split(' ').map(p => (p[0] ?? '').toUpperCase() + p.slice(1).toLowerCase()).join(' ');
      h.onAddExercise(key, titled);
      return { ok: true, message: `Added ${titled}`, source: 'rule' };
    }

    case 'delete_set': {
      const lastEx = lastExerciseWithSets(session);
      if (!lastEx) {
        h.onShowToast('No sets to delete');
        return { ok: false, message: 'No sets to delete', source: 'rule' };
      }
      const idx = intent.setIndex !== undefined ? intent.setIndex - 1 : lastEx.sets.length - 1;
      const target = lastEx.sets[idx];
      if (!target) {
        h.onShowToast(`Set ${idx + 1} not found`);
        return { ok: false, message: `Set ${idx + 1} not found`, source: 'rule' };
      }
      h.onDeleteSet(lastEx.id, target.id);
      h.onShowToast(`Deleted set ${idx + 1}`);
      return { ok: true, message: `Deleted set ${idx + 1}`, source: 'rule' };
    }

    case 'delete_exercise': {
      if (!session) {
        h.onShowToast('No active workout');
        return { ok: false, message: 'No active workout', source: 'rule' };
      }
      const wanted = intent.name.toLowerCase().trim();
      const target = session.exercises.find(e => e.name.toLowerCase() === wanted)
                  || session.exercises.find(e => e.name.toLowerCase().includes(wanted))
                  || session.exercises.find(e => wanted.includes(e.name.toLowerCase()));
      if (!target) {
        h.onShowToast(`Couldn't find "${intent.name}"`);
        return { ok: false, message: `Couldn't find ${intent.name}`, source: 'rule' };
      }
      h.onDeleteExercise(target.id);
      h.onShowToast(`Removed ${target.name}`);
      return { ok: true, message: `Removed ${target.name}`, source: 'rule' };
    }

    case 'edit_set': {
      const lastEx = lastExerciseWithSets(session);
      if (!lastEx) {
        h.onShowToast('No active sets');
        return { ok: false, message: 'No sets to edit', source: 'rule' };
      }
      const idx = (intent.setIndex ?? lastEx.sets.length) - 1;
      const target = lastEx.sets[idx];
      if (!target) {
        h.onShowToast(`Set ${idx + 1} not found`);
        return { ok: false, message: `Set ${idx + 1} not found`, source: 'rule' };
      }
      h.onUpdateSet(lastEx.id, target.id, intent.updates);
      const msg = intent.updates.weight !== undefined
        ? `Set ${idx + 1} → ${intent.updates.weight}`
        : `Set ${idx + 1} → ${intent.updates.reps} reps`;
      h.onShowToast(msg);
      return { ok: true, message: msg, source: 'rule' };
    }

    case 'replace_value': {
      const lastEx = lastExerciseWithSets(session);
      if (!lastEx) {
        h.onShowToast('No set to correct');
        return { ok: false, message: 'No set to correct', source: 'rule' };
      }
      const lastSet = lastEx.sets[lastEx.sets.length - 1];
      const updates: Partial<WorkoutSet> = intent.field === 'weight' ? { weight: intent.value } : { reps: intent.value };
      h.onUpdateSet(lastEx.id, lastSet.id, updates);
      h.onShowToast(`Corrected ${intent.field} → ${intent.value}`);
      return { ok: true, message: `Corrected ${intent.field}`, source: 'rule' };
    }

    case 'log_set':
    case 'unknown':
    default:
      return await dispatchLogSet(c, h, session);
  }
}

async function dispatchLogSet(c: ClassifiedIntent, h: VoiceCommandHandlers, session: WorkoutSession | null): Promise<DispatchResult> {
  const activeEx = lastExerciseWithSets(session) ?? session?.exercises[session.exercises.length - 1] ?? null;
  const lastSet = activeEx?.sets[activeEx.sets.length - 1] ?? null;
  const ctx = {
    activeExerciseName: activeEx?.name,
    lastWeight: lastSet?.weight ?? null,
    lastReps: lastSet?.reps ?? undefined,
  };
  const { result, source } = await parseWorkoutInputSmart(c.normalized, ctx);
  const populated = result.exercises.filter(e => e.sets.length > 0);

  if (populated.length === 0) {
    const emptyEx = result.exercises[0];
    if (emptyEx?.name) {
      const match = EXERCISES.find(e => e.name.toLowerCase() === emptyEx.name.toLowerCase());
      if (match) {
        h.onAddExercise(match.key, match.name);
        return { ok: true, message: `Added ${match.name}`, source: source === 'ai' ? 'ai' : 'rule' };
      }
    }
    h.onShowToast(`Didn't catch that: "${c.raw}"`);
    return { ok: false, message: `Didn't catch "${c.raw}"`, source: source === 'ai' ? 'ai' : 'rule' };
  }

  const messages: string[] = [];
  for (const parsedEx of populated) {
    const nameLower = parsedEx.name.toLowerCase();
    const existing = session?.exercises.find(e => e.name.toLowerCase() === nameLower);
    if (existing) {
      for (const set of parsedEx.sets) {
        h.onAddSet(existing.id, {
          weight: set.weight,
          reps: set.reps,
          rpe: set.rpe ?? null,
          type: set.type ?? 'normal',
          note: set.note,
        });
      }
    } else {
      const match = EXERCISES.find(e => e.name.toLowerCase() === nameLower);
      const exKey = match?.key ?? nameLower.replace(/\s+/g, '-');
      h.onAddExerciseWithSets(exKey, parsedEx.name, parsedEx.sets.map(s => ({
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe ?? null,
        type: s.type ?? 'normal',
        note: s.note,
      })));
    }
    h.timer.start();
    const exKeyForFmt = existing?.exerciseKey ?? EXERCISES.find(e => e.name.toLowerCase() === nameLower)?.key ?? nameLower.replace(/\s+/g, '-');
    messages.push(`${parsedEx.name}: ${parsedEx.sets.map(s => `${formatWeightCell(s.weight, exKeyForFmt)}×${s.reps ?? '?'}`).join(', ')}`);
  }

  const message = messages.join('; ');
  h.onShowToast(message);
  return { ok: true, message, source: source === 'ai' ? 'ai' : 'rule' };
}

function lastExerciseWithSets(session: WorkoutSession | null) {
  if (!session) return null;
  for (let i = session.exercises.length - 1; i >= 0; i--) {
    if (session.exercises[i].sets.length > 0) return session.exercises[i];
  }
  return session.exercises[session.exercises.length - 1] ?? null;
}
