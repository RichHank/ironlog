# Architecture Decisions

## State Management
- Zustand-like pattern via React useState + localStorage/IndexedDB write-through
- Session stored at `il-current`, history at `il-history`
- IDB mirror for iOS eviction resilience

## Data Flow
- App.tsx owns all state and passes callbacks down
- WorkoutView renders exercises → sets table → inline edit → AddSetForm
- Voice commands via useVoiceCommands hook

## Persistence
- Dual-write: localStorage (sync reads) + IndexedDB (iOS durable)
- `hydrateFromIDB()` on cold start recovers from IDB if localStorage evicted

## Key Files
- `src/App.tsx` — state owner, all mutation callbacks
- `src/storage.ts` — persistence layer
- `src/components/WorkoutView.tsx` — main workout UI, inline set editing
- `src/components/AddSetForm.tsx` — new set form
- `src/hooks/useVoiceCommands.ts` — voice orchestrator
- `src/parser.ts` — voice input parsing
- `src/debugLogger.ts` — debug logging (added 2026-05-11)
- `src/components/DebugConsole.tsx` — in-app debug overlay (added 2026-05-11)
