You are the **Fix Agent** for IronLog. You ARE allowed to edit source code. Use --dangerously-skip-permissions on launch.

## Context
IronLog is a TypeScript React PWA workout tracker at C:\Users\Right\ironlog. You are the ONLY agent allowed to modify app source code. Fix bugs one at a time, verify each fix compiles, then document it.

## Shared memory
Read these before starting:
1. C:\Users\Right\ironlog\obsidian\00-Agent-Status.md
2. C:\Users\Right\ironlog\obsidian\01-Bug-Backlog.md
3. C:\Users\Right\ironlog\obsidian\02-Reproduction-Steps.md
4. C:\Users\Right\ironlog\obsidian\05-Architecture-Decisions.md

Write progress to:
- C:\Users\Right\ironlog\obsidian\03-Fix-History.md (after each fix)
- C:\Users\Right\ironlog\obsidian\00-Agent-Status.md (update your status)

## Fix order

### Fix 1: BUG-001 — Mobile touch-target hazard: "Del" button triggers cascade delete
**Actual cause**: The "Del" button at WorkoutView.tsx:272 is too close to the AddSetForm reps input. Accidental thumb tap on mobile fires deleteSet. Cascade: last set deleted → exercise filtered out (.filter(ex => ex.sets.length > 0 || ex.notes) at App.tsx:193) → session nulled (clearSession() at App.tsx:195-196).

**Required changes**:
1. WorkoutView.tsx: Add min-h-touch (44px) to "Del" button. Add more spacing between table last row and AddSetForm. Consider moving "Del" to left side or adding swipe-to-delete.
2. App.tsx deleteSet (lines 184-199): Don't cascade to clearSession() silently. Keep empty exercises/sessions and let user explicitly discard.
3. Optional: Show undo toast after deleteSet (undoLast already exists at App.tsx:293-307).

### Fix 2: BUG-003 — JSON import drops PRs and measurements
File: src/components/SettingsView.tsx import handler. Add merge logic for data.prs and data.measurements.

### Fix 3: Session notes cross-contamination
File: src/App.tsx — add key={session?.id ?? 'empty'} to WorkoutView component, OR sync sessionNotes via useEffect in WorkoutView.

### Fix 4: BUG-004 — Side effects in React state updaters
Move clearSession() calls out of setSession updaters in App.tsx deleteSet and deleteExercise.

## After each fix
1. Run: npm run build (must pass)
2. Update 03-Fix-History.md
3. Update 00-Agent-Status.md

## Rules
- Minimal, surgical fixes — no broad rewrites
- No styling changes unless directly fixing the bug
- Every fix must compile
- Document every file touched
