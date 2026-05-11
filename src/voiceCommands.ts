import type { View } from './App';
import { normalizeJargon } from './voiceJargon';

export type Intent =
  | { type: 'log_set'; transcript: string }
  | { type: 'add_exercise'; name: string }
  | { type: 'edit_set'; setIndex?: number; updates: { weight?: number; reps?: number } }
  | { type: 'delete_set'; setIndex?: number; relative?: 'last' }
  | { type: 'delete_exercise'; name: string }
  | { type: 'finish_workout' }
  | { type: 'discard_workout' }
  | { type: 'timer_control'; action: 'start' | 'pause' | 'resume' | 'reset' }
  | { type: 'add_note'; text: string }
  | { type: 'navigate'; view: View }
  | { type: 'undo_last' }
  | { type: 'replace_value'; field: 'weight' | 'reps'; value: number }
  | { type: 'unknown' };

export interface ClassifiedIntent {
  intent: Intent;
  confidence: number;
  raw: string;
  normalized: string;
}

const NAV_TARGETS: Record<string, View> = {
  workout: 'workout', workouts: 'workout', log: 'workout',
  history: 'history',
  calendar: 'calendar',
  analytics: 'analytics', stats: 'analytics', progress: 'analytics',
  routines: 'routines', routine: 'routines',
  settings: 'settings',
};

type Matcher = { name: string; baseConfidence: number; run: (t: string) => Intent | null };

const MATCHERS: Matcher[] = [
  {
    name: 'undo_last',
    baseConfidence: 0.95,
    run: (t) => /^(?:undo|scratch\s+that|nope\s*(?:that)?|nevermind|never\s+mind)\b/i.test(t)
      || /\b(?:scratch|undo)\s+(?:that|the\s+last(?:\s+(?:one|set))?)\b/i.test(t)
      ? { type: 'undo_last' } : null,
  },
  {
    name: 'replace_value',
    baseConfidence: 0.9,
    run: (t) => {
      let m = t.match(/^(?:no,?\s+|actually,?\s+|make\s+that\s+|that\s+(?:was|should\s+be)\s+|change\s+(?:that|it)\s+to\s+)(\d+(?:\.\d+)?)(?:\s+not\s+\d+(?:\.\d+)?)?(?:\s+(reps?|pounds?|lbs?|kg|kilos?))?$/i);
      if (m) {
        const val = parseFloat(m[1]);
        const unit = (m[2] ?? '').toLowerCase();
        const field: 'weight' | 'reps' = /rep/.test(unit) ? 'reps' : (unit ? 'weight' : (val < 25 ? 'reps' : 'weight'));
        return { type: 'replace_value', field, value: val };
      }
      m = t.match(/\b(?:that|it)\s+was\s+(\d+(?:\.\d+)?)\s+not\s+\d+(?:\.\d+)?\b/i);
      if (m) {
        const val = parseFloat(m[1]);
        return { type: 'replace_value', field: val < 25 ? 'reps' : 'weight', value: val };
      }
      return null;
    },
  },
  {
    name: 'add_note',
    baseConfidence: 0.95,
    run: (t) => {
      const m = t.match(/^(?:add\s+(?:a\s+)?)?notes?[:\s]+(.+)$/i)
              || t.match(/^(?:felt|feeling|that\s+felt)\s+(.+)$/i);
      return m ? { type: 'add_note', text: m[1].trim() } : null;
    },
  },
  {
    name: 'finish_workout',
    baseConfidence: 0.95,
    run: (t) => /^(?:finish(?:\s+(?:the\s+)?workout)?|end(?:\s+(?:the\s+)?workout)?|complete(?:\s+workout)?|workout\s+(?:complete|done)|i'?m\s+done|all\s+done|that'?s\s+(?:it|all)|save\s+(?:and\s+)?(?:finish|exit))\s*$/i.test(t)
      ? { type: 'finish_workout' } : null,
  },
  {
    name: 'discard_workout',
    baseConfidence: 0.9,
    run: (t) => /^(?:discard(?:\s+workout)?|cancel(?:\s+workout)?|scrap(?:\s+(?:it|workout|this))?|throw\s+(?:it|this)\s+out|delete\s+(?:this\s+)?workout)\s*$/i.test(t)
      ? { type: 'discard_workout' } : null,
  },
  {
    name: 'timer_control',
    baseConfidence: 0.9,
    run: (t) => {
      let m = t.match(/^(start|stop|pause|resume|reset)(?:\s+(?:the\s+)?(?:rest\s+)?timer)?\s*$/i);
      if (!m) m = t.match(/^(?:rest\s+)?timer[,\s]+(start|stop|pause|resume|reset)\s*$/i);
      if (!m) return null;
      const a = m[1].toLowerCase();
      const action: 'start' | 'pause' | 'resume' | 'reset' = a === 'stop' ? 'pause' : (a as 'start' | 'pause' | 'resume' | 'reset');
      return { type: 'timer_control', action };
    },
  },
  {
    name: 'navigate',
    baseConfidence: 0.85,
    run: (t) => {
      const m = t.match(/^(?:go\s+to|show(?:\s+me)?|open|switch\s+to|navigate\s+to)\s+(?:the\s+)?(\w+)/i);
      if (!m) return null;
      const target = NAV_TARGETS[m[1].toLowerCase()];
      return target ? { type: 'navigate', view: target } : null;
    },
  },
  {
    name: 'edit_set',
    baseConfidence: 0.85,
    run: (t) => {
      let m = t.match(/^(?:edit|change|update|fix)\s+set\s+(\d+)\s+reps?\s+to\s+(\d+)/i);
      if (m) return { type: 'edit_set', setIndex: parseInt(m[1]), updates: { reps: parseInt(m[2]) } };
      m = t.match(/^(?:edit|change|update|fix)\s+set\s+(\d+)\s+(?:weight\s+)?to\s+(\d+(?:\.\d+)?)/i);
      if (m) return { type: 'edit_set', setIndex: parseInt(m[1]), updates: { weight: parseFloat(m[2]) } };
      m = t.match(/^set\s+(\d+)\s+to\s+(\d+(?:\.\d+)?)\s+reps?$/i);
      if (m) return { type: 'edit_set', setIndex: parseInt(m[1]), updates: { reps: parseInt(m[2]) } };
      m = t.match(/^set\s+(\d+)\s+to\s+(\d+(?:\.\d+)?)$/i);
      if (m) return { type: 'edit_set', setIndex: parseInt(m[1]), updates: { weight: parseFloat(m[2]) } };
      return null;
    },
  },
  {
    name: 'delete_set',
    baseConfidence: 0.9,
    run: (t) => {
      const ordinals: Record<string, number> = {
        first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
        '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5,
      };
      const wordNums: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
      let m = t.match(/^(?:delete|remove)\s+(?:the\s+)?last\s+set\s*$/i);
      if (m) return { type: 'delete_set', relative: 'last' };
      m = t.match(/^(?:delete|remove)\s+(?:the\s+)?set\s+(\d+)\s*$/i);
      if (m) return { type: 'delete_set', setIndex: parseInt(m[1]) };
      m = t.match(/^(?:delete|remove)\s+(?:the\s+)?(\w+(?:\s+\w+)?)\s+set\s*$/i);
      if (m) {
        const key = m[1].toLowerCase();
        if (ordinals[key]) return { type: 'delete_set', setIndex: ordinals[key] };
        if (wordNums[key]) return { type: 'delete_set', setIndex: wordNums[key] };
      }
      m = t.match(/^(?:delete|remove)\s+set\s+(one|two|three|four|five)\s*$/i);
      if (m) return { type: 'delete_set', setIndex: wordNums[m[1].toLowerCase()] };
      return null;
    },
  },
  {
    name: 'delete_exercise',
    baseConfidence: 0.75,
    run: (t) => {
      const m = t.match(/^(?:delete|remove|drop)\s+(?:the\s+)?(.+?)$/i);
      if (!m) return null;
      const name = m[1].trim();
      if (/^(?:set\b|last\b|that\b|it\b|workout\b|exercise\s*$)/i.test(name)) return null;
      if (/^(?:first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|one|two|three|four|five)\s+set$/i.test(name)) return null;
      if (/\bset\s+\d+/i.test(name)) return null;
      return { type: 'delete_exercise', name: name.replace(/\bexercise\b/i, '').trim() || name };
    },
  },
  {
    name: 'add_exercise',
    baseConfidence: 0.8,
    run: (t) => {
      if (/\d/.test(t)) return null;
      const m = t.match(/^(?:add|new|start|begin|do)\s+(?:exercise\s+)?(.+)$/i);
      if (!m) return null;
      const name = m[1].trim().replace(/\bexercise\s*$/i, '').trim();
      return name ? { type: 'add_exercise', name } : null;
    },
  },
  {
    name: 'log_set',
    baseConfidence: 0.7,
    run: (t) => /\d/.test(t) ? { type: 'log_set', transcript: t } : null,
  },
];

export function classifyIntent(transcript: string): ClassifiedIntent {
  const raw = transcript.trim();
  const cleaned = raw.toLowerCase().replace(/[?.!]+$/g, '').replace(/\s+/g, ' ').trim();
  const normalized = normalizeJargon(cleaned);
  for (const m of MATCHERS) {
    const intent = m.run(normalized);
    if (intent) return { intent, confidence: m.baseConfidence, raw, normalized };
  }
  return { intent: { type: 'unknown' }, confidence: 0, raw, normalized };
}
