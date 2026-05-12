# Fix History

| Bug ID | Description | Files Changed | Outcome | Tested By |
|--------|-------------|---------------|---------|-----------|
| BUG-001 | Mobile touch-target hazard: "Del" button overlaps reps input | `src/App.tsx`, `src/components/WorkoutView.tsx` | Fixed. See details below for sub-fixes. | (pending) |
| BUG-001 (session notes) | Session notes cross-contaminate between workouts | `src/components/WorkoutView.tsx` | Fixed. Added useEffect to sync sessionNotes on `session?.id` change. | (pending) |
| BUG-003 | JSON import drops PRs and measurements | `src/storage.ts`, `src/components/SettingsView.tsx` | Fixed. Added merge logic for `data.prs` and `data.measurements` in import handler. Exported `savePRs` from storage. | (pending) |
| BUG-004 | Side effects in React state updaters | `src/App.tsx` | Fixed. Moved `clearSession()` out of `setSession` updater in `deleteExercise`. `deleteSet` no longer calls `clearSession()` at all (cascade removed). | (pending) |
| BUG-002 | addWorkout PR race condition | `src/App.tsx` | Fixed. Reordered `updatePRsAfterAdd(completed)` before `clearSession()` in `finishWorkout` so PRs update while session context is still intact. | (pending) |
| BUG-005 | Parser lookbehind incompatible with older Safari | `src/parser.ts` | Fixed. Replaced `split(/(?<=\d)\s+and\s+/i)` with capture-group replacement `replace(/(\d)\s+and\s+/gi, '$1\\0').split('\\0')` for Safari < 16.4 compatibility. | (pending) |
| BUG-006 | ensureSession dead code + premature completedAt | `src/App.tsx` | Fixed. Removed dead `ensureSession` function. Changed `completedAt: Date.now()` to `completedAt: 0` in session creation sites — `finishWorkout` already sets the real time. | (pending) |
| BUG-019 | No error boundary in React tree | `src/main.tsx` | Fixed. Added class-based `ErrorBoundary` wrapping `<App />`. Catches render errors, logs them, and shows a styled fallback with "Reload" button instead of white screen. | (pending) |
| BUG-007 | deleteHistorySet notification miscount (stale closure) | `src/App.tsx` | Fixed. Replaced `updated.length === history.length - 1` with `!updated.some(s => s.id === sessionId)` to check if the session was removed without relying on potentially stale `history` closure. | (pending) |
| BUG-020 | HistoryDetail delete has no confirmation | `src/components/HistoryDetail.tsx` | Fixed. Added `window.confirm('Delete this workout?')` guard before calling `onDelete(session.id)`. | (pending) |
| BUG-021 | WorkoutView "Remove exercise" tiny tap target | `src/components/WorkoutView.tsx` | Fixed. Added `min-h-touch` class to "Remove exercise" button. | (pending) |
| BUG-022 | HistoryDetail "Del" set button small touch target | `src/components/HistoryDetail.tsx` | Fixed. Added `min-h-touch min-w-[44px]` classes to "Del" set button, matching BUG-001 fix. | (pending) |
| BUG-011 | Voice delete_set narrow matching, falls through to delete_exercise | `src/voiceCommands.ts` | Fixed. Added ordinal matching (first/second/third/1st/2nd/3rd etc.) and word-number matching (one/two/three) to `delete_set`. Added exclusion guard in `delete_exercise` for ordinal+set patterns. | (pending) |
| BUG-009 | writeJSON silences IDB write failures | `src/storage.ts` | Fixed. Added `.catch(err => console.error(...))` to both `void idbSet()` and `void idbRemove()` calls so IDB write failures are at least logged instead of silently lost. | (pending) |
| BUG-015 | AnalyticsView PRs stale dependency | `src/components/AnalyticsView.tsx` | Fixed. Added `prVersion` counter state, incremented after `recalcPRs()`, and added it to `useMemo(() => loadPRs(), [sessions, prVersion])` dependency array. | (pending) |
| BUG-016 | shareWorkoutAsFit downloads on cancelled share | `src/share.ts` | Fixed. Broadened `AbortError` check to `DOMException` with both `AbortError` and `NotAllowedError` names, matching broader browser behavior on share cancel. | (pending) |
| BUG-017 | debugLogger stack trace captured at wrong call site | `src/debugLogger.ts` | Fixed. Capture stack in console intercept wrapper (original call site) and pass to `push()` as parameter, instead of generating a new stack inside `push()` after the extra frame. | (pending) |
| BUG-010 | visibilitySync fires duplicate IDB writes | `src/idb-storage.ts` | Fixed. Removed redundant visibility-sync IDB flush — all writers in storage.ts already use write-through to IDB, confirmed by code audit. No-op stub kept to avoid breaking call site. | (pending) |

## Implementation Details

### BUG-001 — Mobile touch-target hazard (Fix 1)
**Changes in `src/App.tsx`**:
- **deleteSet** (lines 189-232): Removed the cascading behavior that filtered out empty exercises and nulled the session. Now, deleting a set simply removes the set and keeps the exercise (even if empty). The user must explicitly use "Discard" or "Remove exercise" to clean up. Added toast with "Undo" button that restores the deleted set via `lastDeletedSet` ref.
- **Toast system** (lines 30-32, 92-98, 472-483): Converted toast state from `string | null` to `{ message, action? }` object. Added `toastTimer` ref to prevent stale timeout race conditions. Action toasts last 4s (vs 1.8s for plain toasts).

**Changes in `src/components/WorkoutView.tsx`**:
- **"Del" button** (line 277): Added `min-h-touch min-w-[44px]` classes for proper 44x44px touch target, with `px-2 py-1.5` padding and `flex items-center justify-center` for centering.
- **Table-to-form spacing** (line 208): Added `mb-4` to the sets table wrapper to create visual separation between the last table row and the AddSetForm below it.

### BUG-001 (session notes) — Cross-contamination (Fix 3)
**Changes in `src/components/WorkoutView.tsx`**:
- Added `useEffect` (lines 42-45) that resets `sessionNotes` when `session?.id` changes. This prevents notes from a previously viewed session leaking into a new session via stale React state.

### BUG-003 — JSON import drops PRs and measurements (Fix 2)
**Changes in `src/storage.ts`**:
- Exported `savePRs` function (was internal-only).

**Changes in `src/components/SettingsView.tsx`**:
- Import handler (lines 155-156): Added merge logic for `data.prs` (via `savePRs`) and `data.measurements` (via `saveMeasurements`), using the same ID-based dedup pattern already used for history and routines.

### BUG-004 — Side effects in React state updaters (Fix 4)
**Changes in `src/App.tsx`**:
- **deleteSet** (already fixed by BUG-001): No longer calls `clearSession()` at all -- the cascade was removed.
- **deleteExercise** (lines 247-261): Moved `clearSession()` out of the `setSession` updater using a `shouldClear` flag. The updater sets the flag and returns null; `clearSession()` is called after `setSession` returns, ensuring the React updater stays pure.

### BUG-002 — addWorkout PR race condition (Fix 5)
**Changes in `src/App.tsx`**:
- **finishWorkout** (lines 263-276): Reordered `updatePRsAfterAdd(completed)` to run before `clearSession()`. Previously, `clearSession()` fired first, and if a new session were created before PRs updated, the PR calculation could observe inconsistent state. The fix ensures PRs are updated while the completed session context is still clean.

### BUG-005 — Parser lookbehind incompatible with Safari < 16.4 (Fix 6)
**Changes in `src/parser.ts`**:
- **splitOnConjunctions** (line 154): Replaced `split(/(?<=\d)\s+and\s+/i)` (uses lookbehind, unsupported in Safari < 16.4 / iOS 15) with `replace(/(\d)\s+and\s+/gi, '$1\\0').split('\\0')`. The capture group `(\d)` preserves the digit in the result via `$1`, and the null character `\\0` acts as a split delimiter that never appears in natural text. Functionally identical — splits compound voice commands like "bench 135 and squat 225" on " and " only when preceded by a digit.

### BUG-006 — ensureSession dead code + premature completedAt (Fix 7)
**Changes in `src/App.tsx`**:
- Removed `ensureSession` (formerly lines 128-136): Function was defined but never called anywhere in the codebase. Dead code with no callers.
- Changed `completedAt: Date.now()` to `completedAt: 0` in three session-creation sites: `addExercise`, `addExerciseWithSets`, and `startFromRoutine`. Previously, `completedAt` was set to the creation timestamp, which would survive as the completion time if the session was abandoned. Since `finishWorkout` already sets the real `completedAt`, using `0` makes the un-finished state explicit.

### BUG-019 — No error boundary in React tree (Fix 8)
**Changes in `src/main.tsx`**:
- Added class-based `ErrorBoundary` component wrapping `<App />`. Uses `getDerivedStateFromError` to catch render errors and `componentDidCatch` to log them. The fallback UI is styled with the IronLog vapor theme (`bg-vapor-black`, `#ff2aa3` accent) and includes a "Reload" button that calls `window.location.reload()`. Prevents any uncaught render error in a leaf component from white-screening the entire PWA.
