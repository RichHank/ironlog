# Bug Backlog

Found by Bug Hunter agent, 2026-05-11. Updated 2026-05-11 (re-scan after first round of fixes).

**Summary: 4 fixed, 2 false reports, 14 remaining original bugs, 3 new bugs found. 17 actionable bugs total.**

---

## ✅ Fixed (verified in code)

- **BUG-001** — Session notes cross-contamination: FIXED (`useEffect` sync on `session?.id` at WorkoutView.tsx:43-45). Touch-target: FIXED (Del button has `min-h-touch min-w-[44px]` at WorkoutView.tsx:277). mb-4 spacing: FIXED (WorkoutView.tsx:208).
- **BUG-003** — JSON import drops PRs/measurements: FIXED (SettingsView.tsx:155-156 merges `data.prs` and `data.measurements` with ID-based dedup).
- **BUG-004** — Side effects in React state updaters: FIXED (`deleteExercise` uses `shouldClear` flag outside updater at App.tsx:248-260; `deleteSet` no longer calls `clearSession()` inside updater).

## ❌ False Reports (bugs marked in previous pass that don't exist in current code)

- **BUG-012** — BootMascot interval/frame leak: FALSE. Cleanup correctly calls `clearInterval(tick)` and `clearTimeout(end)` at BootMascot.tsx:23. `frame` is React state — no leak.
- **BUG-014** — formatWeightCell shows em dash for bodyweight: FALSE. `formatWeightCell()` at utils.ts:31 returns `'BW'` for bodyweight exercises via `isBodyweightExercise()` check.

---

## Critical (Data Loss)

(All critical bugs from first pass are now fixed.)

## High

### BUG-005: Parser uses RegExp lookbehind incompatible with older Safari
- **Severity**: High
- **File**: `src/parser.ts:154`
- **Issue**: `split(/(?<=\d)\s+and\s+/i)` uses lookbehind assertion, unsupported in Safari < 16.4 (all iOS 15 devices). Breaks compound voice commands containing "and" — parses incorrectly or throws on older devices.
- **Repro**: On iOS 15 Safari, say "bench 135 for 5 and squat 225 for 5". The `and` split fails silently, producing one garbled segment instead of two.
- **Fix**: Replace `/(?<=\d)\s+and\s+/i` with `/(\d)\s+and\s+/i` capture-group based split, or use a manual loop.

### BUG-006: ensureSession is dead code + premature completedAt
- **Severity**: High (dead code) / Medium (completedAt)
- **File**: `src/App.tsx:128-136` (ensureSession), `src/App.tsx:131,141,150,348` (completedAt)
- **Issue**: `ensureSession` is defined but never called anywhere in the codebase. It also sets `completedAt: Date.now()` at session *creation* time, which survives as the completion timestamp if the session is abandoned (e.g. the user force-quits). This misleadingly implies the session finished instantly. The same `completedAt: Date.now()` pattern exists in `addExercise` (line 141), `addExerciseWithSets` (line 150), and `startFromRoutine` (line 348).
- **Fix**: Remove `ensureSession` dead code. Set `completedAt` only at `finishWorkout` time (which already overrides it at line 267).

### BUG-019: No error boundary in React tree
- **Severity**: High
- **File**: `src/main.tsx:9-12`
- **Issue**: No React error boundary wrapping `<App />`. Any uncaught render-time error crashes the entire PWA to a white screen with no recovery path. In a PWA, the user can't even refresh — they must force-quit and reopen.
- **Fix**: Add an `<ErrorBoundary>` component wrapping `<App />` that catches render errors and shows a "Something went wrong — tap to reload" fallback.

---

## Medium

### BUG-002: addWorkout PR race condition (theoretical)
- **Severity**: Medium (low practical risk — JS is single-threaded)
- **File**: `src/App.tsx:270-275`, `src/storage.ts:68-73`
- **Issue**: `updatePRsAfterAdd(completed)` at line 275 runs after `clearSession()`. `updatePRsAfterAdd` calls `loadPRs()` from localStorage. If any code path writes to the PRs key between `clearSession` and `updatePRsAfterAdd`, the PR read would capture that intermediate state. In practice, JS is single-threaded and React batches synchronously in event handlers, so this doesn't actually race today. Still a code smell — the order should be: save history → update PRs → clear session.
- **Fix**: Reorder: call `updatePRsAfterAdd` before `clearSession()`, or pass the `updated` history to `updatePRsAfterAdd` instead of re-reading from localStorage.

### BUG-007: deleteHistorySet notification miscount uses stale closure
- **Severity**: Medium
- **File**: `src/App.tsx:396`
- **Issue**: `if (updated.length === history.length - 1)` — the `history` variable is captured from the `useCallback` closure at the time the callback was last created. If `history` changes between callback creation and invocation (e.g., from a Strava push update), this comparison is wrong. Could show "Workout deleted" toast when only a set was deleted, or vice versa.
- **Fix**: Compare `updated.length` to `updated.length + 1` (trivially false for single-delete case), or check whether the session was removed vs modified by tracking the specific session's presence in both arrays.

### BUG-008: Strava push fire-and-forget — lost if tab closes
- **Severity**: Medium
- **File**: `src/App.tsx:280-292`
- **Issue**: After `finishWorkout()`, the Strava push runs as `loadTokens().then(t => { if (!t) return; pushWorkout(completed).then(...) })`. If the user closes the tab or the PWA is suspended by iOS before this promise chain resolves, the push is silently lost with no retry or queue.
- **Fix**: Queue failed pushes in localStorage/IDB and retry on next app launch, or use `navigator.sendBeacon()` for at-least-once delivery.

### BUG-011: Voice delete_set intent has narrow matching, falls through to delete_exercise
- **Severity**: Medium
- **File**: `src/voiceCommands.ts:123-143`
- **Issue**: `delete_set` matches only `delete/remove last set` and `delete/remove set N` (N must be digit). "remove the 3rd set", "delete second set", "remove set three" all fail to match `delete_set`. They fall through to `delete_exercise` (line 134) which matches `delete/remove/drop <anything>`. The exclusion guards block "set", "last", "that", "it" — but "3rd set" passes through, so the app tries to delete an exercise named "3rd set" instead of deleting the 3rd set.
- **Repro**: During a workout with 3+ sets, say "remove the 3rd set". The app tries to delete an exercise called "3rd set".
- **Fix**: Add ordinal matching to `delete_set` (e.g., /delete|remove the (first|second|third|3rd|1st|2nd|...) set/i).

### BUG-018: Parser compound AMRAP/drop-set detection order issue
- **Severity**: Medium
- **File**: `src/parser.ts:268-298` (drop sets, AMRAP), `src/parser.ts:323-451` (multi-set patterns)
- **Issue**: The parser checks drop sets before AMRAP, and both before the standard multi-set patterns. Certain inputs like "AMRAP 225 then drop set to 185" may match drop-set patterns first (if "drop" appears earlier), or produce incorrect parse results because the conjunction split happens before individual segment parsing. The order-sensitive matching means adding a new pattern can silently break existing ones.
- **Repro**: Voice command "bench AMRAP 225 then drop set 185 to 135" — behavior depends on how conjunctions split and which matcher wins.
- **Fix**: Restructure parser to tokenize first, then run all matchers, then resolve conflicts by specificity rather than declaration order.

### NEW: BUG-020: HistoryDetail delete has no confirmation dialog
- **Severity**: Medium
- **File**: `src/components/HistoryDetail.tsx:134`
- **Issue**: The Delete button permanently removes a completed workout with one tap and no confirmation. No undo toast either. Compare to `SettingsView.tsx:38-43` which uses `window.confirm` before clearing all data. One accidental tap deletes an entire workout history record.
- **Repro**: Open any completed workout → tap "Delete" → workout is gone, no undo.
- **Fix**: Add `window.confirm` or a toast with "Undo" button (matching the set-delete pattern in `deleteSet`).

---

## Low

### BUG-009: writeJSON silences all IDB write failures
- **Severity**: Low
- **File**: `src/storage.ts:35-39`
- **Issue**: `void idbSet(key, serialised)` ignores the promise. If the IDB write fails (quota exceeded, transaction error), there is zero feedback. iOS 7-day localStorage eviction means the IDB copy is the only durable one — if it's silently broken, data is lost after eviction with no warning.
- **Fix**: At minimum, catch and log. Consider surfacing a warning if IDB writes consistently fail.

### BUG-010: visibilitySync fires duplicate IDB writes for all keys
- **Severity**: Low
- **File**: `src/idb-storage.ts:84-98`
- **Issue**: On tab hide, `visibilitySync` iterates ALL localStorage keys and writes each to IDB via `Promise.allSettled`. But `writeJSON` already does `void idbSet(key, serialised)` on every write. So every localStorage key gets written to IDB twice — once from the write-through, once from the visibility flush. This is a thundering herd of IDB transactions on every tab hide.
- **Fix**: Track a "dirty keys" set — only flush keys that changed since last visibility change, or remove the visibility flush entirely (since every writer already does write-through).

### BUG-013: Parser bare-number-pairs heuristic fragile for light weights
- **Severity**: Low
- **File**: `src/parser.ts:430-432`
- **Issue**: The heuristic at line 430 (`if (nums[i] >= 30 && nums[i+1] <= 50)`) assumes weights are ≥ 30. Input "20 10" (20lb for 10 reps) hits the `else` branch at 432, which guesses `{weight: 20, reps: 10}` — correct by luck. But "20 15" also guesses `{weight: 20, reps: 15}` — still OK. The real issue is the ambiguous case where the user reverses order: "10 135" would parse as `{weight: 10, reps: 135}` which is wrong. The heuristic can't distinguish weight-first from reps-first for these edge cases.
- **Fix**: Use exercise context (last known weight) to disambiguate. If lastWeight was 135, "10" alone means 10 reps at 135.

### BUG-015: AnalyticsView reads PRs from localStorage with stale dependency
- **Severity**: Low
- **File**: `src/components/AnalyticsView.tsx:13`
- **Issue**: `useMemo(() => loadPRs(), [sessions])` — the dependency array tracks `sessions`, but PRs are updated independently (by `updatePRsAfterAdd`, `recalcPRs`, or JSON import). If the user recalculates PRs via the "Recalculate PRs" button at line 182, `sessions` hasn't changed, so the PR display doesn't update.
- **Fix**: Add a `prVersion` counter state that increments after any PR mutation, and use it as a dependency.

### BUG-016: shareWorkoutAsFit downloads file on cancelled share (some platforms)
- **Severity**: Low
- **File**: `src/share.ts:110-117`
- **Issue**: The `.catch()` handler checks for `AbortError` name and returns "cancelled". Some browsers throw `DOMException` with a different name (e.g., `NotAllowedError`) on share cancel, or the share sheet dismisses without rejecting. In these cases, the code falls through to `triggerDownload()`, confusing users who intentionally cancelled the share.
- **Repro**: On some Android browsers, tap Share → dismiss the share sheet → a .FIT file downloads anyway.
- **Fix**: Broaden the error check to `err instanceof DOMException && (err.name === 'AbortError' || err.name === 'NotAllowedError')`. Also verify the watchdog timeout in HistoryDetail.tsx:46 doesn't prematurely trigger downloads.

### BUG-017: debugLogger stack trace captured at log-time, not error-time
- **Severity**: Low
- **File**: `src/debugLogger.ts:99`
- **Issue**: `new Error().stack` at line 99 captures the stack at the `push()` call site (inside the intercept wrapper), not at the original `console.error()` call site. The top frames will always point to the interceptor, not the actual buggy code. The `.split('\n').slice(2)` drops the interceptor frames, but for deep call stacks, it may also drop the actual error origin.
- **Fix**: For intercepted console calls, pass the stack from the original call site. Use `Error.captureStackTrace` or capture the stack in the wrapper before calling push.

### NEW: BUG-021: WorkoutView "Remove exercise" button has tiny tap target
- **Severity**: Low
- **File**: `src/components/WorkoutView.tsx:298-303`
- **Issue**: The "Remove exercise" button is a plain `<button>` with `text-xs` and no `min-h-touch` class. Unlike the "Del" set button (fixed in BUG-001 with `min-h-touch min-w-[44px]`), this button has the same original accessibility problem. Easy to miss-tap or not register on mobile.
- **Fix**: Add `min-h-touch` class to the Remove exercise button.

### NEW: BUG-022: HistoryDetail "Del" set button has small touch target
- **Severity**: Low
- **File**: `src/components/HistoryDetail.tsx:250`
- **Issue**: Same touch-target issue as original BUG-001 but in the HistoryDetail view. The "Del" button for individual sets in a historical workout has `text-xs` without `min-h-touch` or `min-w-[44px]`. The WorkoutView "Del" button was fixed, but this one was missed.
- **Fix**: Add `min-h-touch min-w-[44px]` classes to the HistoryDetail Del button.

---

## Notes for next pass

- **BUG-002** and **BUG-009** are more code hygiene than active data-loss risks. De-prioritize unless evidence of actual data loss emerges.
- **BUG-005** is the highest-impact remaining bug for real users (Safari < 16.4 = all iOS 15 devices, still ~5-10% of iOS users as of 2026).
- **BUG-019** (no error boundary) becomes more important as more features are added — one bad render in a leaf component shouldn't white-screen the entire PWA.
- **BUG-011** (voice delete ordinal) is the most user-visible papercut — users will naturally say "remove the 3rd set" and get confused when it doesn't work.
