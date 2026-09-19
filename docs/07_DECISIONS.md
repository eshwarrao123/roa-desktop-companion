# Architecture Decisions & Trade-offs

## Project: ROA — Desktop Companion/Pet Application

---

## 1. Decision Log

### 1.1 Electron over Tauri/Rust

**Decision**: Use Electron (locked per requirements)

**Rationale**:
- Team expertise in TypeScript/React
- Rich ecosystem for desktop integration (tray, notifications, auto-updates)
- Mature tooling (electron-vite, electron-builder)
- Web-based rendering enables CSS animations, Canvas, WebGL for pet

**Trade-offs**:
- Higher memory baseline (~50-80MB vs ~10-20MB for Tauri)
- Larger distribution size (~100MB+ vs ~10MB)
- Mitigation: Acceptable for desktop pet app; optimize renderer

**Revisit If**: Memory becomes critical on low-end devices

---

### 1.2 SQLite (better-sqlite3) over IndexedDB / JSON / Redis

**Decision**: SQLite via better-sqlite3 in main process

**Rationale**:
- ACID transactions for reminder scheduling reliability
- Complex queries (watchdog, filtering, joins) trivial
- Synchronous API simplifies scheduler logic
- better-sqlite3: fast, native, no separate server
- Persists across restarts, survives power loss

**Trade-offs**:
- Native module requires rebuild on Electron version change
- Only accessible from main process (requires IPC)
- Mitigation: Pin Electron version, prebuild binaries in CI

**Revisit If**: Need offline sync or multi-device (then add sync layer)

---

### 1.3 Context Isolation + Preload (No Node in Renderer)

**Decision**: `contextIsolation: true`, `nodeIntegration: false`, narrow `contextBridge`

**Rationale**:
- Security: Renderer compromised → no Node.js/FS/OS access
- IPC surface is explicit, typed, auditable
- Required for any app handling user data/credentials

**Trade-offs**:
- More boilerplate (preload, IPC handlers, types)
- Cannot use Node modules directly in React components
- Mitigation: Shared types package, codegen for IPC types

**Revisit If**: Never — this is a security requirement

---

### 1.4 Per-Reminder setTimeout + Watchdog (Not Single Interval)

**Decision**: Each reminder gets own `setTimeout`; 30s watchdog for recovery

**Rationale**:
- `setInterval` drifts, accumulates error
- Per-reminder timeout = exact `next_run_at` from DB
- Watchdog catches: missed triggers, clock changes, sleep/resume
- Survives restart: `next_run_at` is source of truth in SQLite

**Trade-offs**:
- Many timers = many `setTimeout` handles (but typically < 100)
- Watchdog adds complexity
- Mitigation: `MAX_TIMEOUT` fallback for very long intervals (>24 days)

**Revisit If**: Thousands of reminders (then use timer wheel / priority queue)

---

### 1.5 AI Provider Abstraction (Not Direct SDK Calls)

**Decision**: `AIProvider` interface with `GeminiProvider`, `OllamaProvider`, `DisabledProvider`

**Rationale**:
- BYOK: User provides credentials, we never embed keys
- Swappable: Local (Ollama) vs Cloud (Gemini) vs None
- Testable: Mock provider for unit tests
- Extensible: Future providers (OpenAI, Anthropic, local llama.cpp)

**Trade-offs**:
- Abstraction layer adds indirection
- Must normalize different API shapes (Gemini vs Ollama)
- Mitigation: Thin adapter per provider, shared tool registry

**Revisit If**: Need streaming from multiple providers simultaneously

---

### 1.6 Tool Calling via Allowlist + Zod (Not Function Calling SDK)

**Decision**: Custom tool pipeline: Allowlist → Zod Validation → Permission → Execute

**Rationale**:
- Security: AI cannot call arbitrary functions
- Validation: Zod schemas = runtime + compile-time safety
- Permissions: Future per-tool/user scoping
- Provider-agnostic: Works with any model supporting tool calling

**Trade-offs**:
- More code than `model.generateContent({tools: [...]})`
- Must maintain tool definitions in two places (schema + execution)
- Mitigation: Single source of truth in `tool-registry.ts`

**Revisit If**: Native function calling becomes standard across all providers

---

### 1.7 Character Manifest + Asset Files (Not Database Blobs)

**Decision**: Assets on filesystem (`assets/characters/<id>/`), manifest JSON

**Rationale**:
- Git-friendly: Assets versioned, reviewable
- Easy to add: Drop folder, no DB migration
- User-importable: ZIP extract to folder
- Web-compatible: Same assets work in renderer (via protocol)

**Trade-offs**:
- File sync issues if assets modified externally
- No atomic "character update" (manifest + assets)
- Mitigation: Validate on load, cache parsed manifests

**Revisit If**: Need encrypted/licensed character packs

---

### 1.8 Zustand over Redux / Jotai / Context

**Decision**: Zustand for dashboard state

**Rationale**:
- Minimal boilerplate, no providers
- TypeScript-first, hooks-based
- Scoped stores (per domain: reminders, timers, settings)
- Works outside React (can sync with main via IPC)

**Trade-offs**:
- No built-in devtools time-travel (but has middleware)
- Global mutable state (mitigate with Immer middleware)
- Mitigation: Keep stores small, single-responsibility

**Revisit If**: Complex cross-cutting state (then consider Jotai atoms)

---

### 1.9 Tailwind CSS over CSS Modules / Styled Components

**Decision**: Tailwind CSS with design tokens from UI/UX brief

**Rationale**:
- Design tokens in config = single source of truth
- Rapid iteration, no context switching
- Tree-shaken, small production CSS
- Works with React 19, Vite, Electron

**Trade-offs**:
- Learning curve for team unfamiliar
- HTML can become verbose
- Mitigation: `clsx` + component abstractions, `@apply` for patterns

**Revisit If**: Need runtime theming beyond light/dark (then CSS variables)

---

### 1.10 Lazy Dashboard Window (Not Always Open)

**Decision**: Dashboard `BrowserWindow` created on-demand

**Rationale**:
- Pet window must stay lightweight (<50MB)
- Dashboard heavy (React, charts, lists) — only when needed
- Faster app startup, lower idle memory

**Trade-offs**:
- First open has delay (~200-500ms)
- State must survive destroy/create (persist to SQLite/Zustand)
- Mitigation: Preload dashboard in background after pet ready (optional)

**Revisit If**: User expects instant dashboard (then keep warm)

---

### 1.11 Electron safeStorage for Credentials (Not Keytar / Not Plaintext SQLite)

**Decision**: Built-in Electron `safeStorage` API for API keys and OAuth secrets

**Rationale**:
- ROA is Windows-first; `safeStorage` uses Windows DPAPI (Data Protection API) natively
- Zero extra native dependencies (avoids `keytar` native module rebuild issues)
- Asynchronous `safeStorage` APIs are officially recommended by modern Electron
- Credentials survive app updates without external native library maintenance

**Trade-offs**:
- Encrypted data is tied to the current OS user profile (standard for desktop apps)
- Not portable across machines without cloud vault/export
- Mitigation: Provide optional encrypted backup/export in future phases

**Revisit If**: Need cross-device credential sync (then add encrypted sync vault)

---

### 1.12 ISO 8601 Durations for Intervals (Not Cron for Everything)

**Decision**: `schedule_type: 'interval'` uses ISO 8601 duration (`PT30M`, `P1D`)

**Rationale**:
- Human-readable, standard format
- Easy to parse/serialize (`date-fns` / `luxon`)
- Covers most recurring needs (every N minutes/hours/days/weeks)
- Cron reserved for complex schedules (weekdays, specific times)

**Trade-offs**:
- ISO duration doesn't express "weekdays only" or "9am daily"
- Mitigation: Use `cron` type for complex schedules

**Revisit If**: Users struggle with ISO format (add UI builder)

---

### 1.13 Single Pet Window (Not Multiple Pets)

**Decision**: One pet window, one active character

**Rationale**:
- Simpler window management, z-order, position persistence
- Resource constraints: multiple transparent always-on-top windows = heavy
- Core concept: one companion

**Trade-offs**:
- No "party" mode
- Mitigation: Character can have "companion" animations

**Revisit If**: Strong user demand for multiple pets

---

### 1.14 No Built-in AI Model (BYOK Only)

**Decision**: No bundled model, no default API key

**Rationale**:
- Privacy: Zero data leaves device unless user configures
- Cost: No API bills for developers
- Legal: No model licensing, no telemetry
- Flexibility: User chooses provider/model

**Trade-offs**:
- Higher barrier to AI features
- "Works offline" promise kept
- Mitigation: Clear onboarding, Ollama one-click install guide

**Revisit If**: Local model bundling becomes viable (llama.cpp, WebLLM)

---

### 1.15 Windows-First (Not Cross-Platform MVP)

**Decision**: Target Windows 10/11 exclusively for MVP

**Rationale**:
- Transparent frameless windows behave differently on macOS/Linux
- System tray, notifications, startup, power monitor APIs differ
- Focus resources on one platform quality

**Trade-offs**:
- Excludes macOS/Linux users
- Porting effort later
- Mitigation: Abstract OS services (`system.ts`), conditional imports

**Revisit If**: Post-MVP, based on demand

---

### 1.16 Missed Reminder Policy & Snooze Design (Phase 2)

**Decision**: At most one catch-up notification on sleep/resume or app restart for overdue reminders; snooze temporarily shifts `next_run_at` without mutating the underlying recurrence schedule.

**Rationale**:
- Laptop sleep or app shutdown could cover multiple intervals (e.g. 6 hours asleep for a 30m reminder). Spamming multiple toasts ruins UX.
- Recurrence calculation dynamically advances `next_run_at` strictly into the future (`> now`).
- Snooze records a distinct `snoozed` history event and sets `next_run_at = now + minutes` while keeping the original schedule configuration intact.

**Trade-offs**:
- Intermediate missed triggers in the past are not individually notified, but logged in history as overdue recovery.

---

### 1.17 In-Place Character Hot-Switching (Phase 3)

**Decision**: Hot-swap character manifests and sprite assets in the existing pet renderer without destroying or recreating the Electron `BrowserWindow`.

**Rationale**:
- Recreating the Electron window causes visual flicker, loses position/drag states, and introduces unnecessary OS window overhead.
- IPC event `roa:character:changed` notifies the pet renderer, which immediately loads the new character manifest and resets the animation state cleanly.

**Trade-offs**:
- The pet renderer must handle reactive character prop changes smoothly (handled via React `key` or reset effect).

---

### 1.18 Decoupled Character / Mood / Behavior State Model (Phase 3)

**Decision**: Separate `characterId` (identity), `mood` (emotional expression), and `behavior` (movement state) rather than combining them into a single monolithic enum.

**Rationale**:
- Allows orthogonal states: a pet can be `walking` while `happy` or `idle` while `thinking`.
- Clean deterministic behavior loop without combinatorial state explosion.

---

### 1.19 Low-Frequency Autonomous Desktop Walking & Usable Bounds Constraints (Phase 3)

**Decision**: Autonomous pet movement executes at ~20 FPS (50ms intervals) with small 3px steps, strictly bounded by Electron's display `workArea` (excluding taskbar/dock).

**Rationale**:
- Moving the OS `BrowserWindow` at 60 FPS creates high main-process and DWM compositor overhead.
- 50ms intervals provide smooth visual walking without CPU spikes.
- Boundary reversal ensures the pet never walks off-screen or gets trapped behind taskbars.

---

### 1.20 Persisted ends_at as Authoritative Timer State & In-Memory Timeout Execution (Phase 4)

**Decision**: Persist `ends_at` timestamp in SQLite as the authoritative state for running timers. The renderer calculates remaining countdown locally via `ends_at - Date.now()` instead of polling the main process.

**Rationale**:
- Eliminates timer drift across application restarts or system sleep.
- Prevents 60 FPS IPC polling between renderer and main process.
- Main process is solely responsible for scheduling the completion timeout and firing notifications.

---

### 1.21 Unified TimerEngine for Both Countdown and Pomodoro (Phase 4)

**Decision**: Build the Pomodoro focus state machine directly on top of the same `TimerEngine` rather than creating a separate engine.

**Rationale**:
- Adheres to YAGNI and prevents duplicate timer persistence, timeout management, and recovery code.
- Pomodoro phases (Focus, Short Break, Long Break) and cycle counts are represented as first-class fields on the active timer entity.

---

### 1.22 Low-Battery Notification Suppression & Narrow OS Query (Phase 4)

**Decision**: Query Windows battery level using a fixed internal PowerShell CIM query (`Get-CimInstance -ClassName Win32_Battery`) with strict output parsing. Once alerted below the threshold (default 20%), further alerts are suppressed until AC is connected or battery recovers.

**Rationale**:
- Completely prevents notification spam while running on low battery.
- No generic shell execution facility is exposed to renderer or AI tools.
- Gracefully handles desktops without a battery by returning `percent: null`.

---

### 1.23 Privacy-Preserving Idle Detection (Phase 4)

**Decision**: Idle awareness exclusively relies on `powerMonitor.getSystemIdleTime()` without tracking keystrokes, active window titles, or clipboard contents.

**Rationale**:
- Preserves complete user privacy while enabling delightful ambient pet behavior (e.g. napping when user is away).
- User can toggle idle reactions on or off anytime via settings.

---

### 1.24 Click-Through Mode via Electron Mouse Events Forwarding (Phase 4)

**Decision**: Implement pet click-through using `win.setIgnoreMouseEvents(enabled, { forward: true })`.

**Rationale**:
- Provides native Windows mouse event pass-through to desktop applications below transparent areas.
- Simple, reliable toggle without heavy native hook injection.

---

### 1.25 Official @google/genai (v2.3+) SDK & Gemini Model Selection (Phase 5)

**Decision**: Use the official `@google/genai` (v2.3+) SDK with `gemini-3.8-flash` as default model, supporting `gemini-3.5-flash-lite` and `gemini-3.1-pro-preview`. Legacy models (`gemini-1.5-*`, `gemini-2.0-*`) are strictly excluded.

**Rationale**:
- `@google/genai` is Google's current unified SDK supporting modern interaction and function calling APIs.
- `gemini-3.8-flash` offers fast, balanced performance for agentic tool execution with a 1M token window.

---

### 1.26 Zero-Leak Credential Architecture via Electron safeStorage (Phase 5)

**Decision**: User-provided Gemini API keys are encrypted in the Electron main process using `safeStorage` (Windows DPAPI) and stored in `credentials.enc`. The plaintext key is never exposed to the renderer, React state, logs, or SQLite.

**Rationale**:
- Maximum security: even if the renderer process is compromised, the raw API key cannot be exfiltrated.
- The UI only ever displays masked representations (`••••••••••••abcd`).

---

### 1.27 Safe Tool Calling Pipeline & Strict Zod Allowlisting (Phase 5)

**Decision**: The model cannot execute code directly. Tool calls from Gemini must pass through an allowlist registry, undergo strict Zod schema validation, and execute in the main process against existing Reminder, Timer, and System services.

**Rationale**:
- Prevents prompt injection or arbitrary system access (e.g. no shell execution, no arbitrary file access).
- Reuses existing tested business logic directly without creating duplicate engines.

---

### 1.28 Provider Abstraction & Offline Degradation (Phase 5)

**Decision**: Implement `AIProvider` interface with `GeminiProvider` and `DisabledProvider`.

**Rationale**:
- Extensible architecture: local Ollama or future providers can be added without altering the UI or consumers.
- When AI is unconfigured or disabled, `DisabledProvider` provides helpful guidance directing users to local Reminders/Timers without breaking the application.

---

### 1.29 Local Conversation Persistence in SQLite (Phase 5)

**Decision**: Persist conversation history in `ai_conversations` and `ai_messages` SQLite tables.

**Rationale**:
- Maintains multi-turn context across sessions locally.
- Allows users to clear conversation history anytime with one click.

---

## 2. Contradictions Identified & Resolved

| # | Contradiction | Resolution |
|---|---------------|------------|
| 1 | "10+ character packs" vs "MVP scope" | MVP: 2 built-in characters; architecture supports 10+; import system for community packs |
| 2 | "AI optional" vs "Natural language reminders" | Core reminder engine works without AI; AI only parses NL → tool calls |
| 3 | "Local-first" vs "Gmail/Outlook integration" | Email = online-only feature, clearly separated, optional, read-only |
| 4 | "Simple architecture" vs "Plugin system for characters" | No plugin system; characters = manifest + assets (data-driven, not code) |
| 5 | "Secure credentials" vs "Ollama local (no auth)" | Ollama config (URL) in settings/safeStorage for consistency; no auth needed |
| 6 | "Pet lightweight" vs "React in pet window" | Pet uses minimal React (no Router, no heavy libs); Canvas for animation |
| 7 | "Zod validation everywhere" vs "Performance" | Validation only at IPC boundaries; internal code uses inferred types |
| 8 | "Windows notifications" vs "Pet speech bubbles" | Both: Toast for system-level, bubble for in-context; user configures |

---

## 3. Technically Risky Assumptions

| Assumption | Risk | Validation Plan |
|------------|------|-----------------|
| `better-sqlite3` builds reliably on Windows ARM64 | Medium | Test on ARM64 CI runner |
| Electron transparent window + alwaysOnTop + clickThrough works consistently | High | Test on Win10/11, multiple monitors, DPI scaling |
| `setTimeout` precision sufficient for reminders (±5s) | Low | Automated test: schedule 100 reminders, measure drift |
| Ollama detection via `localhost:11434` works | Medium | Test: not installed, installed not running, running |
| Character sprite animation 60fps on integrated graphics | Medium | Profile on Intel UHD 620, AMD Vega 8 |
| Windows toast action buttons (Snooze/Done) work reliably | Medium | Test across Windows versions, focus states |
| `safeStorage` encryption works reliably in packaged app | Medium | Test install/uninstall/reinstall cycle with encrypted secrets |
| `powerMonitor` suspend/resume events fire reliably | Medium | Test laptop sleep, hibernate, modern standby |

---

## 4. Unnecessarily Complex Areas (Deferred)

| Area | Why Deferred | Simpler Alternative |
|------|--------------|---------------------|
| Plugin system for characters | YAGNI — manifest + assets is data-driven | Folder-based, no code loading |
| Full cron engine | Complex; most users need intervals | ISO duration + basic cron (quartz) |
| Streaming AI responses | Adds complexity to tool pipeline | Blocking response first; stream later |
| Background sync service | Requires backend, auth, conflict resolution | Local-first only; export/import JSON |
| Pet physics (gravity, collisions) | Over-engineered for desktop pet | Simple walk-to-target, edge bounce |
| Multi-language i18n framework | Premature; English MVP | String constants, add i18n later |
| Custom theme builder | Design tokens cover 90% | CSS variables for user themes later |
| Reminder templates/presets | UI feature, not architecture | Hardcoded presets in UI |

---

## 5. Decisions to Postpone

| Decision | When to Decide |
|----------|----------------|
| Character pack distribution format (ZIP vs folder vs custom) | After import UX tested |
| Animation engine: Canvas 2D vs PixiJS vs CSS sprites | After prototype with 2 characters |
| Database encryption (SQLCipher) | If threat model requires |
| Auto-update channel (stable/beta/nightly) | After first release |
| Telemetry/analytics (opt-in) | Post-MVP, with privacy review |
| Pet "personality" learning (adaptive behavior) | After mood system validated |
| Cloud sync architecture | If user demand > threshold |
| Mobile companion app | Separate product decision |

---

## 6. Security Decisions

| Area | Decision |
|------|----------|
| IPC validation | All inputs validated with Zod in main process |
| AI tool allowlist | Hardcoded allowlist; no dynamic registration |
| File system access | Future: user-approved folders only, virtual paths |
| Credential storage | `safeStorage` (Electron OS-backed encryption); never plaintext |
| Auto-updates | Signed releases, HTTPS, SHA256 verification |
| Content Security Policy | `script-src 'self'`; no `eval`, no inline scripts |
| External links | `shell.openExternal` with user confirmation |

---

## 7. Performance Budgets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Pet window cold start | < 1.5s | `performance.now()` in renderer |
| Pet window idle memory | < 50 MB | Task Manager / `process.memoryUsage()` |
| Pet animation FPS | 60 fps | DevTools Performance tab |
| Dashboard open time | < 500ms | First paint after IPC ready |
| Reminder trigger latency | < 5s after due | Watchdog logs |
| SQLite query (reminders list) | < 10ms | `EXPLAIN QUERY PLAN` |
| Installer size | < 150 MB | `dist/` output |
| Build time (CI) | < 5 min | GitHub Actions |

---

## 8. Open Questions (Requiring User Input)

1. **Character Art**: Who creates/provides the 2 MVP character asset sets? (Need before Phase 1 Day 3)
2. **Notification Sounds**: Include default sounds? License? (Need for Phase 4)
3. **Ollama Install Guide**: Bundle installer? Link to website? Detect and offer install?
4. **Telemetry**: Any crash/error reporting? (Sentry? Custom? None?)
5. **Code Signing**: EV certificate available? (Required for SmartScreen)
6. **Distribution**: GitHub Releases only? Microsoft Store? Winget? Scoop?
7. **Minimum Windows Version**: Win10 1809? Win11 only? (Affects APIs available)

---

## 9. Anti-Patterns Explicitly Avoided

| Anti-Pattern | Avoided By |
|--------------|------------|
| God main process | Service modules, single responsibility |
| IPC as RPC (chatty) | Batch APIs, event-based updates |
| Business logic in renderer | All data/services in main |
| Global mutable state | Zustand scoped stores, Immer |
| Untyped IPC | Shared TypeScript types, Zod validation |
| Premature abstraction | Concrete implementation first, abstract when 3+ use cases |
| Blocking main thread | Async/await, `better-sqlite3` is sync but fast; heavy work in workers if needed |
| Memory leaks | Explicit cleanup, `WeakRef` for caches, IPC listener removal |

---

## 10. Decision Review Cadence

- **Weekly during implementation**: Quick sync on new decisions
- **Phase gates**: Formal review at end of each phase
- **Post-MVP**: Quarterly architecture review